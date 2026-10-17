// Builds every page of the prototype, in French and English, from the site's real content
// (src/messages/fr.json and en.json). Shared chrome (top bar, nav, footer, pickup form) lives
// here once; index.src.html is the home page with {{key}} placeholders filled per language
// from home.i18n.json.
// Run: node build.mjs   (from this folder)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MSG = {
  fr: JSON.parse(fs.readFileSync(path.join(ROOT, "../../../src/messages/fr.json"), "utf8")),
  en: JSON.parse(fs.readFileSync(path.join(ROOT, "../../../src/messages/en.json"), "utf8")),
};

/* ------------------------------------------------------------- routes */
const ROUTES = {
  home: ["/", "/en/"], about: ["/a-propos/", "/en/about/"], informations: ["/informations/", "/en/information/"],
  computer: ["/recyclage-ordinateur/", "/en/computer-recycling/"], pickupForm: ["/formulaire-de-ramassage/", "/en/pick-up-form/"],
  data: ["/destruction-des-donnees/", "/en/data-destruction/"], materials: ["/matieres-recyclables/", "/en/recyclable-materials/"],
  procedure: ["/procedure-de-recuperation/", "/en/recovery-procedure/"], hardDrives: ["/destruction-des-disques-durs/", "/en/hard-drive-destruction/"],
  phones: ["/recyclage-telephones/", "/en/phone-recycling/"], faq: ["/faq/", "/en/faq/"], blog: ["/blog/", "/en/blog/"],
  contact: ["/contact/", "/en/contact/"], cookies: ["/politique-de-temoins/", "/en/cookie-policy/"],
};
const R = (key, lang) => ROUTES[key][lang === "fr" ? 0 : 1];
const SVC_KEYS = ["computer", "pickupForm", "data", "materials", "procedure", "hardDrives", "phones"];

/* ------------------------------------------- interface strings we wrote */
const UI = {
  fr: {
    htmlLang: "fr", cta: "Demander un ramassage", navCta: "Ramassage gratuit", call: "Appeler le", home: "accueil",
    mobileMenu: "Menu mobile", footBanner: "Service de ramassage <b>gratuit</b> · Grand Montréal",
    cookiesLink: "Politique de témoins", province: "(Québec)", formH: "Formulaire de demande de <span class=\"ink\">ramassage</span>",
    formSub: "Réponse en <b>24 h</b>, ramassage en <b>72 h max.</b>", identitySub: "Prénom, nom, courriel et adresse de ramassage.",
    optional: "FACULTATIF", totalLabel: "TOTAL D'ITEMS", minLabel: "/ min. 10", left: "Encore 10",
    certSub: "Preuve de destruction des données, sans frais.", checkFields: "Vérifiez les champs indiqués en rouge.",
    protoForm: "Prototype : le formulaire est valide. L'envoi vers info@infoliquidationrecycle.com sera branché lors de l'intégration au site. Rien n'a été envoyé.",
    protoContact: "Prototype : le message est valide. L'envoi sera branché lors de l'intégration au site. Rien n'a été envoyé.",
    faqTitle: "Les questions les plus fréquentes", contactLead: "Une question sur un ramassage, une destruction de données ou un certificat ? Nous répondons dans un délai de 24 heures.",
    contactSub: "Réponse dans un délai de 24 heures.", contactDesc: "Coordonnées et formulaire de contact d'Info Liquidation Recycle à Saint-Eustache.",
    altCart: "Chariot chargé d'écrans et d'ordinateurs prêt pour le ramassage", altKnoll: "Matériel informatique usagé : portable, écran, serveur, imprimante, téléphone",
    altLaptops: "Pile d'ordinateurs portables usagés à recycler", altDrive: "Intérieur d'un disque dur ouvert : plateau et bras de lecture",
    altTablet: "Tablette usagée", altPhone: "Téléphone cellulaire usagé", articleNote: "",
    js: {
      dec: "Diminuer", inc: "Augmenter", equip: "Équipement", equipPh: "Équipement (ex. fax, câbles…)", qty: "Quantité", remove: "Retirer cet équipement",
      ok: "Admissible, sans frais", leftPre: "Encore ", leftPost: "", items: "items", item: "item", open: "Ouvrir le menu", close: "Fermer le menu",
      line: "Chaque appareil a une seconde vie.", formN: "Formulaire", total: "Total", req: "Demande", ans: "Réponse", locale: "fr-CA",
      st: ["intact", "déchiqueté", "en copeaux", "irrécupérable"],
    },
  },
  en: {
    htmlLang: "en", cta: "Request a pick-up", navCta: "Free pick-up", call: "Call", home: "home",
    mobileMenu: "Mobile menu", footBanner: "<b>Free</b> pick-up service · Greater Montreal",
    cookiesLink: "Cookie policy", province: "(Quebec)", formH: "Pick-up request <span class=\"ink\">form</span>",
    formSub: "Answer within <b>24 h</b>, pick-up within <b>72 h max.</b>", identitySub: "First name, last name, email and pick-up address.",
    optional: "OPTIONAL", totalLabel: "TOTAL ITEMS", minLabel: "/ min. 10", left: "10 to go",
    certSub: "Proof that your data was destroyed, free of charge.", checkFields: "Check the fields marked in red.",
    protoForm: "Prototype: the form is valid. Sending to info@infoliquidationrecycle.com will be connected when the site is integrated. Nothing was sent.",
    protoContact: "Prototype: the message is valid. Sending will be connected when the site is integrated. Nothing was sent.",
    faqTitle: "Most frequently asked questions", contactLead: "A question about a pick-up, data destruction or a certificate? We answer within 24 hours.",
    contactSub: "We answer within 24 hours.", contactDesc: "Contact details and contact form for Info Liquidation Recycle in Saint-Eustache.",
    altCart: "Cart loaded with monitors and computers ready for pick-up", altKnoll: "Used computer equipment: laptop, monitor, server, printer, phone",
    altLaptops: "Stack of used laptops to recycle", altDrive: "Inside of an open hard drive: platter and read arm",
    altTablet: "Used tablet", altPhone: "Used cell phone", articleNote: "The full article is available in French for now.",
    js: {
      dec: "Decrease", inc: "Increase", equip: "Equipment", equipPh: "Equipment (e.g. fax, cables…)", qty: "Quantity", remove: "Remove this equipment",
      ok: "Eligible, free of charge", leftPre: "", leftPost: " to go", items: "items", item: "item", open: "Open menu", close: "Close menu",
      line: "Every device gets a second life.", formN: "Form", total: "Total", req: "Request", ans: "Answer", locale: "en-CA",
      st: ["intact", "shredded", "in chips", "unrecoverable"],
    },
  },
};

/* ---------------------------------------------------------------- helpers */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// No em dash anywhere visible: short strings get a middle dot, prose gets a comma.
const t = (s) => esc(String(s).length < 70 ? String(s).replace(/\s*—\s*/g, " · ") : String(s).replace(/\s*—\s*/g, ", "));
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const ICON = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-10 6L2 7"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>',
};
const cta = (href, label, cls = "") => `<a class="cta ${cls}" href="${href}"><span>${label}</span>${ARROW}</a>`;
const svcTitle = (M, k) => { const v = M.services[k]; return typeof v === "string" ? v : v.title; };
const CITIES = {
  fr: { "Grand Montréal": ["Montréal", "Laval", "Ville Saint-Laurent", "Lachine", "LaSalle", "Dorval", "Kirkland", "Côte-Saint-Luc"], "Rive-Nord": ["Saint-Eustache", "Boisbriand", "Blainville", "Sainte-Thérèse", "Mirabel", "Terrebonne", "Mascouche", "Saint-Jérôme", "Repentigny"], "Rive-Sud": ["Longueuil", "Brossard"] },
  en: { "Greater Montreal": ["Montreal", "Laval", "Saint-Laurent", "Lachine", "LaSalle", "Dorval", "Kirkland", "Côte-Saint-Luc"], "North Shore": ["Saint-Eustache", "Boisbriand", "Blainville", "Sainte-Thérèse", "Mirabel", "Terrebonne", "Mascouche", "Saint-Jérôme", "Repentigny"], "South Shore": ["Longueuil", "Brossard"] },
};

/* ----------------------------------------------------------------- chrome */
function chrome(M, L, lang, active, alt) {
  const cur = (k) => (k === active ? ' aria-current="page"' : "");
  const NAV = [["home", M.nav.home], ["about", M.nav.about], ["informations", M.nav.informations]];
  const NAV2 = [["faq", M.nav.faq], ["blog", M.nav.blog], ["contact", M.nav.contact]];
  const link = ([k, l]) => `<a href="${R(k, lang)}"${cur(k)}>${t(l)}</a>`;
  const svcLinks = SVC_KEYS.map((k) => `<a href="${R(k, lang)}"${cur(k)}>${t(svcTitle(M, k))}</a>`);
  const svcCur = SVC_KEYS.includes(active);
  return `<div class="chrome" id="chrome">
  <div class="topbar">
    <div class="topbar__in">
      <a class="topbar__phone" href="tel:4504734636" aria-label="${L.call} (450) 473-4636">${ICON.phone}(450) 473-4636</a>
      <p class="topbar__msg">${t(M.topbar.message)}</p>
      <div class="lang" role="group" aria-label="${t(M.nav.langSwitchLabel)}">
        <a href="${alt.fr}" hreflang="fr" lang="fr"${lang === "fr" ? ' aria-current="true"' : ""}>FR</a><a href="${alt.en}" hreflang="en" lang="en"${lang === "en" ? ' aria-current="true"' : ""}>EN</a>
      </div>
    </div>
  </div>
  <header class="bar" id="bar">
    <div class="bar__in">
      <a class="bar__logo" href="${R("home", lang)}" aria-label="Info Liquidation Recycle, ${L.home}"><img src="/assets/logo.png" width="338" height="80" alt="Info Liquidation Recycle"></a>
      <nav class="bar__nav" aria-label="${t(M.nav.mainNavLabel)}">
        ${NAV.map(link).join("\n        ")}
        <div class="bar__svc${svcCur ? " current" : ""}" id="svc">
          <button type="button" aria-expanded="false" aria-controls="svc-menu">${t(M.nav.services)} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
          <div class="bar__menu" id="svc-menu">${svcLinks.join("")}</div>
        </div>
        ${NAV2.map(link).join("\n        ")}
      </nav>
      <a class="bar__cta" href="${R("pickupForm", lang)}">${L.navCta}</a>
      <button type="button" class="bar__burger" id="burger" aria-expanded="false" aria-controls="drawer" aria-label="${t(M.nav.openMenu)}"><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i></button>
    </div>
  </header>
</div>
<nav class="drawer" id="drawer" aria-label="${L.mobileMenu}">
  ${NAV.map(link).join("\n  ")}
  <span class="mono">${t(M.nav.services)}</span>
  <div class="drawer__svc">${svcLinks.join("")}</div>
  ${NAV2.map(link).join("\n  ")}
  ${cta(R("pickupForm", lang), L.cta, "cta--block")}
</nav>`;
}

function footer(M, L, lang) {
  const F = M.footer, C = M.common;
  const all = [["home", M.nav.home], ["about", M.nav.about], ["informations", M.nav.informations], ["faq", M.nav.faq], ["blog", M.nav.blog], ["contact", M.nav.contact]];
  return `<footer class="foot">
  <div class="wrap">
    <div class="foot__banner"><p>${L.footBanner}</p>${cta(R("pickupForm", lang), L.cta)}</div>
    <div class="foot__cols">
      <div>
        <a class="foot__logo" href="${R("home", lang)}"><img src="/assets/logo.png" width="338" height="80" alt="Info Liquidation Recycle"></a>
        <p class="foot__about">${t(F.aboutText)}</p>
        <ul style="margin-top:1rem"><li><a href="https://www.facebook.com/InfoLiquidationRecycle/" rel="noopener" target="_blank">${t(F.facebookLabel)}</a></li></ul>
      </div>
      <div><h4>${t(F.navTitle)}</h4><ul>${all.map(([k, l]) => `<li><a href="${R(k, lang)}">${t(l)}</a></li>`).join("")}</ul></div>
      <div><h4>${t(F.servicesTitle)}</h4><ul>${SVC_KEYS.map((k) => `<li><a href="${R(k, lang)}">${t(svcTitle(M, k))}</a></li>`).join("")}</ul></div>
      <div><h4>${t(F.contactTitle)}</h4><ul>
        <li><a href="tel:4504734636">(450) 473-4636</a></li>
        <li><a href="mailto:info@infoliquidationrecycle.com">info@infoliquidationrecycle.com</a></li>
        <li><a href="https://g.page/InfoLiquidationRecycle?share" rel="noopener" target="_blank">514, chemin de la Rivière Sud, local 102<br>Saint-Eustache ${L.province} J7R 0E2</a></li>
        <li>${t(C.hoursMonThu)}<br>${t(C.hoursFri)}<br>${t(C.hoursWeekend)}</li>
      </ul></div>
    </div>
    <div class="foot__legal"><span>${t(F.copyright)}</span><a href="${R("cookies", lang)}">${L.cookiesLink}</a></div>
  </div>
</footer>`;
}

function pickupForm(M, L, lang, level = "h2") {
  const P = M.pickup, Q = P.quantities;
  const keys = ["towers", "servers", "laptops", "tablets", "switches", "lcd", "deskPhones", "cellphones", "printers", "photocopiers", "audioVideo", "ups"];
  const fld = (k, id, type, ac, full) => `<div class="f${full ? " f--full" : ""}" data-f="${k}"><label for="${id}">${t(P.fields[k])} <i>*</i></label><input id="${id}" name="${k}" type="${type}" autocomplete="${ac}"><span class="f__e">${t(P.errors[k + (k === "email" || k === "postalCode" ? "Invalid" : "Required")])}</span></div>`;
  return `<section class="pk ground ground--paper" id="formulaire" aria-labelledby="h-form">
  <div class="wrap">
    <div class="pk__head" data-reveal>
      <span class="pilltag">${t(P.eyebrow)}</span>
      <${level} id="h-form">${L.formH}</${level}>
      <p>${L.formSub}</p>
    </div>
    <form class="pk__form" id="pickup" method="post" action="${R("pickupForm", lang)}" novalidate>
      <p class="note">${ICON.info}<span>${t(P.requiredNote)}</span></p>
      <fieldset class="card">
        <div class="card__h"><span class="card__ic">${ICON.user}<b>1</b></span><div><legend>${t(P.identityTitle)}</legend><p>${L.identitySub}</p></div></div>
        <div class="fields">
          <div class="f f--full" data-f="title"><span class="lbl" id="l-title">${t(P.fields.title)} <i>*</i></span>
            <div class="seg" role="radiogroup" aria-labelledby="l-title"><label><input type="radio" name="title" value="mr">${t(P.fields.titleOptions.mr)}</label><label><input type="radio" name="title" value="mrs">${t(P.fields.titleOptions.mrs)}</label></div>
            <span class="f__e">${t(P.errors.titleRequired)}</span></div>
          ${fld("firstName", "f-fn", "text", "given-name")}
          ${fld("lastName", "f-ln", "text", "family-name")}
          <div class="f f--full"><label for="f-co">${t(P.fields.company)}</label><input id="f-co" name="company" type="text" autocomplete="organization"></div>
          ${fld("email", "f-em", "email", "email")}
          ${fld("phone", "f-ph", "tel", "tel")}
          ${fld("address", "f-ad", "text", "street-address", true)}
          ${fld("city", "f-ci", "text", "address-level2")}
          ${fld("postalCode", "f-pc", "text", "postal-code")}
        </div>
      </fieldset>
      <fieldset class="card">
        <div class="card__h"><span class="card__ic">${ICON.box}<b>2</b></span><div><legend>${t(P.quantitiesTitle)}</legend><p>${t(P.minItemsNote)}</p></div></div>
        <div class="qty">${keys.map((k) => `<div class="q" data-k="${k}"><span>${t(Q[k])}</span></div>`).join("")}</div>
        <div class="extras"><p class="extras__t">${t(P.fields.otherEquipment)} <span>${L.optional}</span></p><div id="xrows"></div>
          <button type="button" class="xadd" id="xadd"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>${t(P.fields.extraAdd)}</button></div>
        <div class="totbox" id="totbox">
          <div class="totbox__row"><div><small>${L.totalLabel}</small><strong><em id="tot-n">0</em> <span>${L.minLabel}</span></strong></div><span class="okpill" id="okpill">${L.left}</span></div>
          <div class="meter"><i id="meter"></i></div>
          <p class="qerr" id="qerr">${t(P.errors.minItems)}</p>
        </div>
      </fieldset>
      <fieldset class="card">
        <div class="card__h"><span class="card__ic">${ICON.shield}<b>3</b></span><div><legend>${t(P.certificateTitle)}</legend><p>${L.certSub}</p></div></div>
        <div class="f" data-f="cert"><span class="lbl" id="l-cert">${t(P.certificateQuestion)} <i>*</i></span>
          <div class="seg seg--big" role="radiogroup" aria-labelledby="l-cert"><label><input type="radio" name="certificate" value="yes">${t(P.yes)}</label><label><input type="radio" name="certificate" value="no">${t(P.no)}</label></div>
          <span class="f__e">${t(P.errors.certificateRequired)}</span></div>
      </fieldset>
      <p class="bottomnote">${t(P.bottomNote)}</p>
      <div class="formmsg formmsg--err" id="formerr" role="alert">${L.checkFields}</div>
      <div class="formmsg formmsg--info" id="forminfo" role="status">${L.protoForm}</div>
      <button type="submit" class="btn submit">${ICON.send}${t(P.submit)}</button>
    </form>
  </div>
</section>
<div class="progress-pill" id="progress-pill" aria-hidden="true"><b id="pill-n">0 / 10 ${L.js.items}</b><div class="meter"><i id="pill-m"></i></div></div>`;
}

const HEAD_LINKS = `<link rel="icon" href="/assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..800&family=Geist+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/scrollcraft.css">
<link rel="stylesheet" href="/site.css">`;
const i18nScript = (L) => `<script>window.ILR_T=${JSON.stringify(L.js)};</script>`;

function page(M, L, lang, { key, title, desc, body, alt }) {
  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${t(title)}</title>
<meta name="description" content="${t(desc)}">
<link rel="alternate" hreflang="fr" href="${alt.fr}"><link rel="alternate" hreflang="en" href="${alt.en}">
${HEAD_LINKS}
${i18nScript(L)}
</head>
<body>
${chrome(M, L, lang, key, alt)}
<main id="top">
${body}
</main>
${footer(M, L, lang)}
<script src="/site.js"></script>
</body>
</html>
`;
}

/* --------------------------------------------------------------- sections */
function kit(M, L, lang) {
  const P = R("pickupForm", lang);
  const phero = ({ eyebrow, title, lead, media, solo }) => `<section class="phero ground ground--paper">
  <div class="wrap phero__in${solo ? " phero__in--solo" : ""}">
    <div data-reveal>
      <span class="pilltag">${t(eyebrow)}</span>
      <h1>${t(title)}</h1>
      ${lead ? `<p class="lead">${t(lead)}</p>` : ""}
      <div style="margin-top:2rem">${cta(P, L.cta)}</div>
    </div>
    ${media || ""}
  </div>
</section>`;
  const media = (src, alt, obj) => `<div class="phero__media${obj ? " phero__media--obj" : ""}" data-reveal="120"><img src="${src}" alt="${esc(alt)}"></div>`;
  const sec = (inner, grey) => `<section class="psec ground ${grey ? "ground--grey" : "ground--paper"}"><div class="wrap">${inner}</div></section>`;
  const h2 = (s) => `<h2 data-reveal>${t(s)}</h2>`;
  const prose = (...ps) => `<div class="prose" data-reveal>${ps.filter(Boolean).map((p) => `<p>${t(p)}</p>`).join("")}</div>`;
  const checks = (items) => `<ul class="checks">${items.map((i, k) => `<li data-reveal="${k * 50}">${t(i)}</li>`).join("")}</ul>`;
  const tiles = (items, numbered) => `<div class="tiles">${items.map((it, k) => `<div class="tile" data-reveal="${k * 60}">${numbered ? `<span class="ix">${k + 1}</span>` : ""}<h3>${t(it.title || it.h || it.name || it.q)}</h3>${it.text || it.p || it.value ? `<p>${t(it.text || it.p || it.value)}</p>` : ""}${it.list ? `<p>${it.list}</p>` : ""}</div>`).join("")}</div>`;
  const faq = (title, items) => `${h2(title)}<div class="faq">${items.map((f, k) => `<details data-reveal="${k * 40}"><summary>${t(f.q)}</summary><div class="ans">${t(f.a)}</div></details>`).join("")}</div>`;
  const zones = (title) => `${h2(title)}<div class="tiles">${Object.entries(CITIES[lang]).map(([r, cs], k) => `<div class="tile" data-reveal="${k * 60}"><h3>${r}</h3><p>${cs.join(" · ")}</p></div>`).join("")}</div>`;
  const band = (title, text, href = P, label = L.cta) => `<section class="psec ground ground--paper"><div class="wrap"><div class="cta-band" data-reveal><div><h2>${t(title)}</h2><p>${t(text)}</p></div>${cta(href, label, "cta--white")}</div></div></section>`;
  return { phero, media, sec, h2, prose, checks, tiles, faq, zones, band };
}

/* ------------------------------------------------------------------ pages */
function buildPages(lang) {
  const M = MSG[lang], L = UI[lang], K = kit(M, L, lang);
  const { phero, media, sec, h2, prose, checks, tiles, faq, zones, band } = K;
  const out = {};
  const add = (key, slugPath, opts) => {
    const alt = slugPath ? { fr: slugPath.fr, en: slugPath.en } : { fr: R(key, "fr"), en: R(key, "en") };
    out[(slugPath ? slugPath[lang] : R(key, lang)).replace(/^\/|\/$/g, "")] = page(M, L, lang, { key, alt, ...opts });
  };
  const A = M.about;
  add("about", null, { title: `${A.title} · Info Liquidation Recycle`, desc: A.p1, body:
    phero({ eyebrow: A.eyebrow, title: A.title, lead: A.p1, media: media("/assets/ramassage.webp", L.altCart) }) +
    sec(`<div class="split"><div class="tile" data-reveal><span class="ix" style="width:3rem;height:3rem">${ICON.user}</span><h3 style="font-size:1.5rem">${t(A.founderName)}</h3><p class="mono" style="color:var(--green-ink);margin-top:.4rem">${t(A.founderRole)}</p><p>${t(A.founderText)}</p></div><div>${h2(A.companyTitle)}${prose(A.p1, A.p2)}</div></div>`, true) +
    sec(`${h2(A.missionTitle)}${prose(A.p3, A.p4)}`) + band(A.ctaTitle, A.ctaText) });
  const I = M.informations;
  add("informations", null, { title: `${I.title} · Info Liquidation Recycle`, desc: I.whyP1, body:
    phero({ eyebrow: I.eyebrow, title: I.title, lead: I.banner, media: media("/assets/knoll-full.webp", L.altKnoll, true) }) +
    sec(`${h2(I.whyTitle)}${prose(I.whyP1, I.whyP2)}`, true) +
    sec(`${h2(I.batteriesTitle)}${prose(I.batteriesP1, I.batteriesP2)}<div class="stats">${I.batteriesStats.map((s, k) => `<div class="tile" data-reveal="${k * 60}"><span class="num">${Number(s.value).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA")}&nbsp;${esc(s.suffix)}</span><p>${t(s.label)}</p></div>`).join("")}</div>`) +
    sec(`${h2(I.productsTitle)}${tiles([{ title: I.collectTitle, text: I.collectText }, { title: I.dataTitle, text: I.dataText }])}`, true) +
    band(I.ctaTitle, I.ctaText) });
  const FP = M.faqPage;
  add("faq", null, { title: `${FP.title} · Info Liquidation Recycle`, desc: FP.subtitle, body:
    phero({ eyebrow: FP.eyebrow, title: FP.title, lead: FP.subtitle, solo: true }) + sec(faq(L.faqTitle, M.faqItems), true) +
    band(FP.ctaTitle, FP.ctaText, R("contact", lang), t(FP.ctaButton)) });
  const B = M.blog, slugs = Object.keys(B.articles);
  const fmtDate = (d) => { const x = new Date(d + "T12:00:00"); return isNaN(x) ? esc(d) : x.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "long", year: "numeric" }); };
  const postCard = (s, k) => { const a = B.articles[s]; return `<a class="post" href="${R("blog", lang)}${s}/" data-reveal="${(k % 3) * 60}"><time class="mono" datetime="${esc(a.date)}">${fmtDate(a.date)}</time><h3>${t(a.title)}</h3><p>${t(a.excerpt)}</p><span class="more">${t(B.readArticle)} ${ARROW}</span></a>`; };
  add("blog", null, { title: `${B.title} · Info Liquidation Recycle`, desc: B.subtitle, body:
    phero({ eyebrow: B.eyebrow, title: B.title, lead: B.subtitle, solo: true }) + sec(`<div class="posts">${slugs.map(postCard).join("")}</div>`, true) });
  slugs.forEach((s, i) => {
    const a = B.articles[s], more = slugs.filter((x) => x !== s).slice(i % 7, (i % 7) + 3);
    add("blog", { fr: `/blog/${s}/`, en: `/en/blog/${s}/` }, { title: `${a.title} · Info Liquidation Recycle`, desc: a.excerpt, body:
      `<section class="phero ground ground--paper"><div class="wrap phero__in phero__in--solo"><div data-reveal><a class="back" href="${R("blog", lang)}">← ${t(B.backToBlog)}</a><p class="mono" style="margin:1.5rem 0 0;color:var(--green-ink)">${t(B.publishedOn)} ${fmtDate(a.date)}</p><h1>${t(a.title)}</h1><p class="lead">${t(a.excerpt)}</p></div></div></section>` +
      sec(`${L.articleNote ? `<p class="note" style="max-width:46rem" data-reveal>${L.articleNote}</p>` : ""}<article class="article"${lang === "en" ? ' lang="fr"' : ""}>${a.sections.map((x) => `<h2 data-reveal>${t(x.h)}</h2><p data-reveal>${t(x.p)}</p>`).join("")}</article>`) +
      sec(`${h2(B.moreArticles)}<div class="posts">${(more.length ? more : slugs.slice(0, 3)).map(postCard).join("")}</div>`, true) });
  });
  const CT = M.contact, C = M.common;
  add("contact", null, { title: `${CT.title} · Info Liquidation Recycle`, desc: L.contactDesc, body:
    phero({ eyebrow: CT.eyebrow, title: CT.title, lead: L.contactLead, solo: true }) +
    sec(`<div class="contact-grid">
    <div class="card coord" data-reveal>
      <div><h3 style="margin:0;font:700 1.35rem/1.2 var(--sc-font-display)">${t(CT.ownerName)}</h3><p class="mono" style="color:var(--green-ink);margin-top:.35rem">${t(CT.ownerRole)}</p></div>
      <a class="row" href="tel:4504734636"><span class="card__ic">${ICON.phone}</span><span><b>${t(C.phoneLabel)}</b><br>(450) 473-4636</span></a>
      <a class="row" href="mailto:info@infoliquidationrecycle.com"><span class="card__ic">${ICON.mail}</span><span><b>${t(C.emailLabel)}</b><br>info@infoliquidationrecycle.com</span></a>
      <a class="row" href="https://g.page/InfoLiquidationRecycle?share" rel="noopener" target="_blank"><span class="card__ic">${ICON.pin}</span><span><b>${t(C.addressLabel)}</b><br>514, chemin de la Rivière Sud, local 102, Saint-Eustache ${L.province} J7R 0E2<br><span style="color:var(--green-ink);font-weight:700">${t(CT.directions)} →</span></span></a>
      <div class="row"><span class="card__ic">${ICON.clock}</span><p><b>${t(C.hoursLabel)}</b><br>${t(C.hoursMonThu)}<br>${t(C.hoursFri)}<br>${t(C.hoursWeekend)}</p></div>
    </div>
    <form class="card" id="contactform" method="post" action="${R("contact", lang)}" novalidate data-reveal="100">
      <div class="card__h"><span class="card__ic">${ICON.mail}</span><div><h3>${t(CT.formTitle)}</h3><p>${L.contactSub}</p></div></div>
      <div class="fields">
        <div class="f" data-f="name"><label for="c-n">${t(CT.fields.name)} <i>*</i></label><input id="c-n" name="name" type="text" autocomplete="name"><span class="f__e">${t(CT.errors.nameRequired)}</span></div>
        <div class="f"><label for="c-p">${t(CT.fields.phone)}</label><input id="c-p" name="phone" type="tel" autocomplete="tel"></div>
        <div class="f f--full" data-f="email"><label for="c-e">${t(CT.fields.email)} <i>*</i></label><input id="c-e" name="email" type="email" autocomplete="email"><span class="f__e">${t(CT.errors.emailInvalid)}</span></div>
        <div class="f f--full" data-f="message"><label for="c-m">${t(CT.fields.message)} <i>*</i></label><textarea id="c-m" name="message"></textarea><span class="f__e">${t(CT.errors.messageRequired)}</span></div>
      </div>
      <div class="formmsg formmsg--err" id="c-err" role="alert" style="margin-top:1rem">${L.checkFields}</div>
      <div class="formmsg formmsg--info" id="c-info" role="status" style="margin-top:1rem">${L.protoContact}</div>
      <button type="submit" class="btn submit" style="margin-top:1.25rem">${ICON.send}${t(CT.submit)}</button>
    </form>
  </div>`, true) });
  add("pickupForm", null, { title: `${M.pickup.title} · Info Liquidation Recycle`, desc: M.pickup.bottomNote, body: `<div class="chrome-space"></div>` + pickupForm(M, L, lang, "h1") });
  const CK = M.cookies;
  add("cookies", null, { title: `${CK.title} · Info Liquidation Recycle`, desc: CK.intro, body:
    phero({ eyebrow: CK.eyebrow, title: CK.title, lead: CK.intro, solo: true }) +
    sec(`<article class="article">${(CK.sections || []).map((x) => `<h2 data-reveal>${t(x.h)}</h2><p data-reveal>${t(x.p)}</p>`).join("")}</article>`) });
  const S1 = M.svcComputer;
  add("computer", null, { title: `${S1.title} · Info Liquidation Recycle`, desc: S1.intro, body:
    phero({ eyebrow: S1.eyebrow, title: S1.title, lead: S1.intro, media: media("/assets/laptops-stack.webp", L.altLaptops) }) +
    sec(`<div class="split"><div>${h2(S1.whyTitle)}${prose(S1.whyText)}</div><div>${h2(S1.deeeTitle)}${prose(S1.deeeText)}${checks(S1.deeeItems)}</div></div>`, true) +
    sec(`${h2(S1.benefitsTitle)}${prose(S1.benefitsIntro)}${tiles([{ title: S1.benefit1Title, text: S1.benefit1Text }, { title: S1.benefit2Title, text: S1.benefit2Text }])}`) +
    sec(`${h2(S1.howTitle)}${prose(S1.howText)}`, true) + sec(zones(S1.zonesTitle)) + sec(faq(S1.faqTitle, S1.faq), true) + band(S1.ctaTitle, S1.ctaText) });
  const S2 = M.svcData;
  add("data", null, { title: `${S2.title} · Info Liquidation Recycle`, desc: S2.intro, body:
    phero({ eyebrow: S2.eyebrow, title: S2.title, lead: S2.intro, media: media("/assets/disque-v2.jpg", L.altDrive) }) +
    sec(prose(S2.p1, S2.p2, S2.p3), true) +
    sec(`${h2(S2.knowTitle)}${prose(S2.knowText)}<p class="mono" style="margin-top:1.5rem;color:var(--green-ink)" data-reveal>${t(S2.standardsLabel)}</p>${checks(S2.standards)}`) + band(S2.ctaTitle, S2.ctaText) });
  const S3 = M.svcMaterials;
  add("materials", null, { title: `${S3.title} · Info Liquidation Recycle`, desc: S3.intro, body:
    phero({ eyebrow: S3.eyebrow, title: S3.title, lead: S3.intro, media: media("/assets/knoll-full.webp", L.altKnoll, true) }) +
    sec(`${prose(S3.note)}${tiles(S3.categories.map((c) => ({ title: c.title, list: `<span class="mono" style="color:var(--green-ink)">${t(S3.examplesLabel)}</span><br>${c.examples.map(t).join(" · ")}` })))}`, true) +
    sec(faq(S3.faqTitle, S3.faq)) + band(S3.ctaTitle, S3.ctaText) });
  const S4 = M.svcProcedure;
  add("procedure", null, { title: `${S4.title} · Info Liquidation Recycle`, desc: S4.intro, body:
    phero({ eyebrow: S4.eyebrow, title: S4.title, lead: S4.intro, media: media("/assets/ramassage.webp", L.altCart) }) +
    sec(tiles(S4.blocks, true), true) + band(S4.ctaTitle, S4.ctaText) });
  const S5 = M.svcHardDrives;
  add("hardDrives", null, { title: `${S5.title} · Info Liquidation Recycle`, desc: S5.whyP1, body:
    phero({ eyebrow: S5.eyebrow, title: S5.title, lead: S5.whyP1, media: media("/assets/disque-v2.jpg", L.altDrive) }) +
    sec(`<div class="split"><div>${h2(S5.whyTitle)}${prose(S5.whyP2)}${checks(S5.whyBullets)}</div><div>${h2(S5.whereTitle)}${prose(S5.whereText)}</div></div>`, true) +
    sec(`${h2(S5.methodsTitle)}${tiles([{ title: S5.method1Title, text: S5.method1Text }, { title: S5.method2Title, text: S5.method2Text }])}`) +
    sec(`${h2(S5.stepsTitle)}${tiles(S5.steps, true)}`, true) + sec(faq(S5.faqTitle, S5.faq)) + band(S5.ctaTitle, S5.ctaText) });
  const S6 = M.svcPhones;
  add("phones", null, { title: `${S6.title} · Info Liquidation Recycle`, desc: S6.intro, body:
    phero({ eyebrow: S6.eyebrow, title: S6.title, lead: S6.intro, media: `<div class="phero__media phero__media--obj" data-reveal="120" style="display:flex;gap:6%;align-items:center;justify-content:center"><img src="/assets/items/tablet.webp" alt="${esc(L.altTablet)}" style="width:52%"><img src="/assets/items/phone.webp" alt="${esc(L.altPhone)}" style="width:28%"></div>` }) +
    sec(`${h2(S6.componentsTitle)}${tiles(S6.components)}`, true) +
    sec(`${h2(S6.reasonsTitle)}${checks(S6.reasons)}`) + sec(zones(S6.zonesTitle), true) + sec(faq(S6.faqTitle, S6.faq)) + band(S6.ctaTitle, S6.ctaText) });

  /* the home page: index.src.html with its {{key}} strings */
  const H = JSON.parse(fs.readFileSync(path.join(ROOT, "home.i18n.json"), "utf8"))[lang];
  const home = fs.readFileSync(path.join(ROOT, "index.src.html"), "utf8")
    .replace("{{CHROME}}", () => chrome(M, L, lang, "home", { fr: "/", en: "/en/" }))
    .replace("{{FOOTER}}", () => footer(M, L, lang))
    .replace("{{FORM}}", () => pickupForm(M, L, lang, "h2"))
    .replace("{{HEAD}}", () => `<link rel="alternate" hreflang="fr" href="/"><link rel="alternate" hreflang="en" href="/en/">\n${HEAD_LINKS}\n${i18nScript(L)}`)
    .replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (m, k) => { if (!(k in H)) throw new Error(`home.i18n.json: missing "${k}" (${lang})`); return H[k]; });
  out[lang === "fr" ? "" : "en"] = home;
  return out;
}

/* ------------------------------------------------------------------ write */
let n = 0;
for (const lang of ["fr", "en"]) {
  for (const [p, html] of Object.entries(buildPages(lang))) {
    const dir = path.join(ROOT, p);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html);
    n++;
  }
}
console.log("built", n, "pages");
