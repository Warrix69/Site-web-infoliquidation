import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const [n, u, y] of [["about", "/a-propos/", 0], ["svc", "/recyclage-ordinateur/", 0], ["svc2", "/recyclage-ordinateur/", 1500], ["faq", "/faq/", 450], ["contact", "/contact/", 380], ["blog", "/blog/", 300], ["art", "/blog/nos-5-conseils-pour-un-recyclage-reussi/", 0], ["menu", "/informations/", 0]]) {
  await p.goto("http://localhost:4500" + u, { waitUntil: "networkidle" });
  await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(1200);
  if (n === "faq") await p.click(".faq summary");
  if (n === "menu") { await p.hover("#svc button"); await p.waitForTimeout(400); }
  await p.waitForTimeout(400);
  await p.screenshot({ path: `lab/manual/page-${n}.png` });
}
await b.close();
