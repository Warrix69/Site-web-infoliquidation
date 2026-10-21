"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type BinLabels = {
  title: string;
  text: string;
  counterLabel: string;
  minimum: string;
  full: string;
  shake: string;
  sceneLabel: string;
};

const IMG = "/images/bac/";
const TOTAL = 10;

/** Chaque chute : image, largeur (% du bac), point d'arrivée (% du bac), rotation finale. */
const DROPS = [
  { src: "disque-dur", w: 38, x: 50, y: 60, r: -8 },
  { src: "telephone", w: 30, x: 34, y: 55, r: 18 },
  { src: "portable", w: 70, x: 52, y: 44, r: -6 },
  { src: "routeur", w: 34, x: 66, y: 50, r: 12 },
  { src: "souris", w: 24, x: 40, y: 36, r: 10 },
  { src: "telephone", w: 28, x: 62, y: 30, r: -24 },
  { src: "disque-dur", w: 34, x: 46, y: 22, r: 8 },
  { src: "clavier", w: 84, x: 50, y: 6, r: -6 },
  { src: "souris", w: 22, x: 76, y: -3, r: 16 },
  { src: "ecran", w: 44, x: 32, y: -16, r: -5 }
] as const;

const START = 0.05;
const STEP = 0.088;
const DUR = 0.09;
const LAND = 0.82;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/**
 * Le bac bleu se remplit au défilement : dix appareils y tombent un à un, en 3D,
 * le compteur monte jusqu'au minimum de ramassage, le symbole passe au vert.
 * Le bac suit le pointeur et se secoue au clic.
 */
export function BinSection({ labels, cta }: { labels: BinLabels; cta: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const glowRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    const scene = sceneRef.current;
    const tilt = tiltRef.current;
    if (!track || !scene || !tilt) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let sceneH = scene.clientHeight;
    let binH = tilt.offsetHeight;
    let raf = 0;
    let visible = true;
    let shown = -1;
    let Pe = reduce ? 1 : 0;
    const pointer = { x: 0, eased: 0 };

    const frame = () => {
      raf = 0;
      if (!visible) return;
      const rect = track.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight);
      const P = reduce ? 1 : clamp(-rect.top / total);
      // progression lissée : les chutes restent fluides même avec la molette
      Pe = reduce ? 1 : Pe + (P - Pe) * 0.14;

      let landed = 0;
      let impact = 0;
      DROPS.forEach((d, i) => {
        const el = itemRefs.current[i];
        if (!el) return;
        const t = clamp((Pe - (START + i * STEP)) / DUR);
        let fall: number;
        let air: number;
        if (t < LAND) {
          const g = t / LAND;
          fall = 1 - g * g;
          air = 1 - g;
        } else {
          const b = (t - LAND) / (1 - LAND);
          fall = -Math.sin(b * Math.PI) * 0.02;
          air = 0;
          impact = Math.max(impact, Math.sin(b * Math.PI));
        }
        if (t >= LAND) landed++;
        // départ juste sous le haut de la scène : la chute reste visible du début à la fin
        const restY = sceneH * 0.95 - binH + (d.y / 100) * binH;
        const dy = -fall * Math.max(0, restY - sceneH * 0.04);
        const side = i % 2 ? 1 : -1;
        const rx = air * 55 * side;
        const ry = air * 40 * -side;
        const rz = d.r + air * 30 * side;
        el.style.opacity = t > 0 ? Math.min(1, t * 12).toFixed(2) : "0";
        el.style.transform = `translate(-50%, -50%) translate3d(0, ${dy.toFixed(1)}px, 0) perspective(700px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotate(${rz.toFixed(1)}deg)`;
      });

      const fullness = clamp((Pe - 0.9) / 0.06);
      pointer.eased += (pointer.x - pointer.eased) * 0.1;
      const rot = pointer.eased * 3;
      tilt.style.transform = `translate3d(0, ${(impact * 5).toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${(1 + impact * 0.012).toFixed(4)}, ${(1 - impact * 0.028).toFixed(4)})`;
      if (glowRef.current) glowRef.current.style.opacity = fullness.toFixed(3);
      if (barRef.current) barRef.current.style.transform = `scaleX(${(landed / TOTAL).toFixed(3)})`;
      if (landed !== shown) {
        shown = landed;
        setCount(landed);
      }
      const moving = Math.abs(P - Pe) > 0.0004 || Math.abs(pointer.x - pointer.eased) > 0.002;
      if (moving) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      const r = scene.getBoundingClientRect();
      pointer.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      kick();
    };
    const onLeave = () => {
      pointer.x = 0;
      kick();
    };
    const ro = new ResizeObserver(() => {
      sceneH = scene.clientHeight;
      binH = tilt.offsetHeight;
      kick();
    });
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      kick();
    });

    ro.observe(scene);
    ro.observe(tilt);
    io.observe(track);
    window.addEventListener("scroll", kick, { passive: true });
    if (fine && !reduce) {
      scene.addEventListener("pointermove", onMove);
      scene.addEventListener("pointerleave", onLeave);
    }
    kick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", kick);
      scene.removeEventListener("pointermove", onMove);
      scene.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const full = count >= TOTAL;

  // Petite pluie de confettis quand le 10e appareil tombe dans le bac
  const [confetti, setConfetti] = useState(0);
  const wasFull = useRef(false);
  useEffect(() => {
    if (full && !wasFull.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setConfetti((c) => c + 1);
    }
    wasFull.current = full;
  }, [full]);

  const shake = () => {
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
  };

  return (
    <section className="relative bg-paper text-ink">
      <div ref={trackRef} className="relative h-[170vh] motion-reduce:h-auto lg:h-[190vh] motion-reduce:lg:h-auto">
        <div className="sticky top-0 flex h-[100svh] items-center pb-4 pt-28 motion-reduce:static motion-reduce:h-auto motion-reduce:py-16 lg:pt-32">
          <div className="mx-auto h-[min(76svh,640px)] w-full max-w-6xl px-5 motion-reduce:h-[640px] sm:px-8">
          <div className="flex h-full flex-col overflow-hidden rounded-[2rem] bg-sand p-6 sm:p-8 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:p-12">
            {/* Texte + compteur */}
            <div className="relative z-30 lg:col-span-5">
              <h2 className="font-display text-[clamp(1.5rem,3.6vw,2.6rem)] font-bold leading-[1.08] tracking-[-0.02em] text-ink">
                {labels.title}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-moss sm:text-base lg:mt-5">{labels.text}</p>

              <div className="mt-5 lg:mt-10">
                <p className="font-display text-sm font-semibold text-ink">
                  <span className="text-2xl tabular-nums text-emerald lg:text-4xl">{count}</span>
                  <span className="text-ink/40"> / {TOTAL}</span> {labels.counterLabel}
                </p>
                <span className="mt-3 block h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink/10">
                  <span ref={barRef} className="block h-full w-full origin-left scale-x-0 rounded-full bg-emerald" />
                </span>
              </div>

              <div className="mt-4 min-h-[44px] lg:mt-6">
                {full ? (
                  <div className="flex flex-col gap-3" style={{ animation: "heroRiseIn 500ms ease-out both" }}>
                    <p className="text-sm font-semibold text-ink">{labels.full}</p>
                    <Link
                      href="/formulaire-de-ramassage"
                      className="group inline-flex items-center gap-2.5 self-start rounded-full bg-lime py-2 pl-5 pr-2 text-sm font-semibold text-ink ring-2 ring-lime transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-paper hover:text-emerald active:scale-[0.98]"
                    >
                      {cta}
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper text-emerald transition-colors duration-300 group-hover:bg-lime group-hover:text-ink">
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-moss">{labels.minimum}</p>
                )}
              </div>
            </div>

            {/* Scène */}
            <div ref={sceneRef} className="relative min-h-0 flex-1 lg:col-span-7 lg:h-full">
              <div
                aria-hidden="true"
                className="absolute bottom-[2%] left-1/2 h-6 w-[min(48%,220px)] -translate-x-1/2 rounded-[50%] bg-ink/25 blur-xl lg:w-[min(50%,280px)]"
              />

              <div className="absolute bottom-[4%] left-1/2 w-[min(50%,210px)] -translate-x-1/2 lg:w-[min(52%,270px)]">
                <div ref={tiltRef} className="origin-bottom will-change-transform">
                  <button
                    type="button"
                    onClick={shake}
                    onAnimationEnd={() => setShaking(false)}
                    aria-label={labels.shake}
                    className={`relative block aspect-[900/1150] w-full origin-bottom cursor-pointer rounded-lg ${
                      shaking ? "animate-[binShake_600ms_ease-in-out]" : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${IMG}bac.webp`}
                      alt=""
                      width={900}
                      height={1150}
                      draggable={false}
                      className="absolute inset-0 z-0 h-full w-full select-none"
                    />

                    <span role="img" aria-label={labels.sceneLabel} className="absolute inset-0 z-10">
                      {DROPS.map((d, i) => (
                        <span
                          key={i}
                          ref={(el) => {
                            itemRefs.current[i] = el;
                          }}
                          className="absolute block opacity-0 will-change-transform"
                          style={{
                            left: `${d.x}%`,
                            top: `${d.y}%`,
                            width: `${d.w}%`,
                            transform: "translate(-50%, -50%) translate3d(0, -150vh, 0)"
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${IMG}${d.src}.webp`}
                            alt=""
                            draggable={false}
                            className="block h-auto w-full select-none drop-shadow-[0_10px_12px_rgba(10,10,10,0.3)]"
                          />
                        </span>
                      ))}
                    </span>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${IMG}bac-avant.webp`}
                      alt=""
                      width={900}
                      height={1150}
                      draggable={false}
                      className="absolute inset-0 z-20 h-full w-full select-none"
                    />

                    <span
                      ref={glowRef}
                      aria-hidden="true"
                      className="absolute inset-0 z-30 opacity-0 [filter:drop-shadow(0_0_14px_rgba(0,198,90,0.75))]"
                    >
                      <span
                        className="absolute inset-0 bg-lime"
                        style={{
                          WebkitMaskImage: `url(${IMG}bac-symbole.png)`,
                          maskImage: `url(${IMG}bac-symbole.png)`,
                          WebkitMaskSize: "100% 100%",
                          maskSize: "100% 100%"
                        }}
                      />
                    </span>
                  </button>
                </div>
                {confetti > 0 && <Confetti key={confetti} />}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const CONFETTI_COLORS = ["var(--color-lime)", "var(--color-emerald)", "#a1ffc4", "#0a0a0a", "#ffffff"];

/** Gerbe de confettis qui jaillit du bac puis retombe en tournoyant. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (-90 + (Math.random() - 0.5) * 130) * (Math.PI / 180);
        const speed = 120 + Math.random() * 150;
        const shape = i % 3;
        return {
          x: Math.cos(angle) * speed,
          peak: Math.sin(angle) * speed,
          fall: 90 + Math.random() * 120,
          spin: (Math.random() - 0.5) * 900,
          delay: Math.random() * 0.12,
          duration: 1.5 + Math.random() * 0.6,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          w: shape === 0 ? 7 : shape === 1 ? 5 : 3,
          h: shape === 0 ? 11 : shape === 1 ? 5 : 13,
          round: shape === 1
        };
      }),
    []
  );

  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[18%] z-20">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-0 top-0 block shadow-[0_1px_2px_rgba(10,10,10,0.15)]"
          style={{ width: p.w, height: p.h, backgroundColor: p.color, borderRadius: p.round ? 999 : 1.5 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.6 }}
          animate={{
            x: [0, p.x * 0.75, p.x],
            y: [0, p.peak, p.peak + p.fall],
            rotate: [0, p.spin * 0.5, p.spin],
            opacity: [0, 1, 1, 0],
            scale: [0.6, 1, 1, 0.9]
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            x: { duration: p.duration, delay: p.delay, ease: [0.16, 1, 0.3, 1] },
            y: { duration: p.duration, delay: p.delay, times: [0, 0.32, 1], ease: [[0.2, 0.8, 0.4, 1], [0.5, 0, 0.9, 0.6]] },
            opacity: { duration: p.duration, delay: p.delay, times: [0, 0.05, 0.75, 1] },
            scale: { duration: p.duration, delay: p.delay, times: [0, 0.1, 0.8, 1] },
            rotate: { duration: p.duration, delay: p.delay, ease: "linear" }
          }}
        />
      ))}
    </span>
  );
}
