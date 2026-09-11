# -*- coding: utf-8 -*-
"""i18n audit: every data-i18n key used in docs/ must exist in every language
table, every game in games.py must have title/tag/controls translations, and
every page must load i18n.js. Exit 1 on any gap. Run after engine/build.py."""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DOCS = os.path.join(ROOT, "docs")
LANGS = ["zh", "es", "pt", "ru", "ja", "ko", "de", "fr", "id"]

import json
with open(os.path.join(HERE, "_i18n_tables.json"), encoding="utf-8") as f:
    tables = json.load(f)
chrome = {l: dict(tables["chrome"][l]) for l in tables["chrome"]}
games = {l: {("game.%s.%s" % (g[0], f)): v for g in tables["games"][l]
             for f, v in (("title", g[1]), ("tag", g[2]), ("controls", g[3]))}
         for l in tables["games"]}

fail = 0


def err(msg):
    global fail
    fail += 1
    print("FAIL:", msg)


# 1. per-language key parity inside tables themselves
base_keys = set(k for k, _ in tables["chrome"]["zh"])
for l in LANGS:
    keys = set(k for k, _ in tables["chrome"][l])
    if keys != base_keys:
        err("table parity %s: missing %s extra %s" % (l, base_keys - keys, keys - base_keys))
    for k, v in tables["chrome"][l]:
        if not v.strip():
            err("empty value %s.%s" % (l, k))
game_keys = set("game.%s.%s" % (g[0], f) for g in tables["games"]["zh"]
                for f in ("title", "tag", "controls"))
for l in LANGS:
    keys = set("game.%s.%s" % (g[0], f) for g in tables["games"][l]
               for f in ("title", "tag", "controls"))
    if keys != game_keys:
        err("game table parity %s" % l)

try:
    with open(os.path.join(HERE, "_i18n_prose.json"), encoding="utf-8") as f:
        PROSE = json.load(f)
    for slug, langs in PROSE.items():
        for l, kv in langs.items():
            for k, v in kv.items():
                games.setdefault(l, {})["game.%s.%s" % (slug, k)] = v
                game_keys.add("game.%s.%s" % (slug, k))
except FileNotFoundError:
    pass

for slug, langs in PROSE.items():
    for l in LANGS:
        keys = set(langs.get(l, {}).keys())
        need = {"h1", "h2", "h3", "q1", "q2", "q3", "q4", "a1", "a2", "a3", "a4"}
        if not need.issubset(keys):
            err("prose %s/%s incomplete: %s" % (slug, l, sorted(need - keys)))

# 2. every game shipped in games.py must be fully translated
sys.path.insert(0, HERE)
import games as games_mod  # noqa: E402
for gm in games_mod.GAMES:
    for f in ("title", "tag", "controls"):
        k = "game.%s.%s" % (gm["slug"], f)
        if k not in game_keys:
            err("game %s lacks '%s' translations (add to _i18n_tables.json)" % (gm["slug"], f))

# 3. scan built pages: i18n.js loaded + every referenced key resolves
key_attrs = re.compile(r'data-i18n(?:-html|-placeholder|-aria|-title)?="([^"]+)"')
js_lit = re.compile(r"\b(?:npT|TL)\('([a-z0-9.\-]+)'\)")
used = {}
pages = 0
for dirpath, _dirs, files in os.walk(DOCS):
    for fn in files:
        if fn not in ("index.html", "404.html"):
            continue
        p = os.path.join(dirpath, fn)
        rel = os.path.relpath(p, DOCS).replace("\\", "/")
        if "/play/" in rel.replace("\\", "/"):
            continue
        html_txt = open(p, encoding="utf-8").read()
        pages += 1
        if "i18n.js" not in html_txt:
            err("%s: i18n.js not loaded" % rel)
        for m in key_attrs.finditer(html_txt):
            used.setdefault(m.group(1), set()).add(rel)
        for m in js_lit.finditer(html_txt):
            used.setdefault(m.group(1), set()).add(rel)
for k in sorted(used):
    if k in chrome["zh"] or k in game_keys:
        continue
    # dynamic families: cat.* and game.*.<field>
    if k.startswith("cat.") or re.match(r"game\.[a-z0-9\-]+\.(title|tag|controls)$", k):
        continue
    err("key '%s' used in %d page(s), e.g. %s — not in tables" % (k, len(used[k]), sorted(used[k])[0]))
# spot: category keys for every category seen
cats = set()
for k in used:
    if k.startswith("cat."):
        cats.add(k.split(".")[1])
for c in sorted(cats):
    for suffix in ("", ".blurb"):
        if ("cat." + c + suffix) not in base_keys:
            err("category '%s' missing translation key 'cat.%s%s'" % (c, c, suffix))

print("i18n audit: %d pages scanned, %d distinct keys, %d langs" % (pages, len(used), len(LANGS)))
sys.exit(1 if fail else 0)
