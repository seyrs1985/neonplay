# -*- coding: utf-8 -*-
"""Submit all site URLs to IndexNow (Bing + Yandex + Seznam instant indexing).

No account needed — the key file site/<key>.txt proves ownership.
Run after every deploy. Uses https_proxy env var if set.
"""
import json
import os
import urllib.request
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "docs")


def main():
    with open(os.path.join(ROOT, "config", "site.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    base, key = cfg["base_url"], cfg["indexnow_key"]
    host = urlparse(base).netloc

    urls = [base]
    for dirpath, dirnames, filenames in os.walk(SITE):
        for fn in filenames:
            if fn == "index.html":
                rel = os.path.relpath(dirpath, SITE).replace("\\", "/")
                urls.append(base + (rel + "/" if rel != "." else ""))
    urls = sorted(set(urls))

    payload = {
        "host": host,
        "key": key,
        # IndexNow requires the key file at the HOST ROOT, not in /tooltide/ —
        # we serve it from the seyrs1985.github.io user-site repo.
        "keyLocation": f"https://{host}/{key}.txt",
        "urlList": urls,
    }
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"IndexNow: submitted {len(urls)} URLs → HTTP {resp.status}")
    except Exception as e:  # noqa: BLE001 — report and continue, non-fatal
        print(f"IndexNow: submit failed ({e}) — will retry next deploy")


if __name__ == "__main__":
    main()
