import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const shots = [];
for (const [name, opts, url, fn] of [
  ["d-h0", { viewport: { width: 1440, height: 900 } }, "/", null],
  ["d-h100", { viewport: { width: 1440, height: 900 } }, "/", "hero"],
  ["d-en", { viewport: { width: 1440, height: 900 } }, "/en/", null],
  ["d-bento", { viewport: { width: 1440, height: 900 } }, "/", "bento"],
  ["m-h0", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, "/", null],
  ["m-h100", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, "/", "hero"],
]) {
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  await p.goto("http://localhost:4500" + url, { waitUntil: "networkidle" });
  await p.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await p.waitForTimeout(1800);
  if (fn === "hero") await p.evaluate(() => { const h = document.getElementById("hero"); scrollTo(0, h.offsetHeight - innerHeight); });
  if (fn === "bento") await p.evaluate(() => scrollTo(0, document.getElementById("bento").getBoundingClientRect().top + scrollY - 200));
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `lab/manual/v5-${name}.png` });
  await ctx.close();
}
await b.close();
