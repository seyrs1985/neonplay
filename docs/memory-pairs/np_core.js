/* NeonPlay shared game core — engine-template.md phase 1.
 * build.py copies this file next to every game's play page (np_core.js),
 * so each game stays fully self-contained (relative sibling reference only).
 *
 * npLang()      -> "zh" | "en"  (np_lang key shared with the site switcher)
 * npT(L, key)   -> lookup in per-game dict L={zh:{...},en:{...}}, en fallback
 * npBest(key)      -> stored int (0 default)
 * npBest(key,v) -> store int; all failures swallowed (private mode safe)
 */
(function () {
  function npLang() {
    try {
      var v = localStorage.getItem("np_lang") || navigator.language || "en";
      return v.slice(0, 2) === "zh" ? "zh" : "en";
    } catch (e) { return "en"; }
  }
  function npT(L, key) {
    var d = (L && (L[npLang()] || L.en)) || {};
    return d[key] || key;
  }
  function npBest(key, val) {
    try {
      if (typeof val === "undefined") {
        return parseInt(localStorage.getItem(key) || "0", 10) || 0;
      }
      localStorage.setItem(key, String(val));
    } catch (e) {}
    return val;
  }
  window.npLang = npLang;
  window.npT = npT;
  window.npBest = npBest;
})();
