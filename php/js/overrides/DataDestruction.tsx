"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type DestructionLabels = {
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  cta: string;
  stampTitle: string;
  stampLine: string;
};

const SRC = "/images/objets/disque-dur.webp";
const STEP = 3; // taille d'une particule, en px CSS
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/**
 * Destruction des données : le disque dur reste net, puis se dissout au défilement ;
 * chaque fragment qui se détache s'envole en virant au vert recyclage.
 */
export function DataDestruction({ labels }: { labels: DestructionLabels }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!track || !box || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const img = new Image();
    img.decoding = "async";
    img.src = SRC;

    let dpr = 1;
    let n = 0;
    let cellW = STEP, cellH = STEP;
    let px = new Float32Array(0), py = new Float32Array(0), th = new Float32Array(0);
    let vx = new Float32Array(0), vy = new Float32Array(0);
    let cr = new Uint8ClampedArray(0), cg = new Uint8ClampedArray(0), cb = new Uint8ClampedArray(0), ca = new Uint8ClampedArray(0);
    // Image nette à pleine résolution (canevas, jamais relue) et « reste » : la base moins les
    // cases déjà détachées, tenu à jour par incréments (seules les cases nouvellement détachées
    // sont effacées ; refait en entier seulement quand on remonte).
    let base: HTMLCanvasElement | null = null;
    let rem: CanvasRenderingContext2D | null = null;
    let remIdx = 0; // nombre de cases (triées par seuil) déjà effacées de « rem »
    let remD = -1;
    let order = new Uint32Array(0); // cases triées par seuil de détachement croissant
    // Calque des fragments en vol : mêmes écritures de pixels qu'avant, envoyées au GPU
    // seulement sur le rectangle qui a changé
    let frag: ImageData | null = null;
    let fragCtx: CanvasRenderingContext2D | null = null;
    let prevX = new Int32Array(0), prevY = new Int32Array(0), prevM = 0;
    let curX = new Int32Array(0), curY = new Int32Array(0);
    let raf = 0;
    let visible = true;
    let De = 0;
    let shown = false;

    const build = () => {
      if (!img.complete || !img.naturalWidth) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = box.clientWidth;
      const H = box.clientHeight;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;

      const imgW = Math.min(W * 0.86, (H * 0.7 * img.naturalWidth) / img.naturalHeight);
      const imgH = (imgW * img.naturalHeight) / img.naturalWidth;
      const imgX = (W - imgW) / 2;
      const imgY = (H - imgH) / 2;

      // image nette, à pleine résolution
      const full = document.createElement("canvas");
      full.width = canvas.width;
      full.height = canvas.height;
      const fctx = full.getContext("2d");
      if (!fctx) return;
      fctx.imageSmoothingQuality = "high";
      fctx.drawImage(img, imgX * dpr, imgY * dpr, imgW * dpr, imgH * dpr);
      // Lecture d'un pixel : force le dessin de la base maintenant, avant la petite grille, dans le
      // même ordre que l'ancienne version (qui relisait toute la base) : même rééchantillonnage de
      // l'image, donc même base et même grille de fragments
      fctx.getImageData(0, 0, 1, 1);
      base = full;
      const remCanvas = document.createElement("canvas");
      remCanvas.width = canvas.width;
      remCanvas.height = canvas.height;
      rem = remCanvas.getContext("2d");
      remD = -1;
      const fragCanvas = document.createElement("canvas");
      fragCanvas.width = canvas.width;
      fragCanvas.height = canvas.height;
      fragCtx = fragCanvas.getContext("2d");
      frag = ctx.createImageData(canvas.width, canvas.height);

      // grille de fragments (couleur moyenne de chaque case)
      const sw = Math.max(1, Math.round(imgW / STEP));
      const sh = Math.max(1, Math.round(imgH / STEP));
      cellW = imgW / sw;
      cellH = imgH / sh;
      const small = document.createElement("canvas");
      small.width = sw;
      small.height = sh;
      const sctx = small.getContext("2d");
      if (!sctx) return;
      sctx.drawImage(img, 0, 0, sw, sh);
      const data = sctx.getImageData(0, 0, sw, sh).data;
      const idx: number[] = [];
      for (let i = 0; i < sw * sh; i++) if (data[i * 4 + 3] > 2) idx.push(i);
      n = idx.length;
      px = new Float32Array(n); py = new Float32Array(n); th = new Float32Array(n);
      vx = new Float32Array(n); vy = new Float32Array(n);
      cr = new Uint8ClampedArray(n); cg = new Uint8ClampedArray(n); cb = new Uint8ClampedArray(n); ca = new Uint8ClampedArray(n);
      idx.forEach((i, k) => {
        const x = i % sw, y = (i / sw) | 0;
        px[k] = imgX + x * cellW;
        py[k] = imgY + y * cellH;
        // la dissolution balaie le disque de gauche à droite, avec du grain
        // (tous les fragments ont fini leur vol avant D = 0.97, quand le certificat apparaît)
        th[k] = (x / sw) * 0.5 + Math.random() * 0.18;
        vx[k] = 0.4 + Math.random() * 1.2;
        vy[k] = 0.6 + Math.random() * 1.6;
        cr[k] = data[i * 4]; cg[k] = data[i * 4 + 1]; cb[k] = data[i * 4 + 2]; ca[k] = data[i * 4 + 3];
      });
      order = Uint32Array.from({ length: n }, (_, k) => k).sort((a, b) => th[a] - th[b]);
      prevX = new Int32Array(n); prevY = new Int32Array(n); curX = new Int32Array(n); curY = new Int32Array(n);
      prevM = 0;
      kick();
    };

    const fillBlock = (buf: Uint8ClampedArray, cw: number, chh: number, x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number, a: number) => {
      const xa = Math.max(0, x0), xb = Math.min(cw, x1), ya = Math.max(0, y0), yb = Math.min(chh, y1);
      for (let y = ya; y < yb; y++) {
        let o = (y * cw + xa) * 4;
        for (let x = xa; x < xb; x++, o += 4) {
          buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = a;
        }
      }
    };

    // Case k (rectangle entier en pixels du canevas, mêmes arrondis qu'avant) ajoutée au tracé
    const cellRect = (c: CanvasRenderingContext2D, k: number) => {
      const x0 = Math.floor(px[k] * dpr), y0 = Math.floor(py[k] * dpr);
      c.rect(x0, y0, Math.ceil((px[k] + cellW) * dpr) - x0, Math.ceil((py[k] + cellH) * dpr) - y0);
    };

    // Efface les cases détachées (D > seuil) de « rem » : coordonnées entières, donc effacement exact
    const updateRem = (D: number) => {
      if (!rem || !base) return;
      if (remD < 0 || D < remD) {
        rem.globalCompositeOperation = "source-over";
        rem.clearRect(0, 0, canvas.width, canvas.height);
        rem.drawImage(base, 0, 0);
        remIdx = 0;
      }
      remD = D;
      if (remIdx >= n || th[order[remIdx]] >= D) return;
      rem.beginPath();
      while (remIdx < n && th[order[remIdx]] < D) cellRect(rem, order[remIdx++]);
      rem.globalCompositeOperation = "destination-out";
      rem.fill();
    };

    /**
     * Même image qu'avant (copie du tampon de base + boucles de pixels + putImageData du canevas
     * entier), produite autrement : 1) copie du « reste » (base moins les cases détachées) ;
     * 2) les fragments en vol sont écrits pixel par pixel dans leur calque, exactement comme
     * avant (le dernier écrit l'emporte), puis les pixels sous eux sont effacés et le calque
     * est posé par-dessus : chaque fragment remplace donc les pixels sous lui, comme avant.
     */
    const draw = (D: number) => {
      if (!base || !rem || !frag || !fragCtx) return;
      const buf = frag.data;
      const cw = canvas.width, chh = canvas.height;
      updateRem(D);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, cw, chh);
      ctx.drawImage(rem.canvas, 0, 0);

      const size = Math.max(1, Math.round(STEP * dpr * 0.8));
      // rectangle modifié dans le calque (fragments de l'image précédente + de celle-ci)
      let bx0 = cw, by0 = chh, bx1 = 0, by1 = 0;
      for (let j = 0; j < prevM; j++) {
        const x = prevX[j], y = prevY[j];
        fillBlock(buf, cw, chh, x, y, x + size, y + size, 0, 0, 0, 0);
        if (x < bx0) bx0 = x; if (y < by0) by0 = y; if (x + size > bx1) bx1 = x + size; if (y + size > by1) by1 = y + size;
      }
      let m = 0;
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const t = clamp((D - th[k]) / 0.28);
        if (t <= 0 || t >= 1) continue;
        const e = t * t;
        const x = Math.round((px[k] + vx[k] * e * 160) * dpr);
        const y = Math.round((py[k] - vy[k] * e * 190) * dpr);
        if (x >= cw || y >= chh || x + size <= 0 || y + size <= 0) continue;
        fillBlock(buf, cw, chh, x, y, x + size, y + size,
          cr[k] + (46 - cr[k]) * t, cg[k] + (183 - cg[k]) * t, cb[k] + (100 - cb[k]) * t, ca[k] * (1 - t));
        ctx.rect(x, y, size, size);
        curX[m] = x; curY[m] = y; m++;
        if (x < bx0) bx0 = x; if (y < by0) by0 = y; if (x + size > bx1) bx1 = x + size; if (y + size > by1) by1 = y + size;
      }
      bx0 = Math.max(0, bx0); by0 = Math.max(0, by0); bx1 = Math.min(cw, bx1); by1 = Math.min(chh, by1);
      if (bx1 > bx0 && by1 > by0) fragCtx.putImageData(frag, 0, 0, bx0, by0, bx1 - bx0, by1 - by0);
      if (m) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(fragCtx.canvas, 0, 0);
      }
      [prevX, curX] = [curX, prevX];
      [prevY, curY] = [curY, prevY];
      prevM = m;
    };

    const frame = () => {
      raf = 0;
      if (!visible || !n) return;
      const r = track.getBoundingClientRect();
      const P = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      const D = reduce ? 0 : clamp((P - 0.08) / 0.72);
      De = reduce ? D : De + (D - De) * 0.12;
      draw(De);
      const isDone = reduce || De > 0.97;
      if (isDone !== shown) {
        shown = isDone;
        setDone(isDone);
      }
      if (!reduce && Math.abs(D - De) > 0.0005) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    img.onload = build;
    if (img.complete) build();
    const ro = new ResizeObserver(build);
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      kick();
    });
    io.observe(track);
    window.addEventListener("scroll", kick, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      img.onload = null;
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", kick);
    };
  }, []);

  return (
    <section data-theme="dark" className="relative text-mist">
      <div ref={trackRef} className="relative h-[220vh] motion-reduce:h-auto lg:h-[240vh] motion-reduce:lg:h-auto">
        <div className="sticky top-0 h-[100svh] min-h-[540px] overflow-hidden motion-reduce:static motion-reduce:h-auto lg:min-h-[620px]">
          <div className="mx-auto grid h-full w-full max-w-6xl grid-rows-[auto_1fr] gap-6 px-5 pb-8 pt-[5.5rem] motion-reduce:py-20 short:gap-4 sm:px-8 lg:grid-cols-12 lg:grid-rows-1 lg:items-center lg:gap-12 lg:pt-32">
            <div className="lg:col-span-5">
              <p className="text-sm font-semibold text-lime">{labels.eyebrow}</p>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,4.4vw,3.6rem)] font-bold leading-[1.04] tracking-[-0.03em] text-mist">
                {labels.title}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-moss sm:text-base lg:mt-6 lg:text-lg">{labels.text}</p>
              <ul className="mt-6 hidden space-y-2.5 sm:block">
                {labels.points.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-sm font-medium text-mist sm:text-base">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/15">
                      <Check className="h-3.5 w-3.5 text-lime" aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/destruction-des-donnees"
                className="group mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-accent px-5 py-3 font-display text-sm font-semibold text-ink transition-colors hover:bg-paper lg:mt-8"
              >
                {labels.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>

            <div className="relative min-h-0 motion-reduce:h-[50svh] lg:col-span-7 lg:h-[min(70svh,620px)]">
              <div ref={boxRef} aria-hidden="true" className="absolute inset-0">
                <canvas
                  ref={canvasRef}
                  className={`absolute left-0 top-0 transition-opacity duration-500 ${done ? "opacity-0" : "opacity-100"}`}
                />
              </div>
              {/* Certificat qui apparaît une fois le disque détruit */}
              <div
                className={`pointer-events-none absolute left-1/2 top-1/2 w-[min(86%,340px)] -translate-x-1/2 -translate-y-1/2 transition-[opacity,scale] duration-700 ${
                  done ? "scale-100 opacity-100" : "scale-90 opacity-0"
                }`}
              >
                <div className="rounded-2xl border border-white/10 bg-paper p-5 text-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime">
                      <ShieldCheck className="h-5 w-5 text-ink" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-display text-base font-bold leading-tight sm:text-lg">{labels.stampTitle}</p>
                      <p className="text-sm font-semibold text-emerald">{labels.stampLine}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2" aria-hidden="true">
                    <span className="block h-1.5 w-full rounded-full bg-ink/10" />
                    <span className="block h-1.5 w-4/5 rounded-full bg-ink/10" />
                    <span className="block h-1.5 w-3/5 rounded-full bg-ink/10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
