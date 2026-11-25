/**
 * Compile la version PHP :
 *  - assets/site.js     : comportements communs (vanilla + Lenis)
 *  - assets/islands.js  : sections interactives React (héros 3D, bac, formulaires…)
 *  - assets/app.css     : Tailwind (globals.css du site + ajouts PHP)
 *  - assets/fonts/      : polices Google auto-hébergées (Loi 25 : pas d'IP de visiteur chez Google)
 *  - assets/hdr/        : éclairages HDR de la 3D auto-hébergés (au lieu de raw.githack.com)
 *  - copie public/ (images, modèles 3D) et les messages FR/EN
 *  - copie les pages admin dans app/views/admin/ (hors de la racine web, servies par PHP après la session)
 * Les polices et HDR sont téléchargés une seule fois dans php/third-party/ (à garder dans git),
 * puis copiés à chaque build.
 * Usage : node php/build.mjs   (depuis la racine du projet)
 */
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const php = resolve(root, "php");
const out = resolve(php, "public/assets");
const vendor = resolve(php, "third-party");
const shim = (f) => resolve(php, "js/shims", f);

/* ---------- Ressources tierces auto-hébergées ---------- */

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap";
// Navigateur récent : Google renvoie alors des fichiers woff2
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
// Même dépôt et même version que ceux de @react-three/drei (useEnvironment.js, CUBEMAP_ROOT)
const HDR_BASE = "https://raw.githack.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/";
// Préréglages utilisés : « studio » (HeroScene) et « apartment » (HeroLaptop)
const HDR_FILES = ["studio_small_03_1k.hdr", "lebombo_1k.hdr"];
const HDR_MAX_BYTES = 5 * 1024 * 1024;

async function download(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}) : ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function vendorFonts() {
  const dir = resolve(vendor, "fonts");
  const cssFile = resolve(dir, "fonts.css");
  if (!existsSync(cssFile)) {
    mkdirSync(dir, { recursive: true });
    let css = (await download(FONTS_URL, { "User-Agent": BROWSER_UA })).toString("utf8");
    const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) ?? [])];
    if (!urls.length) throw new Error("Aucune police trouvée dans la réponse de Google Fonts");
    for (const u of urls) {
      // /s/<famille>/<version>/<fichier>.woff2 → <famille>-<fichier>.woff2
      const parts = new URL(u).pathname.split("/").filter(Boolean);
      const name = `${parts[1]}-${parts[parts.length - 1]}`;
      if (!/^[A-Za-z0-9_.-]+\.woff2$/.test(name)) throw new Error(`Nom de police inattendu : ${u}`);
      writeFileSync(resolve(dir, name), await download(u));
      css = css.split(u).join(name);
    }
    writeFileSync(cssFile, `/* Polices Google auto-hébergées, générées par php/build.mjs depuis :\n   ${FONTS_URL} */\n${css}`);
    console.log(`Polices téléchargées : ${urls.length} fichiers.`);
  }
  cpSync(dir, resolve(out, "fonts"), { recursive: true });
}

async function vendorHdr() {
  const dir = resolve(vendor, "hdr");
  mkdirSync(dir, { recursive: true });
  for (const f of HDR_FILES) {
    const file = resolve(dir, f);
    if (!existsSync(file)) {
      writeFileSync(file, await download(HDR_BASE + f));
      console.log(`HDR téléchargé : ${f}`);
    }
    if (statSync(file).size > HDR_MAX_BYTES) throw new Error(`HDR trop gros (> 5 Mo) : ${f}`);
  }
  cpSync(dir, resolve(out, "hdr"), { recursive: true });
}

/** Remplace l'adresse raw.githack.com de drei par /assets/hdr/ au moment du bundle. */
const selfHostedHdr = {
  name: "self-hosted-hdr",
  setup(b) {
    b.onLoad({ filter: /[\\/]@react-three[\\/]drei[\\/].*\.js$/ }, (args) => {
      const src = readFileSync(args.path, "utf8");
      if (!src.includes(HDR_BASE)) return undefined;
      return { contents: src.split(HDR_BASE).join("/assets/hdr/"), loader: "js" };
    });
  }
};

/* ---------- Compilation ---------- */

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
  plugins: [selfHostedHdr],
  loader: { ".glb": "file", ".png": "file", ".webp": "file", ".jpg": "file" },
  logLevel: "info"
});

// Garde-fou : plus aucune ressource chargée depuis raw.githack.com
for (const f of readdirSync(resolve(out, "chunks")).map((n) => resolve(out, "chunks", n)).concat([resolve(out, "islands.js"), resolve(out, "site.js")])) {
  if (f.endsWith(".js") && readFileSync(f, "utf8").includes("raw.githack.com")) {
    throw new Error(`raw.githack.com encore présent dans ${f}`);
  }
}

execSync(`npx tailwindcss -i "${resolve(php, "css/app.css")}" -o "${resolve(out, "app.css")}" --minify`, {
  cwd: root,
  stdio: "inherit",
  shell: true
});

await vendorFonts();
await vendorHdr();

// Fichiers statiques et textes
for (const dir of ["images", "models"]) {
  cpSync(resolve(root, "public", dir), resolve(php, "public", dir), { recursive: true });
}
for (const f of ["logo.png", "favicon-logo.png"]) cpSync(resolve(root, "public", f), resolve(php, "public", f));
cpSync(resolve(root, "src/app/icon.png"), resolve(php, "public/icon.png"));
mkdirSync(resolve(php, "app/messages"), { recursive: true });
for (const l of ["fr", "en"]) cpSync(resolve(root, `src/messages/${l}.json`), resolve(php, `app/messages/${l}.json`));

// Admin : hors de la racine web (app/views/admin/), servi par index.php après la vérification de session
const adminViews = resolve(php, "app/views/admin");
rmSync(adminViews, { recursive: true, force: true });
cpSync(resolve(root, "public/admin"), adminViews, { recursive: true });
// Admin : polices Google remplacées par les polices auto-hébergées (Loi 25)
for (const f of readdirSync(adminViews).filter((n) => n.endsWith(".html"))) {
  const file = resolve(adminViews, f);
  const html = readFileSync(file, "utf8")
    .replace(/<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\s*/g, "")
    .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/[^"]*">/g, '<link rel="stylesheet" href="/assets/fonts/fonts.css">');
  if (/fonts\.(googleapis|gstatic)\.com/.test(html)) throw new Error(`Police Google restante dans admin/${f}`);
  writeFileSync(file, html);
}
// Ancienne copie dans la racine web : supprimée pour qu'elle ne soit jamais servie sans session
rmSync(resolve(php, "public/admin"), { recursive: true, force: true });

console.log("Build PHP terminé.");
