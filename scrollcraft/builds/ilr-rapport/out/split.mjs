// Splits the background-removed knolling still into one PNG per object.
// Alpha comes from kie.ai remove-background; only the largest alpha component
// inside each box is kept so a neighbour poking into the crop is dropped.
import sharp from "sharp";
import fs from "node:fs";
const BOXES = {
  laptop: [458, 280, 1115, 534], monitor: [1245, 157, 2196, 568], server: [205, 554, 889, 882],
  tower: [978, 540, 1642, 944], printer: [1826, 547, 2456, 1019], hdd: [308, 923, 602, 1101],
  phone: [629, 999, 896, 1149], tablet: [930, 1047, 1478, 1300], cable: [1731, 1060, 2141, 1307],
};
const { data, info } = await sharp("out/hero-knoll-alpha.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const FW = info.width, FH = info.height;
fs.mkdirSync("assets/items", { recursive: true });
const layout = { source: { w: FW, h: FH }, items: {} };
for (const [name, [x0, y0, x1, y1]] of Object.entries(BOXES)) {
  const W = x1 - x0, H = y1 - y0, N = W * H, buf = Buffer.alloc(N * 4);
  for (let y = 0; y < H; y++) data.copy(buf, y * W * 4, ((y + y0) * FW + x0) * 4, ((y + y0) * FW + x1) * 4);
  const lab = new Int32Array(N).fill(-1), sizes = [], q = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (buf[s * 4 + 3] < 40 || lab[s] >= 0) continue;
    const id = sizes.length; let qh = 0, qt = 0, n = 0; q[qt++] = s; lab[s] = id;
    while (qh < qt) { const i = q[qh++], x = i % W, y = (i / W) | 0; n++;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1])
        if (j >= 0 && lab[j] < 0 && buf[j * 4 + 3] >= 40) { lab[j] = id; q[qt++] = j; } }
    sizes.push(n);
  }
  const keep = sizes.indexOf(Math.max(...sizes));
  let minx = W, miny = H, maxx = 0, maxy = 0;
  for (let i = 0; i < N; i++) {
    if (lab[i] !== keep && buf[i * 4 + 3] >= 40) buf[i * 4 + 3] = 0;
    if (lab[i] === keep) { const x = i % W, y = (i / W) | 0; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  }
  const pad = 4; minx = Math.max(0, minx - pad); miny = Math.max(0, miny - pad); maxx = Math.min(W - 1, maxx + pad); maxy = Math.min(H - 1, maxy + pad);
  const img = sharp(buf, { raw: { width: W, height: H, channels: 4 } }).extract({ left: minx, top: miny, width: maxx - minx + 1, height: maxy - miny + 1 });
  await img.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(`assets/items/${name}.webp`);
  await img.clone().flatten({ background: "#3a3a3a" }).png().toFile(`out/check-${name}.png`);
  layout.items[name] = { x: x0 + minx, y: y0 + miny, w: maxx - minx + 1, h: maxy - miny + 1 };
  console.log(name, layout.items[name], "parts", sizes.length);
}
fs.writeFileSync("assets/items/layout.json", JSON.stringify(layout));
const names = Object.keys(BOXES);
const tiles = await Promise.all(names.map((n) => sharp(`out/check-${n}.png`).resize(440, 300, { fit: "contain", background: "#3a3a3a" }).png().toBuffer()));
await sharp({ create: { width: 1320, height: 900, channels: 3, background: "#3a3a3a" } })
  .composite(tiles.map((b, i) => ({ input: b, left: (i % 3) * 440, top: ((i / 3) | 0) * 300 }))).png().toFile("out/check-sheet.png");
