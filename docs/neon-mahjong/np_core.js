/* NeonPlay shared game core — engine-template.md phase 1.
 * build.py copies this file next to every game's play page (np_core.js),
 * so each game stays fully self-contained (relative sibling reference only).
 *
 * npLang()      -> one of NP_LANGS (site-switcher np_lang key shared; ?lang= wins)
 * npT(L, key)   -> lookup in per-game dict L={en:{...},zh:{...},...}, en fallback
 * npBest(key)      -> stored int (0 default)
 * npBest(key,v) -> store int; all failures swallowed (private mode safe)
 */
(function () {
  var NP_LANGS = ["en", "zh", "es", "pt", "ru", "ja", "ko", "de", "fr", "id"];
  function npLang() {
    try {
      var q = new URLSearchParams(location.search).get("lang");
      if (q && NP_LANGS.indexOf(q) >= 0) return q;
      var v = localStorage.getItem("np_lang");
      if (v && NP_LANGS.indexOf(v) >= 0) return v;
    } catch (e) {}
    var nl = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    var p = String(nl).slice(0, 2).toLowerCase();
    return NP_LANGS.indexOf(p) >= 0 ? p : "en";
  }
  function npT(L, key) {
    var lang = npLang();
    var d = (L && (L[lang] || L.en)) || {};
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
  window.NP_LANGS = NP_LANGS;
  window.npLang = npLang;
  window.npT = npT;
  window.npBest = npBest;
})();
