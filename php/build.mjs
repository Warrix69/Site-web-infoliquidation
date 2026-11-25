/**
 * Compile la version PHP :
 *  - assets/site.js     : comportements communs (vanilla + Lenis)
 *  - assets/islands.js  : sections interactives React (héros 3D, bac, formulaires…)
 *  - assets/app.css     : Tailwind (globals.css du site + ajouts PHP)
 *  - copie public/ (images, modèles 3D, admin) et les messages FR/EN
 * Usage : node php/build.mjs   (depuis la racine du projet)
 */
import { build } from "esbuild";
import sharp from "sharp";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const php = resolve(root, "php");
const out = resolve(php, "public/assets");
const shim = (f) => resolve(php, "js/shims", f);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Fichiers statiques et textes
for (const dir of ["images", "models", "admin"]) {
  cpSync(resolve(root, "public", dir), resolve(php, "public", dir), { recursive: true });
}
for (const f of ["logo.png", "favicon-logo.png"]) cpSync(resolve(root, "public", f), resolve(php, "public", f));
cpSync(resolve(root, "src/app/icon.png"), resolve(php, "public/icon.png"));
mkdirSync(resolve(php, "app/messages"), { recursive: true });
for (const l of ["fr", "en"]) cpSync(resolve(root, `src/messages/${l}.json`), resolve(php, `app/messages/${l}.json`));

/**
 * Variantes de largeur des images (srcset), générées après la copie de public/images.
 * Nom : /images/_w/<chemin sans extension>-<largeur>-<empreinte du fichier source>.webp
 * (l'empreinte change si l'image source change : pas de vieux cache « immutable »).
 * Manifeste : { "/images/bac/portable.webp": [largeur, hauteur, empreinte, [largeurs…]] }
 *  - assets/images.json pour PHP (page_hero, matières recyclables) ;
 *  - __IMG_VARIANTS__ injecté dans le shim next/image (îlots : bac/*, objets/*).
 */
const imgDir = resolve(php, "public/images");
const varDir = resolve(imgDir, "_w");
const WIDTHS = [160, 320, 480, 640, 960, 1280];
const VARIANTS = [
  { dir: "centre", widths: [640, 960, 1280] }
];
const imgManifest = {};
const islandManifest = {};
const keep = new Set();
mkdirSync(varDir, { recursive: true });
for (const v of VARIANTS) {
  const files = v.file ? [v.file] : readdirSync(resolve(imgDir, v.dir)).map((f) => `${v.dir}/${f}`);
  for (const rel of files) {
    const srcPath = resolve(imgDir, rel);
    if (!statSync(srcPath).isFile() || !/\.(webp|png|jpe?g)$/i.test(rel)) continue;
    const buf = readFileSync(srcPath);
    const meta = await sharp(buf).metadata();
    // Une variante ne sert que si elle est nettement plus petite que l'original
    const widths = v.widths.filter((w) => w <= meta.width * 0.85);
    if (!widths.length) continue;
    const hash = createHash("md5").update(buf).digest("hex").slice(0, 8);
    for (const w of widths) {
      const dest = resolve(varDir, `${rel.replace(/\.[a-z]+$/i, "")}-${w}-${hash}.webp`);
      keep.add(dest);
      if (existsSync(dest)) continue;
      mkdirSync(resolve(dest, ".."), { recursive: true });
      await sharp(buf)
        .resize({ width: w })
        .webp({ quality: meta.hasAlpha ? 90 : 85, effort: 6 })
        .toFile(dest);
    }
    const entry = [meta.width, meta.height, hash, widths];
    imgManifest[`/images/${rel}`] = entry;
    if (v.island) islandManifest[`/images/${rel}`] = entry;
  }
}
// Variantes périmées (image source modifiée ou retirée)
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(resolve(d, e.name)) : [resolve(d, e.name)]));
for (const f of walk(varDir)) if (!keep.has(f)) rmSync(f);
writeFileSync(resolve(out, "images.json"), JSON.stringify(imgManifest));
console.log(`Variantes d'images : ${keep.size} fichiers (${relative(root, varDir)})`);

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

console.log("Build PHP terminé.");
