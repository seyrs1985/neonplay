# -*- coding: utf-8 -*-
"""NeonPlay standalone games site builder.

Builds the whole site into docs/: game hall (/), per-game landing pages,
site pages (about/privacy/contact), 404, sitemap, robots, ads.txt.
Sister site (ToolTide tools) is linked from nav and footer.
"""

import datetime
import html
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import games as games_mod  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
ASSETS = os.path.join(ROOT, "engine", "assets")
TODAY = datetime.date.today()


def esc(s):
    return html.escape(str(s), quote=True)


def write(rel, content):
    full = os.path.join(DOCS, rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print(f"  {rel}")


def ad_slot(cfg, slot_id):
    client = (cfg.get("adsense_client") or "").strip()
    if not client:
        return ""
    return (f'<div class="ad"><ins class="adsbygoogle" style="display:block" '
            f'data-ad-client="{esc(client)}" data-ad-slot="{esc(slot_id)}" '
            f'data-ad-format="auto" data-full-width-responsive="true"></ins>'
            f"<script>(adsbygoogle=window.adsbygoogle||[]).push({{}});</script></div>")


def head(cfg, title, desc, canonical, csspath, extra_ld=()):
    i18npath = ("i18n.js" if csspath == "style.css" else
                csspath.replace("style.css", "i18n.js"))
    ga = (cfg.get("ga4_id") or "").strip()
    gsc = (cfg.get("gsc_verification") or "").strip()
    ads = (cfg.get("adsense_client") or "").strip()
    ld = json.dumps({"@context": "https://schema.org", "@graph": list(extra_ld)},
                    ensure_ascii=False, separators=(",", ":"))
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{esc(canonical)}">
<link rel="alternate" type="application/rss+xml" title="NeonPlay New Games" href="{esc(cfg['base_url'])}feed.xml">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#7c3aed">
{f'<meta name="google-site-verification" content="{esc(gsc)}">' if gsc else ''}
<script type="application/ld+json">{ld}</script>
<link rel="stylesheet" href="{csspath}">
<script src="{i18npath}"></script>
{f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={esc(ads)}" crossorigin="anonymous"></script>' if ads else ''}
{f'<script async src="https://www.googletagmanager.com/gtag/js?id={esc(ga)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag("js",new Date());gtag("config","{esc(ga)}");</script>' if ga else ''}
</head>
<body>"""


def nav(cfg):
    base = cfg["base_url"]
    sister = (cfg.get("sister_site") or {}).get("url", "#")
    return f"""<header class="site-head"><div class="wrap nav-row">
<a class="logo" href="{base}">🎮 NeonPlay</a>
<nav><a href="{esc(sister)}" title="Sister site: free online tools" data-i18n="nav.tools">🧰 ToolTide tools</a></nav>
</div></header>"""


def footer(cfg):
    base = cfg["base_url"]
    sister = (cfg.get("sister_site") or {})
    year = TODAY.year
    return f"""<footer class="site-foot"><div class="wrap">
<nav><a href="{base}about/" data-i18n="foot.about">About</a><a href="{base}privacy/" data-i18n="foot.privacy">Privacy</a><a href="{base}contact/" data-i18n="foot.contact">Contact</a><a href="{base}feed.xml" title="New games RSS feed" data-i18n="foot.rss">RSS</a><a href="{esc(sister.get('url', '#'))}" data-i18n="foot.tools">🧰 Free online tools on ToolTide</a></nav>
<p data-i18n="foot.tag">© {year} NeonPlay · Free games that run in your browser. Sister site: {esc(sister.get('name', ''))} — {esc(sister.get('note', ''))}.</p>
</div></footer>"""


def card(gm, base):
    return (f'<a class="card" href="{base}{gm["slug"]}/">'
            f'<span class="card-emoji">{gm["emoji"]}</span>'
            f'<span class="card-title" data-i18n="game.{gm["slug"]}.title">{esc(gm["h1"])}</span>'
            f'<span class="card-desc" data-i18n="game.{gm["slug"]}.tag">{esc(gm["tagline"][:110])}</span></a>')


STATIC_PAGES = {
    "about/index.html": ("About — NeonPlay",
                         "About NeonPlay: free original browser games, built to load instantly and respect your privacy.",
                         """<h1 data-i18n="about.h1">About NeonPlay</h1>
<p data-i18n="about.p1">NeonPlay is a small collection of free browser games — arcade, puzzle and classics. Every game here is either built by us or properly licensed: no scraped clones, no sketchy redirects, no forced sign-ups.</p>
<p data-i18n="about.p2">Games run 100% locally in your browser. Scores never leave your device, and we do not track your gameplay.</p>
<p><span data-i18n="about.p3a">Need a five-minute break at your desk? Our sister site</span> <a href="{sister}">ToolTide</a><span data-i18n="about.p3b"> offers free online tools — calculators, converters and countdowns that run just as fast.</span></p>"""),
    "privacy/index.html": ("Privacy Policy — NeonPlay",
                           "NeonPlay privacy policy: games run locally in your browser; no accounts, no gameplay tracking.",
                           """<h1 data-i18n="priv.h1">Privacy Policy</h1>
<p><em data-i18n="priv.upd">Last updated:</em> {today}</p>
<p data-i18n="priv.p1">NeonPlay games run entirely in your browser. We do not require accounts, we do not store your scores on our servers, and nothing you do inside a game is uploaded.</p>
<p data-i18n="priv.p2">If analytics or advertising scripts are enabled, they may collect anonymised usage data as described here. You can block them with any ad blocker without breaking the games.</p>
<p><span data-i18n="priv.p3a">Questions? Use the</span> <a href="{base}contact/"><span data-i18n="priv.contact_link">contact page</span></a><span data-i18n="priv.p3b">.</span></p>"""),
    "contact/index.html": ("Contact — NeonPlay",
                           "Contact the NeonPlay team: bug reports, game ideas and business questions.",
                           """<h1 data-i18n="cont.h1">Contact</h1>
<p><span data-i18n="cont.p1a">Bug reports, game ideas, business questions — write to</span> <a href="mailto:{email}">{email}</a><span data-i18n="cont.p1b"> and we will get back to you.</span></p>
<p><span data-i18n="cont.p2a">Looking for free online tools instead? Visit our sister site</span> <a href="{sister}">ToolTide</a><span data-i18n="cont.p2b">.</span></p>"""),
}


def build_static(cfg, rel, title, desc, body):
    base = cfg["base_url"]
    sister = (cfg.get("sister_site") or {}).get("url", "#")
    body = (body.replace("{sister}", esc(sister))
                .replace("{email}", esc(cfg.get("contact_email", "")))
                .replace("{today}", TODAY.isoformat())
                .replace("{base}", esc(base)))
    depth = 0 if "/" not in rel.rstrip("/index.html") else "../"
    css = "style.css" if rel == "404.html" else "../style.css"
    doc = head(cfg, title, desc, base + rel.replace("index.html", ""), css,
               [{"@type": "WebPage", "name": title, "url": base + rel.replace("index.html", "")}])
    doc += nav(cfg)
    doc += f'<main class="wrap"><article style="max-width:760px">{body}</article></main>'
    doc += footer(cfg) + "</body></html>"
    write(rel, doc)


def build_hall(cfg, gms):
    base = cfg["base_url"]
    desc = ("Play free browser games on NeonPlay: original arcade, puzzle and classic games. "
            "No download, no sign-up — instant play on desktop and mobile.")
    # hall categories: slug -> section (20 games; keep in sync with games.py)
    CATS = [
        ("arcade", "🎮 Arcade & Action", "🎮 街机动作",
         ["neon-tide", "snake", "flappy-dash", "breakout", "brickstorm", "neon-pop", "reflex-rush", "neon-hoops", "neon-air-hockey", "neon-beats", "bubble-storm"]),
        ("puzzle", "🧩 Puzzle & Brain", "🧩 益智解谜",
         ["2048", "minesweeper", "memory-pairs", "neon-block-jam", "neon-block-blast", "neon-nonogram", "neon-solitaire", "neon-fairway", "neon-link", "tile-rush", "neon-pyramid", "neon-mahjong", "neon-doodle"]),
        ("logic", "🐝 Word & Logic", "🐝 词与逻辑",
         ["word-hive", "neon-alchemy", "tic-tac-toe", "connect-four", "neon-checkers"]),
        ("idle", "💫 Idle & Chill", "💫 放置挂机",
         ["idle-neon-breaker"]),
    ]
    by_slug = {gm["slug"]: gm for gm in gms}
    sections = ""
    for cid, en, zh, slugs in CATS:
        cat_cards = "".join(card(by_slug[sl], base) for sl in slugs if sl in by_slug)
        sections += (f'<section class="cat"><h2 class="cat-title" data-en="{esc(en)}" '
                     f'data-zh="{esc(zh)}">{esc(en)}</h2><div class="grid">{cat_cards}</div></section>')
    cards = sections
    doc = head(cfg, "NeonPlay — Play Free Online Games (Arcade, Puzzle & Classics)",
               desc, base, "style.css", [{
                   "@type": "WebSite", "name": "NeonPlay", "url": base, "description": desc}])
    doc += nav(cfg)
    doc += f"""<main class="wrap">
<section class="hero"><h1 data-i18n="hall.title">Free games, zero friction</h1>
<p data-i18n="hall.sub">Original games that load instantly and run in your browser — no downloads, no accounts, no interruptions. Built with care, played with joy.</p></section>
{ad_slot(cfg, cfg.get('ad_slot_top', '1111111111'))}
<div id="spotlight"></div>
{cards}
<section class="cat" id="about"><h2 data-i18n="hall.originals">Our games are originals</h2>
<p class="cat-blurb" data-i18n="hall.originals.blurb">Every game here is either built by us or properly licensed — no scraped clones, no sketchy redirects. They run 100% locally in your browser; nothing you do in a game is tracked or uploaded.</p>
<p class="cat-blurb"><span data-i18n="hall.tools_promo.a">Need a tool instead? Our sister site</span> <a href="{esc((cfg.get('sister_site') or {}).get('url', '#'))}">ToolTide</a><span data-i18n="hall.tools_promo.b"> has free online calculators, converters and countdowns.</span></p></section>
</main>"""
    games_json = json.dumps([{"slug":gm["slug"],"emoji":gm["emoji"],"title":gm["h1"],"tag":gm["tagline"][:80]} for gm in gms], ensure_ascii=False)
    doc += """<script>
(function(){
  var GAMES=""" + games_json + """;
  var base=""" + json.dumps(cfg["base_url"]) + """;
  var day=Math.floor(Date.now()/86400000);
  var idx=(day*2654435761)>>>0; idx=idx%GAMES.length;
  var today=GAMES[idx];
  var box=document.getElementById('spotlight');
  var now=new Date(); var todayStr=now.toISOString().slice(0,10);
  var streak=0; try{
    var st=JSON.parse(localStorage.getItem('np_streak')||'{}');
    if(st.last===todayStr) streak=st.n||1;
    else if(st.last===new Date(Date.now()-86400000).toISOString().slice(0,10)) streak=(st.n||0)+1;
    else streak=1;
    localStorage.setItem('np_streak',JSON.stringify({last:todayStr,n:streak}));
  }catch(e){streak=1;}
  var langV=(function(){try{return localStorage.getItem('np_lang');}catch(e){return null;}})()||navigator.language||'en';
  var zhMode=langV.indexOf('zh')===0;
  document.querySelectorAll('.cat-title').forEach(function(h){
    h.textContent=zhMode?h.dataset.zh:h.dataset.en;
  });
  var TL=window.npT||function(k){return null;};
  var lbl=TL('spot.today')||"⚡ TODAY'S GAME";
  var ply=TL('spot.play')||'▶ PLAY NOW';
  var tTitle=TL('game.'+today.slug+'.title')||today.title;
  var tTag=TL('game.'+today.slug+'.tag')||today.tag;
  var html='<section class="cat spotlight-cat" style="margin-top:0"><div class="spot-card">';
  html+='<div class="spot-label">'+lbl+(streak>1?' · 🔥'+streak:'')+'</div>';
  html+='<a href="'+base+today.slug+'/" class="spot-link" style="text-decoration:none">';
  html+='<span class="card-emoji" style="font-size:2.2rem">'+today.emoji+'</span>';
  html+='<span class="card-title" style="font-size:1.15rem">'+tTitle+'</span>';
  html+='<span class="card-desc">'+tTag+'</span>';
  html+='<span class="spot-play" style="display:inline-block;margin-top:6px;padding:6px 18px;border-radius:8px;';
  html+='background:linear-gradient(135deg,#22d3ee,#a78bfa);color:#0b1020;font-weight:700;font-size:.85rem">';
  html+=ply+'</span></a></div></section>';
  box.innerHTML=html;
})();
</script>"""
    doc += footer(cfg) + "</body></html>"
    write("index.html", doc)


def build_landing(cfg, gm, gms):
    base = cfg["base_url"]
    slug = gm["slug"]
    canonical = f"{base}{slug}/"
    webapp_ld = {"@type": "VideoGame", "name": gm["h1"], "url": canonical,
                 "description": gm["desc"], "genre": ["Arcade", "Casual"],
                 "gamePlatform": "Web browser", "applicationCategory": "Game",
                 "operatingSystem": "Any", "playMode": "SinglePlayer",
                 "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}
    faq_ld = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
        for q, a in gm["faqs"]]}
    # howto/faq prose gets data-i18n keys only for games whose translations
    # exist in _i18n_prose.json (generator bakes them into i18n.js)
    has_prose = slug in getattr(games_mod, "PROSE_SLUGS", set())
    howto_items = []
    for i, s_ in enumerate(gm["howto"], start=1):
        key = f' data-i18n="game.{slug}.h{i}"' if has_prose else ""
        howto_items.append(f"<li{key}>{esc(s_)}</li>")
    howto = "".join(howto_items)
    faq_items = []
    for i, (q, a) in enumerate(gm["faqs"], start=1):
        if has_prose:
            faq_items.append(f'<details class="faq"><summary data-i18n="game.{slug}.q{i}">{esc(q)}</summary>'
                             f'<p data-i18n="game.{slug}.a{i}">{esc(a)}</p></details>')
        else:
            faq_items.append(f'<details class="faq"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>')
    faqs = "".join(faq_items)
    related = "".join(card(x, base) for x in gms if x["slug"] != slug)
    variants_block = ""
    if gm.get("variants"):
        items = "".join(f'<li><a href="{base}{slug}/{x["kw_slug"]}/">{esc(x["title"])}</a></li>'
                        for x in gm["variants"])
        variants_block = (f'<section class="seo-block"><h2 data-i18n="land.variants" '
                          f'data-i18n-game="{esc(gm["h1"])}">More ways to play {esc(gm["h1"])}</h2>'
                          f'<ul>{items}</ul></section>')
    sister = (cfg.get("sister_site") or {}).get("url", "#")
    doc = head(cfg, gm["title"], gm["desc"], canonical, "../style.css",
               [webapp_ld, faq_ld])
    doc += nav(cfg)
    doc += f"""<main class="wrap">
<article>
<div class="game-frame">
  <iframe src="{gm.get('play', 'play.html')}" title="{esc(gm['h1'])} — playable" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe>
  <button id="fs-btn" type="button" title="Fullscreen" data-i18n-title="ui.fullscreen">⛶</button>
</div>
<div class="title-row"><span class="title-emoji">{gm['emoji']}</span><h1 data-i18n="game.{slug}.title">{esc(gm['h1'])}</h1><span class="controls-line">🎮 <span data-i18n="game.{slug}.controls">{esc(gm['controls'])}</span></span></div>
<p class="cat-blurb" data-i18n="game.{slug}.tag">{esc(gm['tagline'])}</p>
{ad_slot(cfg, cfg.get('ad_slot_mid', '2222222222'))}
<section class="seo-block"><h2 data-i18n="land.howto">How to play</h2><ol class="howto">{howto}</ol></section>
<section class="seo-block"><h2 data-i18n="land.faq">Frequently asked questions</h2>{faqs}</section>
{variants_block}<section class="seo-block"><h2 data-i18n="land.more">More games</h2><div class="grid">{related}</div></section>
<section class="seo-block"><h2 data-i18n="land.tools">Free tools for work time</h2>
<p><span data-i18n="land.tools.blurb.a">Between gaming sessions, our sister site</span> <a href="{esc(sister)}">ToolTide</a><span data-i18n="land.tools.blurb.b"> runs free online tools — percentage calculators, unit converters and live countdowns. No sign-up there either.</span></p></section>
<nav class="crumbs"><a href="{base}">🎮 NeonPlay</a> › <span data-i18n="game.{slug}.title">{esc(gm['h1'])}</span></nav>
</article>
</main>"""
    doc += footer(cfg)
    doc += """<script>(function(){
var f=document.querySelector('.game-frame iframe'),b=document.getElementById('fs-btn');
if(b&&f){b.addEventListener('click',function(){
  if(document.fullscreenElement){document.exitFullscreen();}
  else if(f.requestFullscreen){f.requestFullscreen();}
});}
})();</script></body></html>"""
    write(f"{slug}/index.html", doc)


def build_variant(cfg, gm, v, gms):
    """Keyword-intent landing page (seo-longtail.md): same playable iframe,
    unique intro copy + FAQs, cross-links to the main landing and siblings."""
    base = cfg["base_url"]
    slug = gm["slug"]
    canonical = f"{base}{slug}/{v['kw_slug']}/"
    webapp_ld = {"@type": "VideoGame", "name": gm["h1"], "url": canonical,
                 "description": v["desc"], "genre": ["Arcade", "Casual"],
                 "gamePlatform": "Web browser", "applicationCategory": "Game",
                 "operatingSystem": "Any", "playMode": "SinglePlayer",
                 "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}
    faq_ld = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
        for q, a in v["faqs"]]}
    intro = "".join(f"<p>{esc(p)}</p>" for p in v["intro"])
    faqs = "".join(f'<details class="faq"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>'
                   for q, a in v["faqs"])
    related = "".join(card(x, base) for x in gms if x["slug"] != slug)
    siblings = "".join(
        f'<li><a href="{base}{slug}/{x["kw_slug"]}/">{esc(x["title"])}</a></li>'
        for x in gm.get("variants", []) if x["kw_slug"] != v["kw_slug"])
    doc = head(cfg, v["title"], v["desc"], canonical, "../../style.css",
               [webapp_ld, faq_ld])
    doc += nav(cfg)
    doc += f"""<main class="wrap">
<article>
<div class="game-frame">
  <iframe src="../{gm.get('play', 'play.html')}" title="{esc(gm['h1'])} — playable" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe>
  <button id="fs-btn" type="button" title="Fullscreen" data-i18n-title="ui.fullscreen">⛶</button>
</div>
<div class="title-row"><span class="title-emoji">{gm['emoji']}</span><h1 data-i18n="game.{slug}.title">{esc(gm['h1'])}</h1><span class="controls-line">🎮 <span data-i18n="game.{slug}.controls">{esc(gm['controls'])}</span></span></div>
<section class="seo-block">{intro}</section>
{ad_slot(cfg, cfg.get('ad_slot_mid', '2222222222'))}
<section class="seo-block"><h2 data-i18n="land.faq">Frequently asked questions</h2>{faqs}</section>
<section class="seo-block"><h2 data-i18n="land.variants" data-i18n-game="{esc(gm['h1'])}">More ways to play {esc(gm['h1'])}</h2>
<ul><li><a href="{base}{slug}/"><span data-i18n="game.{slug}.title">{esc(gm['h1'])}</span> — the main game page</a></li>{siblings}</ul></section>
<section class="seo-block"><h2 data-i18n="land.more">More games</h2><div class="grid">{related}</div></section>
<nav class="crumbs"><a href="{base}">🎮 NeonPlay</a> › <a href="{base}{slug}/"><span data-i18n="game.{slug}.title">{esc(gm['h1'])}</span></a> › <span>{esc(v['title'])}</span></nav>
</article>
</main>"""
    doc += footer(cfg)
    doc += """<script>(function(){
var f=document.querySelector('.game-frame iframe'),b=document.getElementById('fs-btn');
if(b&&f){b.addEventListener('click',function(){
  if(document.fullscreenElement){document.exitFullscreen();}
  else if(f.requestFullscreen){f.requestFullscreen();}
});}
})();</script></body></html>"""
    write(f"{slug}/{v['kw_slug']}/index.html", doc)


def copy_play(gm):
    dst = os.path.join(DOCS, gm["slug"])
    os.makedirs(dst, exist_ok=True)
    play = gm.get("play", "play.html")
    src = os.path.join(ASSETS, "games", gm["slug"], play.rstrip("/"))
    if play.endswith("/"):
        target = os.path.join(dst, "play")
        if os.path.exists(target):
            shutil.rmtree(target)
        shutil.copytree(src, target)
    else:
        shutil.copy2(src, os.path.join(dst, os.path.basename(play)))
    # shared game core copied per game -> pages stay self-contained (relative ref)
    shared = os.path.join(ASSETS, "games", "_shared", "np_core.js")
    if os.path.exists(shared):
        shutil.copy2(shared, os.path.join(dst, "np_core.js"))
        if play.endswith("/"):
            shutil.copy2(shared, os.path.join(dst, "play", "np_core.js"))


def main():
    with open(os.path.join(ROOT, "config", "site.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    base = cfg["base_url"]
    gms = games_mod.GAMES

    os.makedirs(DOCS, exist_ok=True)
    shutil.copy2(os.path.join(ASSETS, "style.css"), os.path.join(DOCS, "style.css"))
    shutil.copy2(os.path.join(ASSETS, "i18n.js"), os.path.join(DOCS, "i18n.js"))
    print("  style.css")

    for gm in gms:
        copy_play(gm)
        print(f"  {gm['slug']}/play (asset)")

    build_hall(cfg, gms)
    for gm in gms:
        build_landing(cfg, gm, gms)
        for v in gm.get("variants", []):
            build_variant(cfg, gm, v, gms)

    for rel, (title, desc, body) in STATIC_PAGES.items():
        build_static(cfg, rel, title, desc, body)

    write("404.html",
          head(cfg, "Page not found — NeonPlay", "Page not found on NeonPlay.",
               base + "404.html", "style.css")
          + nav(cfg)
          + '<main class="wrap"><article style="max-width:640px"><h1 data-i18n="e404.h1">404 — page not found</h1>'
            f'<p><span data-i18n="e404.a">That page does not exist. Head back to the</span> <a href="{esc(base)}"><span data-i18n="e404.link">game hall</span></a><span data-i18n="e404.b">.</span></p></article></main>'
          + footer(cfg) + "</body></html>")

    ads = (cfg.get("adsense_client") or "").strip()
    if ads:
        pub = ads[3:] if ads.startswith("ca-") else ads
        write("ads.txt", f"google.com, {pub}, DIRECT, f08c47fec0942fa0\n")

    urls = [base] + [base + gm["slug"] + "/" for gm in gms] + \
           [base + s for s in ("about/", "privacy/", "contact/")] + \
           [base + gm["slug"] + "/" + v["kw_slug"] + "/"
            for gm in gms for v in gm.get("variants", [])]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append(f"  <url><loc>{esc(u)}</loc><lastmod>{TODAY.isoformat()}</lastmod>"
                  f"<changefreq>weekly</changefreq><priority>{'1.0' if u == base else '0.8'}</priority></url>")
    sm.append("</urlset>")
    write("sitemap.xml", "\n".join(sm) + "\n")
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {base}sitemap.xml\n")

    # RSS 2.0 feed
    from email.utils import format_datetime
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    pub_date = format_datetime(now_dt)
    feed = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<rss version="2.0"><channel>',
            '<title>NeonPlay — Free Online Games</title>',
            '<link>' + base + '</link>',
            '<description>Free browser games: arcade, puzzle and classics.</description>',
            '<language>en</language>']
    for gm in gms:
        feed.append('<item><title>' + gm['h1'] + ' — ' + gm['tagline'][:60] + '</title>'
                    '<link>' + base + gm['slug'] + '/</link>'
                    '<description>' + gm['desc'][:200] + '</description>'
                    '<pubDate>' + pub_date + '</pubDate>'
                    '<guid>' + base + gm['slug'] + '/</guid></item>')
    feed.append('</channel></rss>')
    write("feed.xml", chr(10).join(feed))
    print("  feed.xml (" + str(len(gms)) + " games)")

    print(f"NeonPlay built: {len(gms)} games + 3 site pages → docs/  ({base})")


if __name__ == "__main__":
    main()
