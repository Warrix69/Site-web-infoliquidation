// Screenshots of the old (current Next.js) site for reference.
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const [name, url, ys] of [["form", "/formulaire-de-ramassage", [0, 700, 1400, 2100]], ["about", "/a-propos", [0, 900]], ["svc", "/recyclage-ordinateur", [0, 900]]]) {
  await p.goto("http://localhost:3000" + url, { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForTimeout(2500);
  for (const y of ys) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(1500); await p.screenshot({ path: `lab/old-${name}-${y}.png` }); }
}
await b.close();
