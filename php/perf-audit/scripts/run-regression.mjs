// Vérifications de non-régression (Playwright headless, Chrome) après les optimisations.
//   BASE_URL=http://localhost:8090 PW_PATH=... node php/perf-audit/scripts/run-regression.mjs
// Sortie : raw/<REG_TAG|apres>-regression.json + captures du héros dans raw/regression-shots/ (non versionnées).
import fs from "node:fs";
import path from "node:path";
import { BASE, OUT, PAGES, HIDE_COOKIE_CSS, launchChrome, writeJSON, sleep } from "./common.mjs";

const tag = process.env.REG_TAG || "apres";
const shots = path.join(OUT, "regression-shots");
fs.mkdirSync(shots, { recursive: true });

const PROFILES = {
  desktop: { viewport: { width: 1366, height: 768 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
};
const res = { base: BASE, date: new Date().toISOString(), pages: {}, overflow: [], lenis: {}, menu: {}, hero: {} };
const browser = await launchChrome();

async function open(profile, url, extra = {}) {
  const ctx = await browser.newContext({ ...PROFILES[profile], ...extra });
  const page = await ctx.newPage();
  const errors = [], bad = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 300)));
  page.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  page.on("requestfailed", (r) => { const f = r.failure()?.errorText || ""; if (!/ERR_ABORTED/.test(f)) bad.push(`FAILED ${f} ${r.url()}`); });
  await page.goto(BASE + url, { waitUntil: "load" });
  await page.addStyleTag({ content: HIDE_COOKIE_CSS });
  return { ctx, page, errors, bad };
}

async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 600) { await page.evaluate((v) => window.scrollTo(0, v), y); await sleep(120); }
  await sleep(800);
}

// 1. Console + 404 sur les 12 pages, desktop et mobile (avec défilement complet pour les chargements différés)
for (const profile of Object.keys(PROFILES)) {
  for (const p of PAGES) {
    const { ctx, page, errors, bad } = await open(profile, p.path);
    await sleep(1500);
    await scrollThrough(page);
    res.pages[`${p.key}|${profile}`] = { errors, bad };
    console.log(`[pages] ${profile} ${p.path} erreurs=${errors.length} >=400=${bad.length}`);
    await ctx.close();
  }
}

// 2. Défilement horizontal (scrollWidth vs clientWidth) — 360/390 portrait, 844×390 paysage
const SIZES = [
  { name: "360x780", viewport: { width: 360, height: 780 } },
  { name: "390x844", viewport: { width: 390, height: 844 } },
  { name: "844x390", viewport: { width: 844, height: 390 } },
];
for (const s of SIZES) {
  for (const p of PAGES) {
    const ctx = await browser.newContext({ viewport: s.viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const page = await ctx.newPage();
    await page.goto(BASE + p.path, { waitUntil: "load" });
    await sleep(1200);
    await scrollThrough(page);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    res.overflow.push({ page: p.path, size: s.name, ...m, ok: m.sw <= m.cw });
    if (m.sw > m.cw) console.log(`[overflow] ${s.name} ${p.path} ${m.sw} > ${m.cw}`);
    await ctx.close();
  }
}

// 3. Lenis (desktop, accueil + une page service)
for (const url of ["/", "/recyclage-ordinateur"]) {
  const { ctx, page, errors } = await open("desktop", url);
  await sleep(2000);
  const r = { hasLenis: await page.evaluate(() => !!window.__lenis) };
  // Ancre : lien temporaire injecté pour le test vers le pied de page
  r.anchor = await page.evaluate(async () => {
    const target = document.querySelector("footer");
    target.id = target.id || "reg-target";
    const a = document.createElement("a");
    a.href = "#" + target.id; a.textContent = "test"; a.id = "reg-anchor";
    a.style.cssText = "position:fixed;top:120px;left:10px;z-index:99999;background:#fff;padding:8px";
    document.body.appendChild(a);
    return target.id;
  });
  await page.click("#reg-anchor");
  await sleep(2500);
  r.anchorResult = await page.evaluate((id) => {
    const t = document.getElementById(id).getBoundingClientRect();
    const max = document.documentElement.scrollHeight - innerHeight;
    return { scrollY: Math.round(scrollY), max, targetTop: Math.round(t.top), reached: Math.abs(t.top) < 5 || Math.abs(scrollY - max) < 5 };
  }, r.anchor);
  // Clavier
  await page.mouse.click(683, 600); // focus sur le document (zone neutre)
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); }); await sleep(800);
  const keys = {};
  for (const k of ["PageDown", "Space", "ArrowDown", "End", "Home"]) {
    const before = await page.evaluate(() => scrollY);
    await page.keyboard.press(k); await sleep(1200);
    const after = await page.evaluate(() => scrollY);
    keys[k] = { before: Math.round(before), after: Math.round(after), ok: k === "Home" ? after < before : after > before };
  }
  r.keys = keys;
  // Inactivité puis molette : la boucle rAF doit se réveiller
  await page.evaluate(() => window.scrollTo(0, 0)); await sleep(800);
  r.idle = await page.evaluate(() => window.__lenis ? String(window.__lenis.isScrolling) : null);
  await sleep(4000);
  await page.mouse.move(683, 400);
  const b = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 900); await sleep(1500);
  const a = await page.evaluate(() => scrollY);
  r.wheelAfterIdle = { before: Math.round(b), after: Math.round(a), ok: a > b + 300 };
  // scrollTo programmatique après inactivité
  await sleep(4000);
  await page.evaluate(() => window.__lenis?.scrollTo(0)); await sleep(2000);
  r.scrollToAfterIdle = { after: Math.round(await page.evaluate(() => scrollY)), ok: (await page.evaluate(() => scrollY)) < 5 };
  r.errors = errors;
  res.lenis[url] = r;
  console.log(`[lenis] ${url}`, JSON.stringify(r));
  await ctx.close();
}

// 4. Menu mobile (390, accueil et page service)
for (const url of ["/", "/recyclage-ordinateur"]) {
  const { ctx, page } = await open("mobile", url);
  await sleep(1500);
  const st = () => page.evaluate(() => ({ expanded: document.querySelector("[data-menu-btn]").getAttribute("aria-expanded"), hidden: document.querySelector("[data-mobile-menu]").hidden }));
  const r = { initial: await st() };
  await page.click("[data-menu-btn]"); await sleep(500); r.afterOpen = await st();
  await page.click("[data-menu-btn]"); await sleep(500); r.afterClose = await st();
  r.ok = r.afterOpen.expanded === "true" && !r.afterOpen.hidden && r.afterClose.expanded === "false" && r.afterClose.hidden;
  // Défilement après fermeture
  await page.evaluate(() => window.scrollTo(0, 800)); await sleep(500);
  r.scrollAfterClose = Math.round(await page.evaluate(() => scrollY));
  res.menu[url] = r;
  console.log(`[menu] ${url}`, JSON.stringify(r));
  await ctx.close();
}

// 5. Héros 3D visible (accueil desktop et mobile)
for (const profile of Object.keys(PROFILES)) {
  const { ctx, page, errors } = await open(profile, "/");
  await sleep(6000);
  const r = await page.evaluate(() => {
    const c = [...document.querySelectorAll("canvas")].map((el) => {
      const b = el.getBoundingClientRect();
      let o = 1; for (let n = el; n; n = n.parentElement) o *= +getComputedStyle(n).opacity;
      return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top), opacity: +o.toFixed(2) };
    });
    return { canvases: c, visible3d: c.some((x) => x.w > 100 && x.h > 100 && x.top < innerHeight && x.opacity > 0.5) };
  });
  const f = path.join(shots, `hero-${profile}.png`);
  await page.screenshot({ path: f });
  res.hero[profile] = { ...r, shot: f, errors };
  console.log(`[hero] ${profile}`, JSON.stringify(r));
  await ctx.close();
}

await browser.close();
console.log("OK", writeJSON(`${tag}-regression.json`, res));
