// Génère app/lib/icons.php à partir de lucide-react (icônes utilisées par le site).
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../..");
const names = "AlertCircle AlertTriangle ArrowLeft ArrowRight ArrowUpRight Award BatteryCharging Briefcase Building2 Cable CalendarCheck CalendarDays Check CheckCircle2 ChevronDown CircleSlash ClipboardList Clock Cpu Facebook Hammer Info Leaf Loader2 Mail MapPin Menu Minus Monitor Navigation Package PackageSearch Phone PhoneCall Plus Recycle RotateCcw Scissors Send Shield ShieldCheck Smartphone Sparkles Trash2 Truck Tv User UserRound Users X".split(" ");
const kebab = (n) => n.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Za-z])([0-9])/g, "$1-$2").toLowerCase();
let out = "<?php\n// Fichier généré par tools/gen-icons.mjs — ne pas modifier à la main.\nconst ICONS = [\n";
for (const n of names) {
  const file = `${root}/node_modules/lucide-react/dist/esm/icons/${kebab(n)}.js`;
  let f = file;
  const src = readFileSync(f, "utf8");
  const alias = src.match(/from '\.\/([a-z0-9-]+\.js)'/);
  if (alias && !src.includes("__iconNode")) f = `${root}/node_modules/lucide-react/dist/esm/icons/${alias[1]}`;
  const mod = await import(pathToFileURL(f).href);
  const inner = mod.__iconNode.map(([tag, attrs]) => {
    const a = Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ");
    return `<${tag} ${a}/>`;
  }).join("");
  out += `  '${n}' => '${inner.replace(/'/g, "\'")}',\n`;
}
out += "];\n";
writeFileSync(`${root}/php/app/lib/icons.php`, out);
console.log("ok", names.length);
