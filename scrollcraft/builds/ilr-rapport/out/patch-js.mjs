// One-off: site.js reads its interface strings from window.ILR_T and drives the two-row chrome.
import fs from "node:fs";
let s = fs.readFileSync("site.js", "utf8");
const rep = (x, y) => { if (!s.includes(x)) throw new Error("missing: " + x.slice(0, 70)); s = s.split(x).join(y); };
rep("  window.ILR = { reduce: reduce, fine: fine, clamp01: clamp01 };",
    "  var T = window.ILR_T || {};\n  var tr = function (k, d) { return T[k] != null ? T[k] : d; };\n  window.ILR = { reduce: reduce, fine: fine, clamp01: clamp01, t: tr };");
rep("  var bar = document.getElementById('bar');", "  var bar = document.getElementById('chrome');");
rep("burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');", "burger.setAttribute('aria-label', open ? tr('close', 'Fermer le menu') : tr('open', 'Ouvrir le menu'));");
rep("var onScroll = function () { bar.classList.toggle('scrolled', scrollY > 8); };", "var onScroll = function () { bar.classList.toggle('scrolled', scrollY > 24); };");
rep("'<button type=\"button\" data-d=\"-1\" aria-label=\"Diminuer : ' + name + '\">−</button>' +",
    "'<button type=\"button\" data-d=\"-1\" aria-label=\"' + tr('dec', 'Diminuer') + ' : ' + name + '\">−</button>' +");
rep("'<button type=\"button\" data-d=\"1\" aria-label=\"Augmenter : ' + name + '\">+</button>';",
    "'<button type=\"button\" data-d=\"1\" aria-label=\"' + tr('inc', 'Augmenter') + ' : ' + name + '\">+</button>';");
rep("row.innerHTML = '<div class=\"f\"><input type=\"text\" name=\"x_name\" placeholder=\"Équipement (ex. fax, câbles…)\" aria-label=\"Équipement\"></div>' +",
    "row.innerHTML = '<div class=\"f\"><input type=\"text\" name=\"x_name\" placeholder=\"' + tr('equipPh', 'Équipement (ex. fax, câbles…)') + '\" aria-label=\"' + tr('equip', 'Équipement') + '\"></div>' +");
rep("'<div class=\"stp\"><button type=\"button\" data-d=\"-1\" aria-label=\"Diminuer\">−</button><input type=\"number\" inputmode=\"numeric\" min=\"0\" max=\"9999\" value=\"' + (qty || 1) + '\" name=\"x_qty\" aria-label=\"Quantité\"><button type=\"button\" data-d=\"1\" aria-label=\"Augmenter\">+</button></div>' +",
    "'<div class=\"stp\"><button type=\"button\" data-d=\"-1\" aria-label=\"' + tr('dec', 'Diminuer') + '\">−</button><input type=\"number\" inputmode=\"numeric\" min=\"0\" max=\"9999\" value=\"' + (qty || 1) + '\" name=\"x_qty\" aria-label=\"' + tr('qty', 'Quantité') + '\"><button type=\"button\" data-d=\"1\" aria-label=\"' + tr('inc', 'Augmenter') + '\">+</button></div>' +");
rep("'<button type=\"button\" class=\"xrm\" aria-label=\"Retirer cet équipement\">×</button>';",
    "'<button type=\"button\" class=\"xrm\" aria-label=\"' + tr('remove', 'Retirer cet équipement') + '\">×</button>';");
rep("okpill.textContent = ok ? 'Admissible, sans frais' : 'Encore ' + (MIN - n);",
    "okpill.textContent = ok ? tr('ok', 'Admissible, sans frais') : tr('leftPre', 'Encore ') + (MIN - n) + tr('leftPost', '');");
rep("if (pillN) pillN.textContent = n + ' / ' + MIN + ' items';", "if (pillN) pillN.textContent = n + ' / ' + MIN + ' ' + tr('items', 'items');");
fs.writeFileSync("site.js", s);
console.log("site.js patched");
