// Hero checks: decode actually ends on the right words, counter lands on 20, no page errors.
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
for (const [name, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ["reduced", { viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }]]) {
  const ctx = await b.newContext(opts); const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto("http://localhost:4500/", { waitUntil: "networkidle" });
  const mid = await p.evaluate(() => document.getElementById("hl-tex").textContent);
  await p.waitForTimeout(2200);
  const r = await p.evaluate(() => ({ tex: document.getElementById("hl-tex").textContent, n: document.getElementById("hl-20").textContent,
    font: getComputedStyle(document.querySelector(".tp h1")).fontFamily, ready: document.fonts.check("700 40px Geist"),
    h1h: Math.round(document.querySelector(".tp h1").getBoundingClientRect().height), sw: document.documentElement.scrollWidth,
    sr: document.querySelector("#h-hero .sr").textContent }));
  await p.screenshot({ path: `lab/manual/hero-${name}.png` });
  console.log(name, JSON.stringify({ midDecode: mid, ...r, errs }));
  await ctx.close();
}
await b.close();
