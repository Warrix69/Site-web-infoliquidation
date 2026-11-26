// Configuration partagée des scripts de mesure de performance (version PHP).
// Variables d'environnement :
//   BASE_URL   (défaut http://localhost:8080)
//   OUT_DIR    (défaut php/perf-audit/raw)   — dossier des résultats bruts
//   PW_PATH    chemin vers un dossier node_modules contenant playwright-core
//              (défaut scrollcraft/builds/ilr-rapport/node_modules)
//   LH_CLI     chemin vers lighthouse/cli/index.js (défaut : recherché dans le cache npx)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "../../..");
export const BASE = (process.env.BASE_URL || "http://localhost:8080").replace(/\/$/, "");
export const OUT = path.resolve(process.env.OUT_DIR || path.join(here, "..", "raw"));
fs.mkdirSync(OUT, { recursive: true });

const pwDir = process.env.PW_PATH || path.join(ROOT, "scrollcraft/builds/ilr-rapport/node_modules");
const req = createRequire(path.join(pwDir, "noop.js"));
export const pw = req("playwright-core");

export const PAGES = [
  { key: "home", path: "/" },
  { key: "a-propos", path: "/a-propos" },
  { key: "recyclage-ordinateur", path: "/recyclage-ordinateur" },
  { key: "destruction-disques", path: "/destruction-des-disques-durs" },
  { key: "destruction-donnees", path: "/destruction-des-donnees" },
  { key: "formulaire", path: "/formulaire-de-ramassage" },
  { key: "contact", path: "/contact" },
  { key: "blog", path: "/blog" },
  { key: "blog-article", path: "/blog/cybersecurite-et-recyclage-informatique-comment-proteger-les-donnees-de-votre-pme" },
  { key: "ville-laval", path: "/laval" },
  { key: "faq", path: "/faq" },
  { key: "en-home", path: "/en" },
];

// Masque la bannière de témoins (pour les tests Playwright, pas Lighthouse).
export const HIDE_COOKIE_CSS = '[aria-label="Cookie consent"]{display:none!important}';

export function findLighthouseCli() {
  if (process.env.LH_CLI) return process.env.LH_CLI;
  const cache = path.join(os.homedir(), "AppData/Local/npm-cache/_npx");
  if (fs.existsSync(cache)) {
    for (const d of fs.readdirSync(cache)) {
      const p = path.join(cache, d, "node_modules/lighthouse/cli/index.js");
      if (fs.existsSync(p)) return p;
    }
  }
  return null; // run-lighthouse.mjs retombe alors sur `npx.cmd lighthouse`
}

export function writeJSON(name, data) {
  const f = path.join(OUT, name);
  fs.writeFileSync(f, JSON.stringify(data, null, 2));
  return f;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export async function launchChrome(opts = {}) {
  return pw.chromium.launch({ channel: "chrome", headless: true, ...opts });
}
