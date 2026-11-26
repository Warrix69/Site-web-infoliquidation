// Navigation (clic -> page suivante : début de navigation, FCP, LCP) et latence d'interaction
// (Event Timing API, durationThreshold 16 ms ≈ INP) sous CPU 4x.
// Usage : node php/perf-audit/scripts/run-interactions.mjs   (env INT_TAG=baseline, INT_REPEAT=3)
// Sortie : raw/<tag>-interactions.json
// Profils : desktop 1366×657 CPU 4x ; mobile 390×664 (DPR 3, tactile) CPU 4x ; mobile CPU 4x + 4G lent (navigation seulement).
// Les clics de navigation passent par element.click() (les liens de sous-menu sont cachés) ;
// les interactions mesurées (menu, accordéon, champ) utilisent de vrais clics/taps/frappes Playwright.
import { BASE, HIDE_COOKIE_CSS, launchChrome, writeJSON, sleep, median } from "./common.mjs";

const tag = process.env.INT_TAG || "baseline";
const REPEAT = +(process.env.INT_REPEAT || 3);
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const SLOW4G = { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 };
const PROFILES = [
  { id: "desktop-cpu4", ctx: { viewport: { width: 1366, height: 657 } }, cpu: 4 },
  { id: "mobile-cpu4", ctx: { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: MOBILE_UA }, cpu: 4 },
  { id: "mobile-cpu4-4g", ctx: { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: MOBILE_UA }, cpu: 4, net: SLOW4G, navOnly: true },
];
const NAV_LINKS = ["/a-propos", "/recyclage-ordinateur", "/formulaire-de-ramassage", "/contact"];

const INSTR = (css) => {
  window.__ev = []; window.__lcp = null;
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ev.push({ name: e.name, dur: e.duration, id: e.interactionId, input: e.processingStart - e.startTime, proc: e.processingEnd - e.processingStart }); })
      .observe({ type: "event", durationThreshold: 16, buffered: true });
    new PerformanceObserver((l) => { const e = l.getEntries().at(-1); window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); });
};

async function newPage(browser, prof) {
  const ctx = await browser.newContext(prof.ctx);
  const page = await ctx.newPage();
  await page.addInitScript(INSTR, HIDE_COOKIE_CSS);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: prof.cpu });
  if (prof.net) { await cdp.send("Network.enable"); await cdp.send("Network.emulateNetworkConditions", prof.net); }
  return { ctx, page };
}

async function measureNav(page, href) {
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 240000 });
  await sleep(2500);
  const tClick = await page.evaluate((h) => {
    const a = [...document.querySelectorAll(`a[href="${h}"]`)][0];
    const t = performance.timeOrigin + performance.now();
    a.click();
    return t;
  }, href);
  await page.waitForURL((u) => new URL(u).pathname === href, { timeout: 240000 });
  await page.waitForLoadState("load", { timeout: 240000 });
  await sleep(2500);
  const r = await page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null;
    const nav = performance.getEntriesByType("navigation")[0];
    return { origin: performance.timeOrigin, fcp, lcp: window.__lcp, ttfb: nav?.responseStart, dcl: nav?.domContentLoadedEventEnd, load: nav?.loadEventEnd };
  });
  const base = r.origin - tClick;
  return { href, clickToNavStart: Math.round(base), clickToTTFB: Math.round(base + r.ttfb), clickToFCP: r.fcp != null ? Math.round(base + r.fcp) : null,
    clickToLCP: r.lcp != null ? Math.round(base + r.lcp) : null, clickToLoad: Math.round(base + r.load) };
}

async function events(page) {
  const ev = await page.evaluate(() => { const e = window.__ev; window.__ev = []; return e; });
  const byId = {};
  for (const e of ev) if (e.id) byId[e.id] = Math.max(byId[e.id] || 0, e.dur);
  return { maxDur: ev.length ? Math.max(...ev.map((e) => e.dur)) : null, interactions: Object.values(byId), entries: ev };
}

const browser = await launchChrome();
const out = { base: BASE, date: new Date().toISOString(), chrome: browser.version(), nav: {}, interactions: {} };

for (const prof of PROFILES) {
  // 1) Navigation
  out.nav[prof.id] = [];
  for (const href of NAV_LINKS) {
    const { ctx, page } = await newPage(browser, prof);
    try { const r = await measureNav(page, href); out.nav[prof.id].push(r); console.log(prof.id, "nav", JSON.stringify(r)); }
    catch (e) { out.nav[prof.id].push({ href, error: String(e).slice(0, 200) }); console.log(prof.id, href, "ERREUR", String(e).slice(0, 150)); }
    await ctx.close();
  }
  writeJSON(`${tag}-interactions.json`, out);
  if (prof.navOnly) continue;
  const isMobile = !!prof.ctx.isMobile;
  const tap = (page, sel) => (isMobile ? page.tap(sel) : page.click(sel));
  const res = {};
  // 2) Menu mobile (mobile seulement) / sous-menu Services (desktop)
  {
    const { ctx, page } = await newPage(browser, prof);
    await page.goto(BASE + "/", { waitUntil: "load" }); await sleep(3000); await events(page);
    const sel = isMobile ? "[data-menu-btn]" : "[data-services-btn]";
    const samples = [];
    for (let i = 0; i < REPEAT; i++) {
      await tap(page, sel); await sleep(700); const open = await events(page);
      await tap(page, sel); await sleep(700); await events(page);
      samples.push(open.maxDur);
    }
    res[isMobile ? "menuMobile" : "sousMenuServices"] = { page: "/", selector: sel, samples };
    await ctx.close();
  }
  // 3) Accordéon FAQ
  {
    const { ctx, page } = await newPage(browser, prof);
    await page.goto(BASE + "/faq", { waitUntil: "load" }); await sleep(3000); await events(page);
    const samples = [];
    for (let i = 1; i <= REPEAT; i++) {
      const sel = `#acc1-btn-${i}`;
      await page.locator(sel).scrollIntoViewIfNeeded(); await sleep(500); await events(page);
      await tap(page, sel); await sleep(800);
      samples.push((await events(page)).maxDur);
    }
    res.accordeonFaq = { page: "/faq", selector: "#acc1-btn-N", samples };
    await ctx.close();
  }
  // 4) Formulaire de ramassage : focus + frappe
  {
    const { ctx, page } = await newPage(browser, prof);
    await page.goto(BASE + "/formulaire-de-ramassage", { waitUntil: "load" }); await sleep(4000);
    const input = page.locator('[data-island="PickupForm"] input[name="company"]').first(); // (pas le champ piège ilr_hp_field)
    await input.waitFor({ timeout: 30000 });
    await input.scrollIntoViewIfNeeded(); await sleep(600); await events(page);
    await (isMobile ? input.tap() : input.click()); await sleep(600);
    const focus = await events(page);
    await page.keyboard.type("Entreprise Test", { delay: 80 }); await sleep(800);
    const typing = await events(page);
    res.formulaire = { page: "/formulaire-de-ramassage", focusMax: focus.maxDur, typingMax: typing.maxDur,
      typingInteractions: typing.interactions.length, typingEntries: typing.entries.length };
    await ctx.close();
  }
  for (const v of Object.values(res)) if (v.samples) { const s = v.samples.filter((x) => x != null); v.max = s.length ? Math.max(...s) : null; v.median = s.length ? median(s) : null; v.missing = v.samples.length - s.length; }
  out.interactions[prof.id] = res;
  console.log(prof.id, JSON.stringify(res));
  writeJSON(`${tag}-interactions.json`, out);
}
await browser.close();
console.log("OK");
