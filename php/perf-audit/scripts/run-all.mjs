// UNE commande pour tout relancer (séquentiellement — le serveur PHP intégré est mono-thread) :
//
//   1. Démarrer le serveur (autre terminal) :
//      "C:/Users/Admin/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe" ^
//        -d extension_dir=.../ext -d extension=curl -d extension=openssl -d extension=mbstring ^
//        -S localhost:8080 -t php/public php/public/index.php
//   2. Depuis la racine du dépôt :
//      TAG=apres node php/perf-audit/scripts/run-all.mjs          (bash)
//      $env:TAG="apres"; node php/perf-audit/scripts/run-all.mjs   (PowerShell)
//   3. Tableaux Markdown : node php/perf-audit/scripts/make-tables.mjs <tag>  -> raw/<tag>-tables.md
//
// Étapes : vérif 200 -> poids -> Lighthouse -> défilement -> interactions -> WebKit -> tableaux.
// Sauter une étape : SKIP=lighthouse,scroll ...   (noms : check,weight,lighthouse,scroll,interactions,webkit,tables)
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE, PAGES } from "./common.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const TAG = process.env.TAG || "baseline";
const skip = (process.env.SKIP || "").split(",");
const env = { ...process.env, LH_TAG: TAG, WEIGHT_TAG: TAG, SCROLL_TAG: TAG, INT_TAG: TAG, WK_TAG: TAG };
const run = (name, file, args = []) => {
  if (skip.includes(name)) return;
  console.log(`\n=== ${name} ===`);
  const r = spawnSync(process.execPath, [path.join(here, file), ...args], { stdio: "inherit", env });
  if (r.status !== 0) console.log(`!! ${name} a échoué (code ${r.status})`);
};

if (!skip.includes("check")) {
  for (const p of PAGES) {
    const r = await fetch(BASE + p.path, { redirect: "manual" });
    console.log(r.status, p.path);
    if (r.status !== 200) { console.log("Page non 200 : arrêt."); process.exit(1); }
  }
}
run("weight", "run-weight.mjs");
run("lighthouse", "run-lighthouse.mjs");
run("scroll", "run-scroll.mjs");
run("interactions", "run-interactions.mjs");
run("webkit", "run-webkit.mjs");
run("tables", "make-tables.mjs", [TAG]);
