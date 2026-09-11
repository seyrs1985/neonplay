#!/usr/bin/env node
/* NeonPlay QA playtester: real-browser audit for game pages.
 *
 * Launches headless Chromium (Chrome or Edge), loads the game's play page,
 * collects uncaught exceptions / console errors, pokes the game with generic
 * input (click / drag / keys), verifies the game actually responds (canvas
 * pixel change or DOM mutations), saves a screenshot, then optionally runs a
 * per-game scripted playtest from engine/qa_tests/<slug>.mjs.
 *
 * Usage:
 *   node engine/qa_playtest.mjs --slug <slug> [--url <full-url>] [--base <site>] [--keep]
 * Exit code 0 = PASS, 1 = FAIL. Last line of stdout: QA-VERDICT {json}
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
function argOf(name, def) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
const slug = argOf("--slug", null);
if (!slug && !args.includes("--url")) {
  console.error("need --slug <slug> or --url <full-url>");
  process.exit(1);
}
const BASE = argOf("--base", "https://seyrs1985.github.io/neonplay/");
const playPath = slug === "neon-tide" ? "play/" : "play.html";
const url = argOf("--url", null) || (BASE.replace(/\/$/, "/") + (BASE.endsWith("/") ? "" : "/") + slug + "/" + playPath);
const SHOT_DIR = join(ROOT, "data", "qa");
const BUDGET = parseInt(argOf("--budget", "25000"), 10);
const TOUCH = args.includes("--touch");

/* ---- locate a Chromium ---- */
import { existsSync } from "node:fs";
const CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const browserBin = CANDIDATES.find(existsSync);
if (!browserBin) {
  console.error("no Chrome/Edge found");
  process.exit(1);
}

/* ---- minimal CDP client ---- */
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener("message", ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.method + ": " + msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("cdp timeout: " + method));
        }
      }, BUDGET);
    });
  }
  on(fn) { this.listeners.push(fn); }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];        // uncaught exceptions
const consoleErrs = [];   // console.error (script errors only)
const netErrs = [];       // network-level resource failures (favicon etc, non-fatal)
const events = [];

async function main() {
  const userDataDir = mkdtempSync(join(tmpdir(), "qa-chrome-"));
  const port = 10000 + Math.floor(Math.random() * 20000);
  const chrome = spawn(browserBin, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--window-size=800,640", "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const devtoolsWs = await new Promise((resolve, reject) => {
    let buf = "";
    const t = setTimeout(() => reject(new Error("chrome devtools endpoint timeout")), 15000);
    chrome.stderr.on("data", d => {
      buf += d.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(t); resolve(m[1]); }
    });
    chrome.on("exit", c => { clearTimeout(t); reject(new Error("chrome exited early: " + c)); });
  });
  const httpBase = devtoolsWs.replace(/^ws:/, "http:").replace(/\/devtools\/browser\/.*$/, "");
  const tab = await (await fetch(httpBase + "/json/new?about:blank", { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = e => rej(new Error("ws error")); });
  const cdp = new CDP(ws);

  let loadFired = null;
  cdp.on(msg => {
    if (msg.method === "Page.loadEventFired") loadFired = Date.now();
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      errors.push(d.exception?.description || d.text || "unknown");
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error")
      consoleErrs.push(msg.params.args?.map(a => a.value ?? a.description ?? "").join(" "));
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error")
      netErrs.push(msg.params.entry.source + ":" + msg.params.entry.text);
    events.push(msg.method);
  });
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  // Headless rAF shim: new-headless may never fire requestAnimationFrame,
  // which freezes every canvas game loop and breaks responsiveness checks.
  // QA-only: drive rAF callbacks via a ~60fps setTimeout pump.
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: `
    (function () {
      if (window.__qaRafShim) return; window.__qaRafShim = true;
      window.requestAnimationFrame = function (cb) {
        return setTimeout(function () { cb(performance.now()); }, 16);
      };
      window.cancelAnimationFrame = function (id) { clearTimeout(id); };
    })();` });

  const evaluate = async expr => {
    const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("eval: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
  };

  await cdp.send("Page.navigate", { url });
  if (TOUCH) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 667, deviceScaleFactor: 2, mobile: true });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  }
  const t0 = Date.now();
  while (!loadFired && Date.now() - t0 < BUDGET) await sleep(100);
  if (!loadFired) throw new Error("page load timeout: " + url);
  await sleep(1800); // settle: late errors, first frames

  // surface + observers
  const surface = await evaluate(`(() => {
    window.__qaMut = 0;
    try { new MutationObserver(m => { window.__qaMut += m.length; })
      .observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
    return {
      canvases: document.querySelectorAll("canvas").length,
      interactives: document.querySelectorAll("button, .blk, [role=button]").length,
      bodyLen: document.body ? document.body.innerHTML.length : 0,
      title: document.title,
    };
  })()`);

  const canvasSig = () => evaluate(`(() => {
    try { const c = document.querySelector("canvas");
      return c ? String(c.toDataURL().length) + ":" + c.toDataURL().slice(-64) : "no-canvas"; }
    catch (e) { return "tainted"; }
  })()`);
  const mutCount = () => evaluate("window.__qaMut || 0").catch(() => -1);

  const sigBefore = await canvasSig();
  const mutBefore = await mutCount();

  /* generic interaction: element-targeted click/drag + some keys */
  const mouse = (type, x, y, extra = {}) => cdp.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, ...extra });
  const cx = TOUCH ? 187 : 400, cy = 300;
  if (TOUCH) {
    // real touch sequence aimed at an interactive element: touchStart → touchMoves → touchEnd
    await evaluate(`(() => {
      window.__pt = [];
      ["pointerdown","pointermove","pointerup","pointercancel","touchstart","touchmove","touchend","click"].forEach(t =>
        document.addEventListener(t, e => window.__pt.push(t + ":" + (e.pointerType || "touch")), { passive: true }));
    })()`);
    const tgt = await evaluate(`(() => {
      // priority: game surface (canvas/blocks) over HUD buttons — query separately, not by document order
      const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
      const sels = [".blk", "canvas", "[role=button]", "button"];
      for (const s of sels) {
        const e = [...document.querySelectorAll(s)].find(vis);
        if (e) { const r = e.getBoundingClientRect();
          const p = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
          window.__qaTouch = p; return p; }
      }
      return null;
    })()`);
    const tx = tgt ? Math.min(tgt.x, 370) : cx, ty = tgt ? Math.min(tgt.y, 660) : cy;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: tx, y: ty, id: 1 }] });
    for (let s = 1; s <= 6; s++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: tx + s * 20, y: ty, id: 1 }] });
      await sleep(60);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(300);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: tx, y: ty, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    // target the game surface, not fixed coords (selector priority = game elements over HUD)
    const tgt = await evaluate(`(() => {
      const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
      const sels = [".blk", "canvas", ".hole", ".cell", "[role=button]", "button"];
      for (const s of sels) {
        const e = [...document.querySelectorAll(s)].find(vis);
        if (e) { const r = e.getBoundingClientRect();
          const p = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
          window.__qaTouch = p; return p; }
      }
      return { x: cx, y: cy };
    })()`).catch(() => ({ x: cx, y: cy }));
    const tx = tgt.x || cx, ty = tgt.y || cy;
    await mouse("mousePressed", tx, ty);
    for (let s = 1; s <= 6; s++) await mouse("mouseMoved", tx + s * 20, ty);
    await mouse("mouseReleased", tx + 120, ty);
    await sleep(300);
    // clean tap at game surface (press+release same point = real click)
    await mouse("mousePressed", tx, ty);
    await mouse("mouseReleased", tx, ty);
  }
  const key = (k, code, vk) => cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: k, code, windowsVirtualKeyCode: vk })
    .then(() => cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }));
  for (const [k, c, v] of [["ArrowRight", "ArrowRight", 39], ["ArrowLeft", "ArrowLeft", 37], [" ", "Space", 32], ["Enter", "Enter", 13]]) {
    await key(k, c, v).catch(() => {});
    await sleep(120);
  }
  await sleep(800);

  const sigAfter = await canvasSig();
  const mutAfter = await mutCount();
  const pointerTrace = await evaluate("window.__pt || []").catch(() => []);
  const touchDiag = await evaluate(`(() => {
    const t = window.__qaTouch || {};
    const e = document.elementFromPoint(t.x || 0, t.y || 0);
    return {
      touchAt: t, hit: e ? (e.tagName + "." + e.className + " text=" + (e.textContent || "").slice(0, 8)) : "nothing",
      selIdx: (typeof selIdx !== "undefined") ? selIdx : "?",
      moves: (typeof moves !== "undefined") ? moves : "?",
    };
  })()`).catch(e => ({ err: e.message }));

  /* per-game scripted playtest (optional) */
  let scripted = null;
  const testPath = join(ROOT, "engine", "qa_tests", slug + ".mjs");
  if (slug && existsSync(testPath)) {
    const mod = await import(pathToFileURL(testPath).href + "?t=" + Date.now());
    if (mod.default) {
      const h = {
        evaluate, sleep,
        drag: async (sel, dxPx, dyPx, steps = 4) => {
          const r = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)});
            if (!e) return null; const r = e.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
          if (!r) return;
          await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x, y: r.y, button: "left", clickCount: 1 });
          for (let s = 1; s <= steps; s++)
            await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: r.x + (dxPx * s) / steps, y: r.y + (dyPx * s) / steps, button: "left" });
          await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x + dxPx, y: r.y + dyPx, button: "left" });
        },
        click: async sel => {
          const r = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)});
            if (!e) return null; const r = e.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
          if (r) { await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x, y: r.y, button: "left", clickCount: 1 });
            await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x, y: r.y, button: "left" }); }
        },
      };
      scripted = await mod.default(h);
    }
  }

  /* screenshot evidence */
  let shotPath = null;
  try {
    mkdirSync(SHOT_DIR, { recursive: true });
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    shotPath = join(SHOT_DIR, `${slug || "page"}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`);
    writeFileSync(shotPath, Buffer.from(shot.data, "base64"));
  } catch (e) { shotPath = "shot-failed: " + e.message; }

  /* verdict */
  const responsive = (sigBefore !== "no-canvas" && sigBefore !== sigAfter) || (mutAfter - mutBefore) > 3;
  const reasons = [];
  if (errors.length) reasons.push(errors.length + " uncaught error(s): " + errors[0].slice(0, 160));
  if (consoleErrs.length) reasons.push(consoleErrs.length + " console.error: " + consoleErrs[0].slice(0, 120));
  if (!surface || (surface.canvases === 0 && surface.interactives === 0 && surface.bodyLen < 200))
    reasons.push("no interactive game surface");
  // a passing scripted playtest performs real input and asserts the game
  // reacted — that is responsiveness evidence on its own (DOM games whose
  // interactive surfaces are hidden from the generic poke)
  if (!responsive && !(scripted && scripted.pass === true)) reasons.push("game did not respond to input (canvas/DOM unchanged)");
  if (scripted && scripted.pass === false) reasons.push("scripted playtest failed: " + (scripted.detail || "see test"));

  const verdict = {
    pass: reasons.length === 0,
    slug: slug || url,
    url,
    reasons,
    errors: errors.slice(0, 5),
    consoleErrs: consoleErrs.slice(0, 5),
    responsive,
    surface,
    canvasChanged: sigBefore !== "no-canvas" ? sigBefore !== sigAfter : null,
    domMutations: (mutAfter ?? 0) - (mutBefore ?? 0),
    pointerTrace,
    touchDiag,
    scripted,
    shotPath,
  };
  console.log("QA-REPORT " + JSON.stringify(verdict, null, 1));
  console.log("QA-VERDICT " + JSON.stringify({ pass: verdict.pass, slug: verdict.slug, reasons }));
  ws.close();
  try { chrome.kill(); } catch (e) {}
  try { rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  process.exit(verdict.pass ? 0 : 1);
}

main().catch(e => {
  console.error("QA-HARNESS-ERROR " + e.message);
  console.log("QA-VERDICT " + JSON.stringify({ pass: false, slug: slug || url, reasons: ["harness: " + e.message] }));
  process.exit(1);
});
