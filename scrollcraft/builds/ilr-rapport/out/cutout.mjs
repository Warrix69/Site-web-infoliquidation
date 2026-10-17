// Cuts each object out of the knolling still into its own PNG with real alpha.
// Background is flood-filled from the crop border following smooth gradients, so
// soft shadows join the background and are re-encoded as black-with-alpha, while
// object edges (sharp gradients) stop the fill. Only the largest object component
// is kept, so a neighbour poking into the crop disappears.
import sharp from "sharp";
import fs from "node:fs";

const SRC = process.argv[2] || "out/hero-knoll.png";
const OUT = process.argv[3] || "assets/items";
fs.mkdirSync(OUT, { recursive: true });

const BOXES = {
  laptop:  [458, 280, 1115, 534],
  monitor: [1245, 157, 2196, 568],
  server:  [205, 554, 889, 882],
  tower:   [978, 540, 1642, 944],
  printer: [1826, 547, 2456, 1019],
  hdd:     [308, 923, 602, 1101],
  phone:   [629, 999, 896, 1149],
  tablet:  [930, 1047, 1478, 1300],
  cable:   [1731, 1060, 2141, 1307],
};

const { data: full, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const FW = info.width, C = info.channels;
const meta = {};

for (const [name, [x0, y0, x1, y1]] of Object.entries(BOXES)) {
  const W = x1 - x0, H = y1 - y0, N = W * H;
  const px = new Float32Array(N * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = ((y + y0) * FW + (x + x0)) * C, d = (y * W + x) * 3;
    px[d] = full[s]; px[d + 1] = full[s + 1]; px[d + 2] = full[s + 2];
  }
  const lum = (i) => 0.2126 * px[i * 3] + 0.7152 * px[i * 3 + 1] + 0.0722 * px[i * 3 + 2];
  const diff = (a, b) => Math.max(Math.abs(px[a * 3] - px[b * 3]), Math.abs(px[a * 3 + 1] - px[b * 3 + 1]), Math.abs(px[a * 3 + 2] - px[b * 3 + 2]));

  // border mean = local paper tone
  let bsum = 0, bn = 0;
  for (let x = 0; x < W; x++) { bsum += lum(x) + lum((H - 1) * W + x); bn += 2; }
  for (let y = 0; y < H; y++) { bsum += lum(y * W) + lum(y * W + W - 1); bn += 2; }
  const paper = bsum / bn;

  // gradient-following flood fill from the border
  const bg = new Uint8Array(N), q = new Int32Array(N); let qh = 0, qt = 0;
  const push = (i) => { if (!bg[i]) { bg[i] = 1; q[qt++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (qh < qt) {
    const i = q[qh++], x = i % W, y = (i / W) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
      if (j < 0 || bg[j]) continue;
      if (diff(i, j) <= 6 && lum(j) > paper * 0.42) push(j);
    }
  }

  // keep the largest object component only
  const lab = new Int32Array(N).fill(-1); const sizes = [];
  for (let s = 0; s < N; s++) {
    if (bg[s] || lab[s] >= 0) continue;
    const id = sizes.length; let n = 0; qh = 0; qt = 0; q[qt++] = s; lab[s] = id;
    while (qh < qt) {
      const i = q[qh++], x = i % W, y = (i / W) | 0; n++;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && !bg[j] && lab[j] < 0) { lab[j] = id; q[qt++] = j; }
      }
    }
    sizes.push(n);
  }
  const keep = sizes.indexOf(Math.max(...sizes));

  const out = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    if (!bg[i] && lab[i] === keep) {
      // object: true colour, edge pixels softened against paper
      out[o] = px[i * 3]; out[o + 1] = px[i * 3 + 1]; out[o + 2] = px[i * 3 + 2]; out[o + 3] = 255;
    } else if (bg[i]) {
      // shadow: darkness relative to the paper becomes black alpha
      const a = Math.max(0, Math.min(1, (paper - lum(i)) / paper * 1.35));
      out[o + 3] = Math.round(a * 255);
    }
  }
  // 1px feather on the object boundary
  const feathered = Buffer.from(out);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; if (out[i * 4 + 3] !== 255) continue;
    let edge = false;
    for (const j of [i - 1, i + 1, i - W, i + W]) if (out[j * 4 + 3] < 255) edge = true;
    if (edge) feathered[i * 4 + 3] = 200;
  }
  await sharp(feathered, { raw: { width: W, height: H, channels: 4 } })
    .resize({ width: Math.min(W, 900), withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(`${OUT}/${name}.webp`);
  // also a dark-ground preview to inspect the matte
  await sharp(feathered, { raw: { width: W, height: H, channels: 4 } })
    .flatten({ background: "#3a3a3a" }).png().toFile(`out/check-${name}.png`);
  meta[name] = { x: x0, y: y0, w: W, h: H };
  console.log(name, W + "x" + H, "components:", sizes.length, "paper", paper.toFixed(1));
}
fs.writeFileSync(`${OUT}/layout.json`, JSON.stringify({ source: { w: FW, h: info.height }, items: meta }, null, 1));
