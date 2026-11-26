// Génère les tableaux Markdown à partir des JSON bruts.
// Usage : node php/perf-audit/scripts/make-tables.mjs [tag]   -> raw/<tag>-tables.md
import fs from "node:fs";
import path from "node:path";
import { OUT } from "./common.mjs";

const tag = process.argv[2] || "baseline";
const load = (n) => { const f = path.join(OUT, `${tag}-${n}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const ms = (v) => (v == null ? "—" : `${Math.round(v)}`);
const s = (v) => (v == null ? "—" : (v / 1000).toFixed(2) + " s");
const ko = (b) => (b == null ? "—" : (b / 1024).toFixed(1));
const L = [];
const row = (a) => L.push("| " + a.join(" | ") + " |");
const head = (a) => { row(a); row(a.map(() => "---")); };

// 1. Lighthouse
const lh = load("lighthouse-summary");
if (lh) {
  for (const form of ["mobile", "desktop"]) {
    L.push(`\n### Lighthouse ${form}\n`);
    head(["Page", "Score", "FCP", "LCP", "TBT (ms)", "CLS", "Speed Index", "Passes", "Élément LCP"]);
    for (const [k, v] of Object.entries(lh)) {
      if (v.form !== form) continue;
      const m = v.median; const n = v.runs.filter((r) => r.score != null).length;
      if (!n) { row([v.page, "échec", "", "", "", "", "", "0", ""]); continue; }
      const rng = (key, f) => (n > 1 ? ` (${f(m[key + "Range"][0])}–${f(m[key + "Range"][1])})` : "");
      row([`\`${v.page.length > 30 ? v.page.slice(0, 30) + "…" : v.page}\``, m.score + rng("score", (x) => x), s(m.fcp) + rng("fcp", s), s(m.lcp) + rng("lcp", s),
        ms(m.tbt) + rng("tbt", ms), m.cls.toFixed(3) + rng("cls", (x) => x.toFixed(3)), s(m.si) + rng("si", s), n > 1 ? `médiane de ${n}` : "1",
        "`" + (m.lcpSelector || "?").replace(/\|/g, "/").slice(-60) + "`"]);
    }
  }
}

// 2. Poids
const w = load("weight");
if (w) {
  for (const prof of ["desktop", "mobile"]) {
    L.push(`\n### Poids par page — ${prof} (Ko ; brut / gzip estimé ; « +défil. » = chargé après défilement complet)\n`);
    head(["Page", "HTML gz", "JS brut", "JS gzip", "dont JS tiers gzip", "JS +défil. gzip", "CSS gzip", "Images (initial)", "Images +défil.", "Polices", "Média +défil.", "Requêtes init / +défil."]);
    for (const [k, v] of Object.entries(w.pages)) {
      const t = v[prof]?.totals; if (!t) continue;
      const cnt = (ph) => Object.values(t[ph]).reduce((a, b) => a + b.count, 0);
      row([`\`${v.path.slice(0, 30)}\``, ko(t.initial.doc.gzip), ko(t.initial.js.raw), ko(t.initial.js.gzip), ko((v[prof].requests || []).filter((r) => r.type === "script" && /^https?:/.test(r.url)).reduce((a, r) => a + (r.gzip || 0), 0)), ko(t.scroll.js.gzip), ko(t.initial.css.gzip),
        ko(t.initial.img.raw), ko(t.scroll.img.raw), ko(t.initial.font.raw + t.scroll.font.raw), ko(t.initial.media.raw + t.scroll.media.raw), `${cnt("initial")} / ${cnt("scroll")}`]);
    }
    L.push(`\nChunks de \`assets/chunks/\` chargés (${prof}) :\n`);
    head(["Page", "Chunks (i = initial, s = après défilement)"]);
    for (const [k, v] of Object.entries(w.pages)) {
      const c = v[prof]?.chunks || [];
      row([`\`${v.path.slice(0, 30)}\``, c.length ? c.map((x) => `${x.file.startsWith("chunk-") ? x.file.replace(/\.js$/, "") : x.file.replace(/-[A-Z0-9]{8}\.js$/, "")}${x.phase === "initial" ? "ⁱ" : "ˢ"} (${ko(x.gzip)})`).join(", ") : "aucun"]);
    }
  }
  L.push("\n### Taille des fichiers du build mesuré (Ko)\n");
  head(["Fichier", "Brut", "Gzip (niv. 6)", "md5"]);
  for (const [f, v] of Object.entries(w.build).sort((a, b) => b[1].raw - a[1].raw)) row([`\`${f}\``, ko(v.raw), ko(v.gzip), v.md5]);
}

// 3. Défilement
const sc = load("scroll");
if (sc) {
  for (const grp of [["Desktop", (c) => !c.mobile], ["Mobile", (c) => c.mobile]]) {
    L.push(`\n### Défilement — ${grp[0]} (frame manquée = intervalle > ${sc.jankThresholdMs} ms)\n`);
    head(["Page", "Config", "fps moy.", "% > 16,7", "% > 33", "p95 (ms)", "Pire frame (ms)", "Long Tasks (nb / total / max ms)", "Chargement (ms)"]);
    for (const [id, r] of Object.entries(sc.runs)) {
      if (!grp[1](r.cfg)) continue;
      if (r.error) { row([`\`${r.page}\``, r.cfg.id, "ERREUR", r.error.slice(0, 60), "", "", "", "", ""]); continue; }
      row([`\`${r.page}\``, r.cfg.id, r.fps, r.pctOver16, r.pctOver33, r.p95Ms, r.worstMs, `${r.longTasks} / ${r.longTaskTotalMs} / ${r.longTaskMaxMs}`, r.loadMs]);
    }
  }
  L.push("\n### Défilement — sections les plus saccadées (% frames > seuil, par config, sections ≥ 10 frames)\n");
  head(["Page / config", "Section (plage scrollY)", "Frames", "% > 16,7", "% > 33", "Pire (ms)", "Long Tasks"]);
  for (const [id, r] of Object.entries(sc.runs)) {
    if (r.error) continue;
    const secs = Object.entries(r.perSection).filter(([, v]) => v.frames >= 10).map(([k, v]) => ({ k, ...v, pct: (100 * v.jank) / v.frames }))
      .sort((a, b) => b.pct - a.pct).slice(0, 3);
    for (const x of secs) if (x.pct >= 5 || x.longTasks) row([id.replace("|", " / "), `${x.k} (${x.range ? x.range.join("–") : "?"})`, x.frames, x.pct.toFixed(0), ((100 * x.jank33) / x.frames).toFixed(0), x.worst, `${x.longTasks} (${x.longTaskMs} ms)`]);
  }
}

// 4. Interactions
const it = load("interactions");
if (it) {
  L.push("\n### Navigation : du clic sur l'accueil à la page suivante (ms)\n");
  head(["Profil", "Lien", "Clic → début nav.", "Clic → TTFB", "Clic → FCP", "Clic → LCP", "Clic → load"]);
  for (const [p, arr] of Object.entries(it.nav)) for (const r of arr) row([p, `\`${r.href}\``, ...(r.error ? ["ERREUR " + r.error.slice(0, 50), "", "", "", ""] : [r.clickToNavStart, r.clickToTTFB, r.clickToFCP, r.clickToLCP, r.clickToLoad])]);
  L.push("\n### Latence d'interaction (Event Timing, seuil 16 ms ; « < 16 » = aucune entrée ≥ 16 ms)\n");
  head(["Profil", "Interaction", "Échantillons (ms)", "Max (≈ INP)"]);
  const f = (v) => (v == null ? "< 16" : Math.round(v));
  for (const [p, res] of Object.entries(it.interactions)) {
    for (const [k, v] of Object.entries(res)) {
      if (v.samples) row([p, k, v.samples.map(f).join(", "), f(v.max)]);
      else row([p, k + " (focus / frappe)", `focus ${f(v.focusMax)} ; frappe ${f(v.typingMax)} (${v.typingEntries} entrées)`, f(Math.max(v.focusMax ?? 0, v.typingMax ?? 0) || null)]);
    }
  }
}

// 5. WebKit
const wk = load("webkit");
if (wk) {
  L.push(`\n### WebKit (Playwright Windows, profil ${wk.device}) — PAS Safari iOS\n`);
  if (wk.error) L.push(wk.error);
  else {
    head(["Page", "fps moy.", "% > 16,7", "% > 33", "Pire (ms)", "Chargement (ms)"]);
    for (const [k, r] of Object.entries(wk.runs)) row([`\`${r.page || k}\``, ...(r.error ? ["ERREUR", "", "", "", ""] : [r.fps, r.pctOver16, r.pctOver33, r.worstMs, r.loadMs])]);
  }
}

const f = path.join(OUT, `${tag}-tables.md`);
fs.writeFileSync(f, L.join("\n") + "\n");
console.log("OK", f);
