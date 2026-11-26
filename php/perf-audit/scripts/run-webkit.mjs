// Test de défilement WebKit (moteur Playwright pour Windows) en profil iPhone.
// ATTENTION : ce n'est PAS Safari iOS (pas de GPU/compositeur iOS, pas de ralentissement CPU possible,
// pas de Long Tasks en WebKit). Sert seulement de signal grossier côté moteur WebKit.
// Usage : node php/perf-audit/scripts/run-webkit.mjs   (env WK_TAG=baseline, WK_PAGES=home,recyclage-ordinateur, WK_DEVICE="iPhone 13")
// Sortie : raw/<tag>-webkit.json
import { BASE, PAGES, HIDE_COOKIE_CSS, pw, writeJSON, sleep } from "./common.mjs";

const tag = process.env.WK_TAG || "baseline";
const keys = (process.env.WK_PAGES || "home,recyclage-ordinateur").split(",");
const devName = process.env.WK_DEVICE || "iPhone 13";
const JANK = 18;
const out = { base: BASE, date: new Date().toISOString(), device: devName, runs: {} };
let browser;
try { browser = await pw.webkit.launch({ headless: true }); out.webkitVersion = browser.version(); }
catch (e) { out.error = "WebKit indisponible : " + String(e).slice(0, 200); writeJSON(`${tag}-webkit.json`, out); console.log(out.error); process.exit(0); }

for (const key of keys) {
  const p = PAGES.find((x) => x.key === key);
  const ctx = await browser.newContext({ ...pw.devices[devName] });
  const page = await ctx.newPage();
  await page.addInitScript((css) => {
    window.__f = []; window.__armed = false;
    const loop = (t) => { if (window.__armed) window.__f.push([t, scrollY]); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); });
  }, HIDE_COOKIE_CSS);
  try {
    const t0 = Date.now();
    await page.goto(BASE + p.path, { waitUntil: "load", timeout: 180000 });
    const loadMs = Date.now() - t0;
    await sleep(4000);
    const info = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, vh: innerHeight, canvas: document.querySelectorAll("canvas").length }));
    await page.evaluate(() => { scrollTo({ top: 0, behavior: "instant" }); window.__armed = true; });
    await page.evaluate(() => new Promise((res) => {
      const t0 = performance.now(); const maxY = document.documentElement.scrollHeight - innerHeight;
      const step = (t) => { const y = Math.min(maxY, ((t - t0) / 1000) * 2000); scrollTo({ top: y, behavior: "instant" }); if (y >= maxY || t - t0 > 60000) res(); else requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }));
    await sleep(500);
    const f = await page.evaluate(() => { window.__armed = false; return window.__f; });
    const d = []; for (let i = 1; i < f.length; i++) d.push(f[i][0] - f[i - 1][0]);
    const dur = f.at(-1)[0] - f[0][0];
    // pires zones : regroupe par tranches de 1000 px de scrollY
    const buckets = {};
    for (let i = 1; i < f.length; i++) { const b = Math.floor(f[i][1] / 1000) * 1000; (buckets[b] ||= { n: 0, jank: 0, worst: 0 }); buckets[b].n++; if (d[i - 1] > JANK) buckets[b].jank++; buckets[b].worst = Math.max(buckets[b].worst, +d[i - 1].toFixed(1)); }
    out.runs[key] = { page: p.path, loadMs, docHeight: info.h, vh: info.vh, canvas: info.canvas, frames: f.length, durationMs: Math.round(dur),
      fps: +((f.length - 1) / (dur / 1000)).toFixed(1), pctOver16: +(100 * d.filter((x) => x > JANK).length / d.length).toFixed(1),
      pctOver33: +(100 * d.filter((x) => x > 33.4).length / d.length).toFixed(1), worstMs: +Math.max(...d).toFixed(1), byScrollY: buckets };
    console.log(key, JSON.stringify({ ...out.runs[key], byScrollY: undefined }));
  } catch (e) { out.runs[key] = { error: String(e).slice(0, 300) }; console.log(key, "ERREUR", String(e).slice(0, 200)); }
  await ctx.close();
}
await browser.close();
console.log("OK", writeJSON(`${tag}-webkit.json`, out));
