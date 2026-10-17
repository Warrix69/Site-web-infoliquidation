// Visits every internal page, follows every internal link, reports broken links,
// failed requests and page errors, desktop and mobile.
import { chromium } from "playwright-core";
const BASE = "http://localhost:4500";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const seen = new Set(), queue = ["/", "/en/"], problems = [];
const ignore = (u) => /entrepot\.jpg$/.test(u);
p.on("pageerror", (e) => problems.push(`${p.url()} JS: ${e.message}`));
p.on("response", (r) => { if (r.status() >= 400 && !ignore(r.url())) problems.push(`${p.url()} HTTP ${r.status()} ${r.url()}`); });
while (queue.length) {
  const u = queue.shift(); if (seen.has(u)) continue; seen.add(u);
  const res = await p.goto(BASE + u, { waitUntil: "networkidle" });
  if (!res || res.status() >= 400) { problems.push(`BROKEN ${u} ${res && res.status()}`); continue; }
  const links = await p.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  for (const h of links) {
    if (!h || /^(tel:|mailto:|https?:|#)/.test(h)) continue;
    const path = h.split("#")[0]; if (path && !seen.has(path)) queue.push(path);
  }
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 1) problems.push(`${u} horizontal overflow ${ov}px`);
}
// mobile overflow pass
const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mp = await m.newPage();
for (const u of seen) {
  await mp.goto(BASE + u, { waitUntil: "networkidle" });
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 1) problems.push(`MOBILE ${u} overflow ${ov}px`);
}
console.log("pages visited:", seen.size);
console.log(problems.length ? problems.join("\n") : "no problems");
await b.close();
