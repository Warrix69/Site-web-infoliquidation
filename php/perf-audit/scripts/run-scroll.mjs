// Fluidité du défilement (frames rAF + Long Tasks) sous CPU ralenti, Chrome headless (rAF actif).
// Défilement à vitesse constante 2000 px/s :
//   - desktop : molette réelle (page.mouse.wheel) 100 px toutes les 50 ms (passe par Lenis) ;
//   - mobile  : pilotage rAF dans la page (window.scrollTo, 2000 px/s) — pas de molette au doigt.
// Usage : node php/perf-audit/scripts/run-scroll.mjs
// Options (env) :
//   SCROLL_PAGES=home,recyclage-ordinateur,destruction-disques,ville-laval
//   SCROLL_CONFIGS=d1366-cpu1,...      (voir CONFIGS ci-dessous ; défaut : toutes)
//   SCROLL_TAG=baseline
//   JANK_MS=18      seuil « frame manquée » (16,7 ms + gigue de vsync)
// Sortie : raw/<tag>-scroll.json
import { BASE, PAGES, HIDE_COOKIE_CSS, launchChrome, writeJSON, sleep } from "./common.mjs";

const tag = process.env.SCROLL_TAG || "baseline";
const JANK = +(process.env.JANK_MS || 18);
const pageKeys = (process.env.SCROLL_PAGES || "home,recyclage-ordinateur,destruction-disques,ville-laval").split(",");
const SLOW4G = { offline: false, latency: 150, downloadThroughput: (1.6e6) / 8, uploadThroughput: (750e3) / 8 };
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const CONFIGS = [
  { id: "d1366-cpu1", vp: [1366, 657], cpu: 1 },
  { id: "d1366-cpu4", vp: [1366, 657], cpu: 4 },
  { id: "d1366-cpu6", vp: [1366, 657], cpu: 6 },
  { id: "d1920-cpu1", vp: [1920, 947], cpu: 1 },
  { id: "d1920-cpu4", vp: [1920, 947], cpu: 4 },
  { id: "d1920-cpu6", vp: [1920, 947], cpu: 6 },
  { id: "m390-cpu4-4g", vp: [390, 664], cpu: 4, mobile: true, net: SLOW4G },
  { id: "m360-cpu4-4g", vp: [360, 640], cpu: 4, mobile: true, net: SLOW4G },
];
const cfgFilter = process.env.SCROLL_CONFIGS ? process.env.SCROLL_CONFIGS.split(",") : null;

// Script injecté : enregistre chaque frame rAF (t, scrollY) et les Long Tasks, une fois armé.
const INSTRUMENT = (css) => {
  window.__perf = { armed: false, frames: [], lt: [] };
  const loop = (t) => { if (window.__perf.armed) window.__perf.frames.push([t, window.scrollY]); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (window.__perf.armed) window.__perf.lt.push([e.startTime, e.duration, window.scrollY]);
    }).observe({ type: "longtask", buffered: false });
  } catch {}
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
  });
};

function sectionMap() {
  const main = document.querySelector("main") || document.body;
  const list = [];
  const add = (el, label) => {
    // Les îlots sont souvent des wrappers display:contents (rect vide) : union des enfants.
    const els = getComputedStyle(el).display === "contents" ? [...el.querySelectorAll(":scope > *")] : [el];
    let top = Infinity, bottom = -Infinity;
    for (const e of els) { const r = e.getBoundingClientRect(); if (r.height < 1) continue; top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom); }
    if (top === Infinity) return;
    list.push({ label, top: Math.round(top + scrollY), bottom: Math.round(bottom + scrollY) });
  };
  const hdr = document.querySelector("body > header"); if (hdr && getComputedStyle(hdr).position !== "fixed") add(hdr, "header");
  [...main.children].forEach((el, i) => {
    if (el.tagName === "SCRIPT") return;
    const isl = el.matches("[data-island]") ? el.dataset.island : el.querySelector("[data-island]")?.dataset.island;
    const h = el.querySelector("h1,h2")?.textContent?.trim().replace(/\s+/g, " ").slice(0, 32);
    const label = `#${i} ` + (el.id ? "id=" + el.id : isl ? "island=" + isl : h ? `"${h}"` : el.tagName.toLowerCase());
    add(el, label);
  });
  const ft = document.querySelector("body > footer"); if (ft) add(ft, "footer");
  return { sections: list, docHeight: document.documentElement.scrollHeight, vh: innerHeight,
    canvas: document.querySelectorAll("canvas").length, video: document.querySelectorAll("video").length };
}

function analyse(frames, lt, map, vh) {
  const deltas = [];
  for (let i = 1; i < frames.length; i++) deltas.push([frames[i][0] - frames[i - 1][0], frames[i][1]]);
  const dur = frames.length > 1 ? frames.at(-1)[0] - frames[0][0] : 0;
  const secOf = (y) => {
    const c = y + vh / 2;
    return (map.sections.find((s) => c >= s.top && c < s.bottom) || { label: "?" }).label;
  };
  const per = {};
  for (const s of map.sections) per[s.label] = { range: [s.top, s.bottom], frames: 0, jank: 0, jank33: 0, worst: 0, longTasks: 0, longTaskMs: 0 };
  per["?"] = { range: null, frames: 0, jank: 0, jank33: 0, worst: 0, longTasks: 0, longTaskMs: 0 };
  for (const [d, y] of deltas) {
    const s = per[secOf(y)];
    s.frames++; if (d > JANK) s.jank++; if (d > 33.4) s.jank33++; s.worst = Math.max(s.worst, +d.toFixed(1));
  }
  for (const [, d, y] of lt) { const s = per[secOf(y)]; s.longTasks++; s.longTaskMs += Math.round(d); }
  for (const k of Object.keys(per)) if (!per[k].frames && !per[k].longTasks) delete per[k];
  const n = deltas.length || 1;
  return {
    frames: frames.length, durationMs: Math.round(dur),
    fps: dur ? +((frames.length - 1) / (dur / 1000)).toFixed(1) : 0,
    pctOver16: +(100 * deltas.filter(([d]) => d > JANK).length / n).toFixed(1),
    pctOver33: +(100 * deltas.filter(([d]) => d > 33.4).length / n).toFixed(1),
    worstMs: +Math.max(0, ...deltas.map(([d]) => d)).toFixed(1),
    p95Ms: +([...deltas.map(([d]) => d)].sort((a, b) => a - b)[Math.floor(n * 0.95)] || 0).toFixed(1),
    longTasks: lt.length, longTaskTotalMs: Math.round(lt.reduce((s, x) => s + x[1], 0)),
    longTaskMaxMs: Math.round(Math.max(0, ...lt.map((x) => x[1]))),
    perSection: per,
  };
}

const browser = await launchChrome();
const out = { base: BASE, date: new Date().toISOString(), chrome: browser.version(), jankThresholdMs: JANK, speedPxPerS: 2000, runs: {} };

for (const key of pageKeys) {
  const p = PAGES.find((x) => x.key === key);
  for (const cfg of CONFIGS) {
    if (cfgFilter && !cfgFilter.includes(cfg.id)) continue;
    const ctx = await browser.newContext({
      viewport: { width: cfg.vp[0], height: cfg.vp[1] },
      ...(cfg.mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: MOBILE_UA } : {}),
    });
    const page = await ctx.newPage();
    await page.addInitScript(INSTRUMENT, HIDE_COOKIE_CSS);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cfg.cpu });
    if (cfg.net) { await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", cfg.net); }
    const id = `${key}|${cfg.id}`;
    try {
      const t0 = Date.now();
      await page.goto(BASE + p.path, { waitUntil: "load", timeout: 240000 });
      const loadMs = Date.now() - t0;
      await sleep(4000);
      const map = await page.evaluate(sectionMap);
      await page.evaluate(() => { window.scrollTo({ top: 0, behavior: "instant" }); });
      await sleep(800);
      if (!cfg.mobile) await page.mouse.move(cfg.vp[0] / 2, cfg.vp[1] / 2);
      await page.evaluate(() => { window.__perf.frames = []; window.__perf.lt = []; window.__perf.armed = true; });
      const maxY = map.docHeight - map.vh;
      const tStart = Date.now();
      const limit = (maxY / 2000) * 1000 * 2.5 + 5000; // garde-fou
      if (!cfg.mobile) {
        let i = 0;
        while (Date.now() - tStart < limit) {
          await page.mouse.wheel(0, 100);
          i++;
          const y = await page.evaluate(() => scrollY);
          if (y >= maxY - 2 && i * 100 >= maxY) break;
          const wait = tStart + i * 50 - Date.now();
          if (wait > 0) await sleep(wait);
        }
      } else {
        await page.evaluate((lim) => new Promise((res) => {
          const t0 = performance.now(); const maxY = document.documentElement.scrollHeight - innerHeight;
          const step = (t) => {
            const y = Math.min(maxY, ((t - t0) / 1000) * 2000);
            window.scrollTo({ top: y, behavior: "instant" });
            if (y >= maxY || t - t0 > lim) res(); else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }), limit);
      }
      await sleep(600);
      const data = await page.evaluate(() => { window.__perf.armed = false; return { frames: window.__perf.frames, lt: window.__perf.lt, y: scrollY }; });
      const res = analyse(data.frames, data.lt, map, map.vh);
      out.runs[id] = { page: p.path, cfg, loadMs, docHeight: map.docHeight, canvas: map.canvas, video: map.video,
        reachedY: Math.round(data.y), maxY, wallMs: Date.now() - tStart, ...res };
      console.log(id, `fps=${res.fps} >${JANK}=${res.pctOver16}% >33=${res.pctOver33}% worst=${res.worstMs} LT=${res.longTasks}`);
    } catch (e) {
      out.runs[id] = { page: p.path, cfg, error: String(e).slice(0, 300) };
      console.log(id, "ERREUR", String(e).slice(0, 200));
    }
    await ctx.close();
    writeJSON(`${tag}-scroll.json`, out);
  }
}
await browser.close();
console.log("OK");
