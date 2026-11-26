// Lighthouse (catégorie performance) mobile + desktop sur toutes les pages, séquentiellement.
// Usage : node php/perf-audit/scripts/run-lighthouse.mjs
// Options (env) :
//   LH_PAGES=home,faq          sous-ensemble de pages (clés de common.mjs)
//   LH_FORMS=mobile,desktop    facteurs de forme
//   LH_MULTI=home,recyclage-ordinateur,formulaire   pages mesurées LH_RUNS fois (médiane)
//   LH_RUNS=3
//   LH_TAG=baseline            préfixe des fichiers (ex. "apres" pour la phase 3)
// Sortie : raw/lighthouse/<tag>-<page>-<form>-<n>.json (rapport complet) + raw/<tag>-lighthouse-summary.json
// Note : la bannière de témoins n'est PAS masquée ici (1re visite réaliste).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BASE, OUT, PAGES, findLighthouseCli, writeJSON, median } from "./common.mjs";

const tag = process.env.LH_TAG || "baseline";
const forms = (process.env.LH_FORMS || "mobile,desktop").split(",");
const only = process.env.LH_PAGES ? process.env.LH_PAGES.split(",") : null;
const multi = (process.env.LH_MULTI || "home,recyclage-ordinateur,formulaire").split(",");
const RUNS = +(process.env.LH_RUNS || 3);
const dir = path.join(OUT, "lighthouse");
fs.mkdirSync(dir, { recursive: true });
const cli = findLighthouseCli();

function runLH(url, form, outFile) {
  const args = [
    url,
    "--only-categories=performance",
    "--output=json",
    `--output-path=${outFile}`,
    "--chrome-flags=--headless=new",
    "--max-wait-for-load=90000",
    "--quiet",
  ];
  if (form === "desktop") args.push("--preset=desktop");
  const r = cli
    ? spawnSync(process.execPath, [cli, ...args], { stdio: "inherit" })
    : spawnSync("npx.cmd", ["lighthouse", ...args.map((a) => `"${a}"`)], { stdio: "inherit", shell: true });
  return r.status === 0 && fs.existsSync(outFile);
}

function findNode(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (obj.type === "node" && (obj.selector || obj.snippet)) return obj;
  for (const v of Object.values(obj)) {
    const f = findNode(v);
    if (f) return f;
  }
  return null;
}

export function extract(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const a = j.audits;
  const num = (id) => a[id]?.numericValue ?? null;
  let lcpNode = null;
  for (const id of ["largest-contentful-paint-element", "lcp-breakdown-insight", "lcp-discovery-insight"]) {
    lcpNode = findNode(a[id]?.details);
    if (lcpNode) break;
  }
  return {
    score: j.categories.performance.score != null ? Math.round(j.categories.performance.score * 100) : null,
    fcp: num("first-contentful-paint"),
    lcp: num("largest-contentful-paint"),
    tbt: num("total-blocking-time"),
    cls: num("cumulative-layout-shift"),
    si: num("speed-index"),
    lcpSelector: lcpNode?.selector || null,
    lcpSnippet: lcpNode?.snippet ? lcpNode.snippet.slice(0, 160) : null,
    lhVersion: j.lighthouseVersion,
    chrome: j.environment?.hostUserAgent?.match(/Chrome\/[\d.]+/)?.[0],
    runtimeError: j.runtimeError?.code || null,
  };
}

const summary = {};
for (const p of PAGES) {
  if (only && !only.includes(p.key)) continue;
  for (const form of forms) {
    const n = multi.includes(p.key) ? RUNS : 1;
    const runs = [];
    for (let i = 1; i <= n; i++) {
      const f = path.join(dir, `${tag}-${p.key}-${form}-${i}.json`);
      console.log(`[LH] ${p.key} ${form} passe ${i}/${n}`);
      if (runLH(BASE + p.path, form, f)) runs.push(extract(f));
      else runs.push({ error: "lighthouse a échoué" });
    }
    const ok = runs.filter((r) => r.score != null);
    const med = {};
    if (ok.length) {
      for (const k of ["score", "fcp", "lcp", "tbt", "cls", "si"]) {
        const vals = ok.map((r) => r[k]);
        med[k] = median(vals);
        med[k + "Range"] = [Math.min(...vals), Math.max(...vals)];
      }
      // élément LCP de la passe médiane (par score)
      const byScore = [...ok].sort((x, y) => x.lcp - y.lcp);
      med.lcpSelector = byScore[byScore.length >> 1].lcpSelector;
      med.lcpSnippet = byScore[byScore.length >> 1].lcpSnippet;
      med.lhVersion = ok[0].lhVersion;
      med.chrome = ok[0].chrome;
    }
    summary[`${p.key}|${form}`] = { page: p.path, form, runs, median: med };
    writeJSON(`${tag}-lighthouse-summary.json`, summary);
  }
}
console.log("OK", path.join(OUT, `${tag}-lighthouse-summary.json`));
