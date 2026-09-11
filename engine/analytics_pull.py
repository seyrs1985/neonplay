# -*- coding: utf-8 -*-
"""Pull GA4 + Google Search Console data into the NeonPlay analysis loop.

Needs a Google service-account JSON key that has Viewer access to the GA4
property and (restricted) access to the GSC property. The key must live
OUTSIDE this repo (deploy.sh runs `git add -A`, a key inside the repo would
be pushed to the public site repo). Default key path: <repo>/../ga_sa_key.json

Optional config file config/analytics.json:
  {"ga4_property_id": "123456789", "gsc_site_url": "https://seyrs1985.github.io/"}

Outputs (gitignored-worthy data files, committed by the weekly ops round):
  data/analytics_summary.md    human digest for the weekly report
  data/analytics_summary.json  machine digest

Auth: signed JWT (pyjwt + cryptography) exchanged for an access token;
plain REST for both APIs. HTTPS uses env proxy or http://127.0.0.1:7890.
"""

import argparse
import base64
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

import jwt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_KEY = os.path.join(os.path.dirname(ROOT), "ga_sa_key.json")
DEFAULT_PROXY = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY") or "http://127.0.0.1:7890"
SCOPES = ["https://www.googleapis.com/auth/analytics.readonly",
          "https://www.googleapis.com/auth/webmasters.readonly"]
NON_GAME_SLUGS = {"about", "contact", "privacy", "games", "docs"}
SLUG_RE = re.compile(r"/neonplay/([a-z0-9-]+)(?:/|$)")


def opener():
    return urllib.request.build_opener(urllib.request.ProxyHandler({"https": DEFAULT_PROXY, "http": DEFAULT_PROXY}))


def post(op, url, token=None, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with op.open(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:500]
        raise SystemExit("HTTP %s from %s\n%s" % (e.code, url.split("?")[0], body))


def access_token(sa):
    now = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
    claim = {
        "iss": sa["client_email"],
        "scope": " ".join(SCOPES),
        "aud": sa["token_uri"],
        "iat": now,
        "exp": now + 3600,
    }
    assertion = jwt.encode(claim, sa["private_key"], algorithm="RS256")
    if isinstance(assertion, bytes):
        assertion = assertion.decode()
    op = opener()
    resp = post(op, sa["token_uri"], payload={
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": assertion,
    })
    if "access_token" not in resp:
        raise SystemExit("token exchange failed: %s" % resp)
    return resp["access_token"]


def slug_of(path):
    m = SLUG_RE.search(path or "")
    if not m or m.group(1) in NON_GAME_SLUGS:
        return "site"
    return m.group(1)


def ga4_run(op, token, prop, days):
    end = datetime.date.today()
    start = end - datetime.timedelta(days=days - 1)
    url = "https://analyticsdata.googleapis.com/v1beta/properties/%s:runReport" % prop
    resp = post(op, url, token, {
        "dateRanges": [{"startDate": start.isoformat(), "endDate": end.isoformat()}],
        "dimensions": [{"name": "pagePath"}],
        "metrics": [{"name": "activeUsers"}, {"name": "screenPageViews"}, {"name": "sessions"},
                    {"name": "averageSessionDuration"}, {"name": "engagementRate"}],
        "limit": 10000,
    })
    per_game, site_total = {}, {"activeUsers": 0, "screenPageViews": 0, "sessions": 0,
                                "avgDuration": 0.0, "engagementRate": 0.0, "rows": 0}
    for row in resp.get("rows", []):
        v = row["metricValues"]
        g = slug_of(row["dimensionValues"][0]["value"])
        slot = per_game.setdefault(g, {"activeUsers": 0, "screenPageViews": 0, "sessions": 0,
                                       "durSum": 0.0, "engSum": 0.0, "rows": 0})
        slot["activeUsers"] += int(v[0]["value"])
        slot["screenPageViews"] += int(v[1]["value"])
        slot["sessions"] += int(v[2]["value"])
        slot["durSum"] += float(v[3]["value"])
        slot["engSum"] += float(v[4]["value"])
        slot["rows"] += 1
    out = {}
    for g, s in per_game.items():
        n = max(s["rows"], 1)
        out[g] = {"activeUsers": s["activeUsers"], "screenPageViews": s["screenPageViews"],
                  "sessions": s["sessions"],
                  "avgSessionDuration": round(s["durSum"] / n, 1),
                  "engagementRate": round(s["engSum"] / n, 3)}
    return out


def gsc_query(op, token, site, days, dimension, limit):
    end = datetime.date.today()
    start = end - datetime.timedelta(days=days - 1)
    url = "https://searchconsole.googleapis.com/webmasters/v3/sites/%s/searchAnalytics/query" % urllib.parse.quote(site, safe="")
    return post(op, url, token, {
        "startDate": start.isoformat(), "endDate": end.isoformat(),
        "dimensions": [dimension], "rowLimit": limit,
    })


def gsc_by_game(rows):
    per = {}
    for r in rows or []:
        g = slug_of(r["keys"][0])
        slot = per.setdefault(g, {"clicks": 0, "impressions": 0})
        slot["clicks"] += int(r["clicks"])
        slot["impressions"] += int(r["impressions"])
    for g, s in per.items():
        s["ctr"] = round(s["clicks"] / s["impressions"], 4) if s["impressions"] else 0
    return per


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", default=DEFAULT_KEY)
    ap.add_argument("--property", default=None)
    ap.add_argument("--site-url", default=None)
    args = ap.parse_args()

    cfg_path = os.path.join(ROOT, "config", "analytics.json")
    cfg = {}
    if os.path.exists(cfg_path):
        with open(cfg_path, encoding="utf-8") as f:
            cfg = json.load(f)
    prop = args.property or cfg.get("ga4_property_id")
    site = args.site_url or cfg.get("gsc_site_url", "https://seyrs1985.github.io/")

    if not os.path.exists(args.key):
        raise SystemExit("未找到服务账号密钥: %s\n（放到该路径，或用 --key 指定；密钥不能放进仓库，deploy 会 git add -A）" % args.key)
    if not prop:
        raise SystemExit("缺少 GA4 数字属性 ID：写入 config/analytics.json {\"ga4_property_id\": \"...\"} 或用 --property")

    with open(args.key, encoding="utf-8") as f:
        sa = json.load(f)
    token = access_token(sa)
    op = opener()
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    summary = {"generated": now, "ga4_property": prop, "gsc_site": site, "ga4": {}, "gsc": {}}
    lines = ["# Analytics 摘要（生成于 %s）" % now, ""]

    for days in (7, 28):
        g = ga4_run(op, token, prop, days)
        summary["ga4"]["%dd" % days] = g
    lines.append("## GA4 按游戏聚合")
    lines.append("| 窗口 | 游戏 | 活跃用户 | 页面浏览 | 会话 | 平均时长(s) | 参与率 |")
    lines.append("|---|---|---|---|---|---|---|")
    for days in ("7d", "28d"):
        for g, s in sorted(summary["ga4"][days].items(), key=lambda kv: -kv[1]["activeUsers"]):
            lines.append("| %s | %s | %s | %s | %s | %s | %s |" % (days, g, s["activeUsers"],
                         s["screenPageViews"], s["sessions"], s["avgSessionDuration"], s["engagementRate"]))
    lines.append("")

    gsc_error = None
    try:
        pages = gsc_query(op, token, site, 7, "page", 100)
        queries = gsc_query(op, token, site, 7, "query", 15)
        per_game = gsc_by_game(pages.get("rows"))
        summary["gsc"]["7d"] = {"per_game": per_game,
                                "top_queries": [{"query": r["keys"][0], "clicks": r["clicks"],
                                                 "impressions": r["impressions"], "position": r["position"]}
                                                for r in queries.get("rows", [])]}
    except SystemExit as e:
        gsc_error = str(e)
        summary["gsc"]["error"] = gsc_error
    if gsc_error:
        lines.append("## GSC：拉取失败（GA4 数据不受影响）")
        lines.append("```")
        lines.append(gsc_error[:400])
        lines.append("```")
    else:
        lines.append("## GSC 近7天 按游戏")
        lines.append("| 游戏 | 点击 | 曝光 | CTR |")
        lines.append("|---|---|---|---|")
        for g, s in sorted(per_game.items(), key=lambda kv: -kv[1]["clicks"]):
            lines.append("| %s | %s | %s | %.1f%% |" % (g, s["clicks"], s["impressions"], s["ctr"] * 100))
        lines.append("")
        lines.append("## GSC 近7天 Top 查询")
        lines.append("| 查询 | 点击 | 曝光 | 平均排名 |")
        lines.append("|---|---|---|---|")
        for q in summary["gsc"]["7d"]["top_queries"]:
            lines.append("| %s | %s | %s | %.1f |" % (q["query"], q["clicks"], q["impressions"], q["position"]))

    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "analytics_summary.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    with open(os.path.join(ROOT, "data", "analytics_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)
    print("OK -> data/analytics_summary.md / .json")
    print("\n".join(lines[:12]))


if __name__ == "__main__":
    sys.exit(main())
