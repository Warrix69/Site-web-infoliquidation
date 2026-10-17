// One-off: swap the old bar block in site.css for the old-site chrome, add font tokens, drop media frames.
import fs from "node:fs";
let s = fs.readFileSync("site.css", "utf8");
const a = s.indexOf("/* ------------------------------------------------------------- top bar -- */");
const b = s.indexOf("/* ------------------------------------------------- the pickup form --");
if (a < 0 || b < 0) throw new Error("markers not found");
s = s.slice(0, a) + fs.readFileSync("out/chrome.css", "utf8") + s.slice(b);
const rep = (x, y) => { if (!s.includes(x)) throw new Error("missing: " + x.slice(0, 70)); s = s.split(x).join(y); };
rep("  --bar: 68px;", "  --topbar: 40px;\n  --nav: 76px;\n  --chrome-h: calc(var(--topbar) + var(--nav));\n  --bar: var(--chrome-h);\n  --font-ui: \"Poppins\", system-ui, sans-serif;\n  --font-hero: \"IBM Plex Sans\", system-ui, sans-serif;");
rep(".phero__media { position: relative; border-radius: 28px; overflow: hidden; aspect-ratio: 4 / 3.3; background: #F4F4F5; box-shadow: 0 0 0 6px #FFFFFF, 0 0 0 7px rgba(10,10,10,.07), 0 40px 70px -34px rgba(10,10,10,.4); }",
    ".phero__media { position: relative; border-radius: 24px; overflow: hidden; aspect-ratio: 4 / 3.3; box-shadow: 0 30px 60px -34px rgba(10,10,10,.45); }");
rep(".phero__media--obj { display: grid; place-items: center; background: radial-gradient(circle at 50% 45%, #FFFFFF, #EEEFF1); }",
    ".phero__media--obj { display: grid; place-items: center; background: none; box-shadow: none; overflow: visible; }");
rep(".totbox strong span {", ".totbox strong em { font-style: normal; }\n.totbox strong span {");
rep("font: 700 1.08rem/1 var(--sc-font-display); letter-spacing: -0.01em; white-space: nowrap;", "font: 700 1.08rem/1 var(--font-ui); letter-spacing: -0.01em; white-space: nowrap;");
fs.writeFileSync("site.css", s);
console.log("site.css patched");
