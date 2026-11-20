/**
 * Compile la version PHP :
 *  - assets/site.js     : comportements communs (vanilla + Lenis)
 *  - assets/islands.js  : sections interactives React (héros 3D, bac, formulaires…)
 *  - assets/app.css     : Tailwind (globals.css du site + ajouts PHP)
 *  - copie public/ (images, modèles 3D, admin) et les messages FR/EN
 * Usage : node php/build.mjs   (depuis la racine du projet)
 */
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const php = resolve(root, "php");
const out = resolve(php, "public/assets");
const shim = (f) => resolve(php, "js/shims", f);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: { site: resolve(php, "js/site.ts"), islands: resolve(php, "js/islands.tsx") },
  outdir: out,
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  target: ["es2020"],
  jsx: "automatic",
  chunkNames: "chunks/[name]-[hash]",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "next/image": shim("next-image.tsx"),
    "next/dynamic": shim("next-dynamic.tsx"),
    "next/navigation": shim("next-navigation.ts"),
    "next-intl/routing": shim("next-intl-routing.ts"),
    "@/i18n/navigation": shim("i18n-navigation.tsx"),
    "@": resolve(root, "src")
  },
  loader: { ".glb": "file", ".png": "file", ".webp": "file", ".jpg": "file" },
  logLevel: "info"
});

execSync(`npx tailwindcss -i "${resolve(php, "css/app.css")}" -o "${resolve(out, "app.css")}" --minify`, {
  cwd: root,
  stdio: "inherit",
  shell: true
});

// Fichiers statiques et textes
for (const dir of ["images", "models", "admin"]) {
  cpSync(resolve(root, "public", dir), resolve(php, "public", dir), { recursive: true });
}
for (const f of ["logo.png", "favicon-logo.png"]) cpSync(resolve(root, "public", f), resolve(php, "public", f));
cpSync(resolve(root, "src/app/icon.png"), resolve(php, "public/icon.png"));
mkdirSync(resolve(php, "app/messages"), { recursive: true });
for (const l of ["fr", "en"]) cpSync(resolve(root, `src/messages/${l}.json`), resolve(php, `app/messages/${l}.json`));

console.log("Build PHP terminé.");
