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
  // Images des îlots React (bac, camionnette…) : srcSet produit par le shim next/image
  { dir: "bac", widths: WIDTHS, island: true },
  { dir: "objets", widths: WIDTHS, island: true },
  { dir: "centre", widths: [640, 960, 1280] },
  // Affichée sur 176 px CSS (w-44) : une seule version WebP à ~2,8x ; 500 px garde
  // exactement le rapport 1600×1392 (500×435), donc la même hauteur affichée.
  { file: "liste-matieres.png", widths: [500] }
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

/**
 * Surcharges PHP (php/js/overrides/) : copies de composants de src/components/home
 * optimisées pour la version PHP seulement (src/ est partagé avec le site Next.js).
 * Tout import qui vise l'original (« @/components/home/Hero », « ./HeroDevices »…) est
 * redirigé vers la copie ; les autres imports relatifs des copies (./HeroCopy…)
 * continuent de résoudre dans src/components/home.
 */
const homeDir = resolve(root, "src/components/home");
const ovDir = resolve(php, "js/overrides");
const OVERRIDES = new Map(
  readdirSync(ovDir).filter((f) => /\.tsx?$/.test(f)).map((f) => [f.replace(/\.tsx?$/, ""), resolve(ovDir, f)])
);
const overridesPlugin = {
  name: "php-overrides",
  setup(b) {
    b.onResolve({ filter: /^(\.{1,2}\/|@\/components\/home\/)/ }, async (args) => {
      if (args.pluginData?.ovSkip) return;
      const fromOv = !!args.importer && resolve(args.importer, "..") === ovDir;
      const target = args.path.startsWith("@/")
        ? resolve(homeDir, args.path.slice("@/components/home/".length))
        : resolve(fromOv ? homeDir : args.resolveDir, args.path);
      if (resolve(target, "..") === homeDir) {
        const ov = OVERRIDES.get(target.slice(homeDir.length + 1).replace(/\.tsx?$/, ""));
        if (ov) return { path: ov };
      }
      if (!fromOv) return;
      const r = await b.resolve(args.path, { kind: args.kind, resolveDir: homeDir, importer: args.importer, pluginData: { ovSkip: true } });
      return r.errors.length ? { errors: r.errors } : { path: r.path, external: r.external, sideEffects: r.sideEffects };
    });
  }
};

const result = await build({
  plugins: [overridesPlugin],
  entryPoints: { site: resolve(php, "js/site.ts"), islands: resolve(php, "js/islands.tsx") },
  metafile: true,
  outdir: out,
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  target: ["es2020"],
  jsx: "automatic",
  chunkNames: "chunks/[name]-[hash]",
  define: { "process.env.NODE_ENV": '"production"', __IMG_VARIANTS__: JSON.stringify(islandManifest) },
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

// Chunks orphelins : esbuild émet hls-* et vision_bundle-* (imports dynamiques de drei
// éliminés), mais aucun fichier ne les charge. On ne les supprime que si aucun fichier
// de assets/ ne contient leur nom.
{
  const files = walk(out);
  const orphans = files.filter((f) => /[\\/](hls|vision_bundle)-[A-Z0-9]+\.js$/.test(f));
  const unused = orphans.filter((f) => {
    const name = f.split(/[\\/]/).pop();
    const used = files.some((g) => g !== f && readFileSync(g, "latin1").includes(name));
    if (used) console.log(`Chunk ${name} référencé : conservé.`);
    return !used;
  });
  for (const f of unused) rmSync(f);
}

/**
 * Manifeste de préchargement (assets/modules.json) pour <link rel="modulepreload"> :
 *  - islands : chunks importés statiquement par islands.js (React DOM…) ;
 *  - <Îlot>  : chunk du composant (import dynamique dans islands.tsx) + ses imports statiques.
 * Les imports dynamiques internes (ex. HeroDevices, la 3D) ne sont pas suivis.
 */
{
  const outputs = result.metafile.outputs;
  // Chemins du metafile : relatifs au dossier de travail d'esbuild (process.cwd())
  const rel = (p) => relative(out, resolve(process.cwd(), p)).replace(/\\/g, "/");
  const key = Object.fromEntries(Object.keys(outputs).map((k) => [rel(k), k]));
  const staticDeps = (file, seen = new Set()) => {
    for (const imp of outputs[key[file]]?.imports ?? []) {
      if (imp.kind !== "import-statement" || imp.external) continue;
      const f = rel(imp.path);
      if (!seen.has(f)) { seen.add(f); staticDeps(f, seen); }
    }
    return seen;
  };
  const modules = { islands: [...staticDeps("islands.js")] };
  for (const imp of outputs[key["islands.js"]].imports) {
    if (imp.kind !== "dynamic-import") continue;
    const f = rel(imp.path);
    const entry = outputs[key[f]]?.entryPoint;
    if (!entry) continue;
    const name = entry.split("/").pop().replace(/\.[jt]sx?$/, "");
    modules[name] = [f, ...staticDeps(f)].filter((d) => !modules.islands.includes(d));
  }
  writeFileSync(resolve(out, "modules.json"), JSON.stringify(modules));
}

execSync(`npx tailwindcss -i "${resolve(php, "css/app.css")}" -o "${resolve(out, "app.css")}" --minify`, {
  cwd: root,
  stdio: "inherit",
  shell: true
});

console.log("Build PHP terminé.");
