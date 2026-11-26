// Poids JS/CSS/images chargés par page (Playwright + Chrome), taille brute et gzip (zlib niveau 6,
// équivalent mod_deflate par défaut) et chunks de assets/chunks/ chargés par page.
// Deux phases : "initial" (load + 3 s de repos) puis "scroll" (défilement jusqu'en bas, îlots différés).
// Usage : node php/perf-audit/scripts/run-weight.mjs      (env WEIGHT_TAG=baseline, WEIGHT_PAGES=home,faq)
// Sortie : raw/<tag>-weight.json
import zlib from "node:zlib";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { BASE, PAGES, ROOT, HIDE_COOKIE_CSS, launchChrome, writeJSON, sleep } from "./common.mjs";

const tag = process.env.WEIGHT_TAG || "baseline";
const only = process.env.WEIGHT_PAGES ? process.env.WEIGHT_PAGES.split(",") : null;
const PROFILES = {
  desktop: { viewport: { width: 1366, height: 657 } },
  mobile: { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36" },
};

const browser = await launchChrome();
const out = { base: BASE, date: new Date().toISOString(), chrome: browser.version(), pages: {} };

// Empreinte du build mesuré (assets servis)
const assetsDir = path.join(ROOT, "php/public/assets");
out.build = {};
for (const f of ["site.js", "islands.js", "app.css", ...fs.readdirSync(path.join(assetsDir, "chunks")).map((c) => "chunks/" + c)]) {
  const buf = fs.readFileSync(path.join(assetsDir, f));
  out.build[f] = { raw: buf.length, gzip: zlib.gzipSync(buf, { level: 6 }).length, md5: crypto.createHash("md5").update(buf).digest("hex").slice(0, 8) };
}

for (const p of PAGES) {
  if (only && !only.includes(p.key)) continue;
  out.pages[p.key] = { path: p.path };
  for (const [prof, opts] of Object.entries(PROFILES)) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.addInitScript((css) => {
      document.addEventListener("DOMContentLoaded", () => {
        const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
      });
    }, HIDE_COOKIE_CSS);
    const reqs = [];
    let phase = "initial";
    page.on("response", async (r) => {
      const req = r.request();
      const url = r.url();
      const entry = { url: url.replace(BASE, ""), type: req.resourceType(), status: r.status(), phase };
      reqs.push(entry);
      try {
        const body = await r.body();
        entry.raw = body.length;
        const ct = (r.headers()["content-type"] || "");
        entry.contentType = ct;
        entry.gzip = /javascript|css|html|json|svg|text/.test(ct) ? zlib.gzipSync(body, { level: 6 }).length : body.length;
        entry.servedEncoding = r.headers()["content-encoding"] || null;
      } catch { entry.raw = null; }
    });
    await page.goto(BASE + p.path, { waitUntil: "load", timeout: 120000 });
    await sleep(3000);
    phase = "scroll";
    await page.evaluate(async () => {
      const H = () => document.documentElement.scrollHeight;
      for (let y = 0; y < H(); y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, H());
    });
    await sleep(3000);
    await ctx.close();
    const agg = (filter) => {
      const sel = reqs.filter(filter);
      return { count: sel.length, raw: sel.reduce((s, r) => s + (r.raw || 0), 0), gzip: sel.reduce((s, r) => s + (r.gzip || 0), 0) };
    };
    const kinds = { js: (r) => r.type === "script", css: (r) => r.type === "stylesheet", img: (r) => r.type === "image",
      font: (r) => r.type === "font", doc: (r) => r.type === "document", media: (r) => r.type === "media",
      other: (r) => !["script", "stylesheet", "image", "font", "document", "media"].includes(r.type) };
    const totals = {};
    for (const ph of ["initial", "scroll"]) {
      totals[ph] = {};
      for (const [k, f] of Object.entries(kinds)) totals[ph][k] = agg((r) => r.phase === ph && f(r));
    }
    out.pages[p.key][prof] = {
      totals,
      chunks: reqs.filter((r) => r.url.includes("/assets/chunks/")).map((r) => ({ file: r.url.split("/").pop().split("?")[0], raw: r.raw, gzip: r.gzip, phase: r.phase })),
      requests: reqs,
    };
    console.log(p.key, prof, "JS init gz", totals.initial.js.gzip, "JS scroll gz", totals.scroll.js.gzip);
  }
}
await browser.close();
console.log("OK", writeJSON(`${tag}-weight.json`, out));
