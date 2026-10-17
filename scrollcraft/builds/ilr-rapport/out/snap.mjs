// Targeted screenshots at named scroll positions (desktop + phone).
// usage: node out/snap.mjs [desktop|mobile|reduced] name=expr ...
// expr is evaluated in the page and must return a scrollY.
import { chromium } from "playwright-core";
import fs from "node:fs";
const mode = process.argv[2] || "desktop";
const shots = process.argv.slice(3).map((s) => s.split(/=(.*)/s).slice(0, 2));
const size = mode === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
  hasTouch: mode === "mobile", isMobile: mode === "mobile" });
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://localhost:4500/", { waitUntil: "networkidle" });
await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
await page.waitForTimeout(600);
fs.mkdirSync("lab/manual", { recursive: true });
for (const [name, expr] of shots) {
  const y = await page.evaluate(expr);
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `lab/manual/${mode}-${name}.png` });
  console.log(mode, name, Math.round(y));
}
if (errs.length) console.log("console errors:", errs);
await browser.close();
