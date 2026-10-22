"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring
} from "framer-motion";
import { ArrowRight, CalendarCheck, Check, ClipboardList, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type StepItem = { title: string; line: string };
export type StepsMock = {
  rows: string[];
  items: string;
  minimum: string;
  reply: string;
  date: string;
  free: string;
  within: string;
};
export type StepsHeading = { eyebrow: string; title: string; subtitle: string };

const ICONS = [ClipboardList, CalendarCheck, Truck];
const EASE = [0.16, 1, 0.3, 1] as const;
/** Exemple repris de la description d'origine : 45 ordinateurs, 30 écrans CRT, 6 imprimantes. */
const EXAMPLE = [45, 30, 6];

/**
 * « Comment ça marche » : la section s'épingle et le défilement fait avancer les étapes une à une,
 * avec une barre de progression. Un clic sur une étape y amène directement.
 */
export function StepsTimeline({
  heading,
  items,
  mock,
  cta
}: {
  heading: StepsHeading;
  items: StepItem[];
  mock: StepsMock;
  cta: string;
}) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  const n = items.length;

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduce) return;
    const next = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    setActive((a) => (a === next ? a : next));
  });

  const select = (i: number) => {
    setActive(i);
    const track = trackRef.current;
    if (reduce || !track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.offsetHeight - window.innerHeight;
    const target = top + ((i + 0.5) / n) * travel;
    if (window.__lenis) window.__lenis.scrollTo(target, { duration: 1.1 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <div ref={trackRef} className="relative h-[280vh] motion-reduce:h-auto lg:h-[300vh] motion-reduce:lg:h-auto">
      <div className="sticky top-0 flex h-[100svh] items-center pb-4 pt-32 motion-reduce:relative motion-reduce:h-auto motion-reduce:py-16 lg:pb-6">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-emerald">{heading.eyebrow}</p>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,3.6vw,2.75rem)] font-bold leading-tight tracking-[-0.02em] text-ink">
              {heading.title}
            </h2>
            <p className="mt-2 hidden text-base leading-relaxed text-moss sm:block">{heading.subtitle}</p>
          </div>

          <div className="mt-6 grid items-center gap-6 lg:mt-10 lg:grid-cols-12 lg:gap-12">
            {/* Étapes + progression */}
            <div className="relative lg:col-span-5">
              {/* La ligne de progression est limitée à la liste (elle ne touche plus le bouton) */}
              <div className="relative">
              <div aria-hidden="true" className="absolute bottom-6 left-[32.5px] top-6 w-[3px] overflow-hidden rounded-full bg-ink/10 motion-reduce:hidden sm:left-[34.5px]">
                <motion.div className="h-full w-full origin-top rounded-full bg-lime" style={{ scaleY: progress }} />
              </div>
              <ol className="relative space-y-2.5">
                {items.map((step, i) => {
                  const Icon = ICONS[i] ?? Check;
                  const on = i === active;
                  const done = i < active;
                  return (
                    <li key={step.title}>
                      <button
                        type="button"
                        onClick={() => select(i)}
                        aria-current={on ? "step" : undefined}
                        className={`relative flex w-full items-start gap-4 rounded-2xl p-3.5 text-left transition-[background-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:p-4 ${
                          on ? "bg-ink text-paper shadow-[0_20px_40px_-24px_rgba(10,10,10,0.6)]" : "text-ink hover:bg-sand"
                        }`}
                      >
                        <span
                          className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 ${
                            on ? "bg-lime text-ink" : done ? "bg-ink text-lime" : "bg-paper text-ink ring-1 ring-ink/10"
                          }`}
                        >
                          {done ? <Check className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
                        </span>
                        <span>
                          <span className="block font-display text-base font-bold leading-snug sm:text-lg">{step.title}</span>
                          <span
                            className={`mt-0.5 text-sm leading-relaxed transition-colors ${
                              on ? "block text-paper/75" : "hidden text-moss sm:block"
                            }`}
                          >
                            {step.line}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              </div>
              <Link
                href="/formulaire-de-ramassage"
                className="group mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-accent px-6 py-3.5 font-display text-sm font-semibold text-ink transition-[filter] hover:brightness-95 sm:text-base"
              >
                {cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>

            {/* Aperçu de l'étape active */}
            <div className="hidden lg:col-span-7 lg:block">
              <StepPreview active={active} mock={mock} reduce={!!reduce} />
            </div>
          </div>
          <div className="mt-5 lg:hidden">
            <StepPreview active={active} mock={mock} reduce={!!reduce} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepPreview({ active, mock, reduce }: { active: number; mock: StepsMock; reduce: boolean }) {
  const enter = reduce ? { duration: 0 } : { duration: 0.6, ease: EASE };
  return (
    <div data-stage className="relative flex h-[min(28svh,230px)] items-center justify-center overflow-hidden rounded-[2rem] bg-sand p-4 sm:h-[300px] sm:p-5 lg:h-[min(52svh,440px)] lg:p-10">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: enter }}
          exit={{ opacity: 0, y: -16, filter: "blur(6px)", transition: reduce ? { duration: 0 } : { duration: 0.3 } }}
          className="flex h-full w-full items-center justify-center"
        >
          {active === 0 && (
            <div className="w-full max-w-sm scale-[0.78] rounded-2xl bg-paper p-5 shadow-[0_24px_50px_-28px_rgba(10,10,10,0.4)] sm:scale-100 sm:p-6">
              <ul className="space-y-3">
                {mock.rows.map((row, i) => (
                  <li key={row} className="flex items-center justify-between gap-4 border-b border-line pb-3 text-sm font-medium sm:text-base">
                    {row}
                    <span className="rounded-lg bg-sand px-3 py-1 font-display font-bold tabular-nums">{EXAMPLE[i]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-display text-2xl font-bold tabular-nums">
                {EXAMPLE.reduce((a, b) => a + b, 0)} <span className="text-sm font-medium text-moss">{mock.items}</span>
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald sm:text-sm">
                <Check className="h-4 w-4" aria-hidden="true" />
                {mock.minimum}
              </p>
            </div>
          )}

          {active === 1 && (
            <div className="w-full max-w-sm scale-[0.78] rounded-2xl bg-paper p-5 shadow-[0_24px_50px_-28px_rgba(10,10,10,0.4)] sm:scale-100 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{mock.date}</p>
              <div className="mt-4 grid grid-cols-7 gap-1.5" aria-hidden="true">
                {Array.from({ length: 21 }, (_, d) => (
                  <span
                    key={d}
                    className={`flex aspect-square items-center justify-center rounded-lg text-xs font-semibold sm:text-sm ${
                      d === 10 ? "bg-ink text-paper" : d % 7 > 4 ? "text-ink/30" : "bg-sand text-ink/70"
                    }`}
                  >
                    {d + 1}
                  </span>
                ))}
              </div>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald sm:text-sm">
                <Check className="h-4 w-4" aria-hidden="true" />
                {mock.reply}
              </p>
            </div>
          )}

          {active === 2 && <VanArrival mock={mock} reduce={reduce} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* Repères mesurés sur camionnette-logo.webp (1200 × 497), en fraction de la largeur / hauteur de l'image. */
const REAR_TIRE = { x: 0.812, y: 0.995 };
const WHEELS = [
  { left: "7.8%", top: "67%", size: "13%" },
  { left: "75%", top: "70.5%", size: "12.4%" }
];
/** Arrivée : vitesse constante, puis freinage appuyé jusqu'à l'arrêt (en secondes). */
const DELAY = 0.1;
const CRUISE = 0.5;
const BRAKE = 0.75;
const PITCH = 1.4; // plongée du nez au freinage, en degrés

type Puff = { x: number; y: number; vx: number; vy: number; r: number; grow: number; age: number; life: number; a: number; rot: number; spr: number };

/** Petites volutes de fumée, pré-rendues une fois (plusieurs bulles douces superposées). */
function makeSprites() {
  return Array.from({ length: 3 }, () => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (!g) return c;
    for (let i = 0; i < 7; i++) {
      const x = 64 + (Math.random() - 0.5) * 36;
      const y = 64 + (Math.random() - 0.5) * 36;
      const r = 26 + Math.random() * 26;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(150,150,154,0.62)");
      grad.addColorStop(0.55, "rgba(170,170,174,0.26)");
      grad.addColorStop(1, "rgba(190,190,194,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    }
    return c;
  });
}

/**
 * Étape 3 : la camionnette entre en trombe par la droite, freine fort (fumée sur les pneus arrière,
 * roues floues, le nez plonge), puis se pose avec un léger rebond de suspension.
 */
function VanArrival({ reduce }: { mock: StepsMock; reduce: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const vanRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const wheelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filterId = `van-blur-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const box = boxRef.current;
    const van = vanRef.current;
    const body = bodyRef.current;
    const canvas = canvasRef.current;
    const stage = box?.closest<HTMLElement>("[data-stage]");
    const ctx = canvas?.getContext("2d");
    if (reduce || !box || !van || !body || !canvas || !stage || !ctx) return;
    // l'aperçu existe en double (mobile et bureau) : la copie masquée reste garée, sans animation
    if (!stage.offsetWidth) {
      van.style.transform = "none";
      return;
    }

    const sprites = makeSprites();
    const puffs: Puff[] = [];
    let dpr = 1, offX = 0, offY = 0, startX = 0, w = 0, h = 0;

    const measure = () => {
      const s = stage.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = b.width;
      h = b.height;
      // le canevas couvre toute la scène (+ une marge), repère local = boîte de la camionnette
      offX = s.left - b.left;
      offY = s.top - b.top - 40;
      canvas.style.left = `${offX}px`;
      canvas.style.top = `${offY}px`;
      canvas.style.width = `${s.width}px`;
      canvas.style.height = `${s.height + 80}px`;
      canvas.width = Math.round(s.width * dpr);
      canvas.height = Math.round((s.height + 80) * dpr);
      startX = s.right - b.left + 12;
    };
    measure();

    const v0 = startX / (CRUISE + BRAKE / 2);
    const stopAt = CRUISE + BRAKE;
    const state = (t: number) => {
      if (t <= 0) return { x: startX, v: v0 };
      if (t < CRUISE) return { x: startX - v0 * t, v: v0 };
      if (t < stopAt) {
        const u = t - CRUISE;
        return { x: startX - v0 * CRUISE - v0 * u + (v0 * u * u) / (2 * BRAKE), v: v0 * (1 - u / BRAKE) };
      }
      return { x: 0, v: 0 };
    };

    const spawn = (x: number, y: number, speed: number, burst = false) => {
      puffs.push({
        x: x + Math.random() * w * 0.05,
        y: y - Math.random() * w * 0.03,
        vx: (burst ? (Math.random() - 0.3) * 90 : 40 + Math.random() * 90) + speed * 0.12,
        vy: -(12 + Math.random() * (burst ? 30 : 55)),
        r: w * (0.03 + Math.random() * 0.03),
        grow: w * (0.08 + Math.random() * 0.1),
        age: 0,
        life: 1.5 + Math.random() * 1.2,
        a: burst ? 0.6 : 0.4 + Math.random() * 0.3,
        rot: Math.random() * Math.PI * 2,
        spr: (Math.random() * sprites.length) | 0
      });
    };

    let raf = 0, t0 = 0, last = 0, acc = 0, burstDone = false;
    const frame = (now: number) => {
      if (!t0) t0 = last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000 - DELAY;
      const { x, v } = state(t);
      const k = v / v0;

      // caisse : plongée au freinage, rebond amorti à l'arrêt, vibrations de la route en roulant
      let rot = 0;
      if (t > CRUISE && t < stopAt) rot = -PITCH * Math.min(1, (t - CRUISE) / 0.18);
      else if (t >= stopAt) {
        const s = t - stopAt;
        rot = -PITCH * Math.exp(-4.5 * s) * Math.cos(9 * s);
      }
      const shake = k * (Math.sin(t * 57) * 0.6 + Math.sin(t * 23) * 0.4);
      van.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      body.style.transform = `translateY(${shake.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`;
      blurRef.current?.setAttribute("stdDeviation", `${(k * 5).toFixed(2)} 0`);
      body.style.filter = k > 0.04 ? `url(#${filterId})` : "none";
      for (const el of wheelRefs.current) if (el) el.style.opacity = Math.min(1, k * 1.6).toFixed(3);

      // fumée des pneus arrière : légère en roulant, épaisse au freinage, bouffée finale à l'arrêt
      const tx = x + REAR_TIRE.x * w;
      const ty = REAR_TIRE.y * h;
      if (t > 0 && t < stopAt) {
        acc += dt * (t > CRUISE ? 95 : 22);
        while (acc >= 1) { spawn(tx, ty, v); acc -= 1; }
      } else if (t >= stopAt && !burstDone) {
        burstDone = true;
        for (let i = 0; i < 16; i++) spawn(tx, ty, 0, true);
      }

      ctx.setTransform(dpr, 0, 0, dpr, -offX * dpr, -offY * dpr);
      ctx.clearRect(offX, offY, canvas.width / dpr, canvas.height / dpr);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.age += dt;
        if (p.age >= p.life) { puffs.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - 1.6 * dt;
        p.vy = p.vy * (1 - 1.1 * dt) - 10 * dt;
        p.r += p.grow * dt * (1 - p.age / p.life);
        p.rot += dt * 0.4;
        const life = p.age / p.life;
        ctx.globalAlpha = p.a * Math.min(1, p.age / 0.1) * (1 - life) ** 1.6;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(sprites[p.spr], -p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (t < stopAt + 1.5 || puffs.length) raf = requestAnimationFrame(frame);
      else body.style.transform = "none";
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce, filterId]);

  return (
    <div ref={boxRef} className="relative w-full max-w-[560px]">
      {/* Route */}
      <span aria-hidden="true" className="absolute bottom-[1%] left-0 right-0 h-px bg-ink/15" />
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <filter id={filterId} x="-10%" y="0" width="120%" height="100%">
          <feGaussianBlur ref={blurRef} stdDeviation="0 0" />
        </filter>
      </svg>
      <div ref={vanRef} className="relative will-change-transform" style={reduce ? undefined : { transform: "translate3d(200vw,0,0)" }}>
        <span aria-hidden="true" className="absolute bottom-[-2%] left-[4%] h-[9%] w-[92%] rounded-[50%] bg-ink/30 blur-md" />
        <div ref={bodyRef} className="relative origin-[50%_88%]">
          <Image
            src="/images/objets/camionnette-logo.webp"
            alt=""
            width={1200}
            height={497}
            sizes="(max-width: 1024px) 90vw, 40vw"
            className="h-auto w-full drop-shadow-[0_18px_22px_rgba(10,10,10,0.25)]"
          />
          {/* Roues floues tant que la camionnette roule */}
          {WHEELS.map((wh, i) => (
            <span
              key={wh.left}
              ref={(el) => { wheelRefs.current[i] = el; }}
              aria-hidden="true"
              className="absolute aspect-square rounded-full opacity-0 backdrop-blur-[3px]"
              style={{ left: wh.left, top: wh.top, width: wh.size }}
            />
          ))}
        </div>
      </div>
      {!reduce && <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute z-10" />}
    </div>
  );
}
