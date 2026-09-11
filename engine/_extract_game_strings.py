# -*- coding: utf-8 -*-
"""Extract user-visible strings from game assets for i18n authoring."""
import os
import re
import json
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
GAMES = os.path.join(BASE, "assets", "games")

slug = sys.argv[1]
gdir = os.path.join(GAMES, slug)
out = {}
for dirpath, _d, files in os.walk(gdir):
    for fn in files:
        if not fn.endswith((".html", ".js")):
            continue
        p = os.path.join(dirpath, fn)
        rel = os.path.relpath(p, gdir).replace("\\", "/")
        src = open(p, encoding="utf-8", errors="replace").read()
        strs = []
        # HTML text nodes
        strs += re.findall(r">([^<>{}]*[A-Za-z][^<>{}]{1,60})<", src)
        # JS string literals near DOM/canvas writes
        for pat in (r"textContent\s*=\s*['\"`]([^'\"`]{2,70})",
                    r"innerHTML[^;\n]{0,40}['\"`]([^'\"`<>]{3,70})",
                    r"fillText\(\s*['\"`]([^'\"`]{1,60})",
                    r"title=\"([^\"]{2,60})\"", r"aria-label=\"([^\"]{2,60})\"",
                    r"placeholder=\"([^\"]{2,60})\"",
                    r"['\"`]([A-Z][a-z]+(?: [A-Za-z]+){0,4})['\"`]",
                    r"['\"`]([a-z]+ [a-z]+(?: [a-z]+){0,4})['\"`]"):
            strs += re.findall(pat, src)
        seen = []
        for s in strs:
            s = s.strip()
            if not s or len(s) < 2:
                continue
            if re.fullmatch(r"[0-9rgba#x%().,\s\-]+", s):
                continue
            if s.count("\\") or "function" in s or "var " in s or "=" in s and " " not in s:
                continue
            if s not in seen:
                seen.append(s)
        if seen:
            out[rel] = seen
print(json.dumps(out, ensure_ascii=False, indent=1))
