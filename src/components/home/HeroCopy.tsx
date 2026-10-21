"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants
} from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { StaticAppPathname } from "@/i18n/routing";

export type HeroCopyLabels = {
  titleLead: string;
  titleAccent: string;
  since: string;
  years: YearsLabels;
  promise: string;
  ctaPrimary: string;
  ctaHow: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

/** Bloc de texte du hero : titre révélé mot par mot, « 20+ ans » compté, CTA magnétique. */
export function HeroCopy({ labels }: { labels: HeroCopyLabels }) {
  const reduce = useReducedMotion();
  // Le rendu initial est identique serveur/client ; le mouvement réduit ne change que les durées.
  const t = (duration: number, delay = 0) => (reduce ? { duration: 0 } : { duration, delay, ease: EASE });

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.09, delayChildren: reduce ? 0 : 0.1 } }
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: t(0.9) }
  };
  const word: Variants = {
    hidden: { y: "135%", opacity: 0 },
    show: { y: "0%", opacity: 1, transition: t(0.85) }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative z-10 max-w-xl lg:max-w-[52%]"
    >
      <h1 className="font-display font-bold tracking-[-0.035em] text-paper">
        <Line
          text={labels.titleLead}
          wordVariants={word}
          className="text-[clamp(1.3rem,2.5vw,2.05rem)] font-semibold leading-tight tracking-[-0.02em] text-lime"
        />
        <Line text={labels.titleAccent} wordVariants={word} className="mt-1 text-[clamp(2.4rem,5vw,4.6rem)] leading-[1.04]" />
      </h1>

      <motion.div variants={item} className="hero-safe mt-7">
        <YearsBadge years={labels.years} sentence={labels.since} reduce={!!reduce} />
      </motion.div>

      <motion.p
        variants={item}
        className="hero-safe mt-6 max-w-md text-base leading-relaxed text-paper/80 sm:text-lg"
      >
        {labels.promise}
      </motion.p>

      <motion.div variants={item} className="hero-safe mt-8 flex flex-wrap items-center gap-4">
        <MagneticCta href="/formulaire-de-ramassage" label={labels.ctaPrimary} reduce={!!reduce} />
        <Link
          href="/informations"
          className="group relative px-1 py-2 font-display text-sm font-semibold text-paper sm:text-base"
        >
          {labels.ctaHow}
          <span className="absolute bottom-1 left-1 right-1 h-px origin-left bg-paper/40 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-110 group-hover:bg-paper" />
        </Link>
      </motion.div>
    </motion.div>
  );
}

/** Une ligne du titre : chaque mot glisse depuis un masque (marge prévue pour les jambages). */
function Line({ text, wordVariants, className = "" }: { text: string; wordVariants: Variants; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={`block ${className}`}>
      {words.map((w, i) => (
        <span key={i} className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
          <motion.span variants={wordVariants} className="hero-safe inline-block will-change-transform">
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export type YearsLabels = { prefix: string; number: number; unit: string; suffix: string; replay: string };

/**
 * « Plus de 20 ans au Grand Montréal » façon tableau de score :
 * les chiffres roulent comme un compteur, sautillent au survol et repartent au clic.
 */
function YearsBadge({ years, sentence, reduce }: { years: YearsLabels; sentence: string; reduce: boolean }) {
  const [spin, setSpin] = useState(0);
  const [bursts, setBursts] = useState<number[]>([]);
  const digits = String(years.number).split("").map(Number);

  const replay = () => {
    if (reduce) return;
    setSpin((s) => s + 1);
    const id = Date.now();
    setBursts((b) => [...b, id]);
    window.setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 900);
  };

  return (
    <motion.button
      type="button"
      onClick={replay}
      aria-label={`${sentence}. ${years.replay}`}
      // Toujours définis (rendu serveur = client) ; en mouvement réduit les variantes sont neutres
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="tap"
      variants={{ rest: { scale: 1 }, hover: { scale: 1 }, tap: { scale: reduce ? 1 : 0.97 } }}
      className="group relative inline-flex items-center gap-4 rounded-[1.4rem] bg-white/[0.07] py-3 pl-4 pr-5 text-left ring-1 ring-white/15 transition-colors duration-300 hover:bg-white/[0.11] sm:gap-5 sm:pl-5 sm:pr-6"
    >
      <span aria-hidden="true" className="flex flex-col">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-paper/75 sm:text-sm">{years.prefix}</span>
        <span className="mt-0.5 flex items-end gap-2">
          <motion.span
            variants={{ rest: { y: 0, rotate: 0 }, hover: reduce ? { y: 0, rotate: 0 } : { y: -4, rotate: -3 } }}
            transition={{ type: "spring", stiffness: 420, damping: 14 }}
            className="relative inline-flex -skew-x-6 font-display text-[clamp(2.7rem,4.4vw,3.8rem)] font-extrabold leading-none tracking-[-0.04em] text-lime"
          >
            {digits.map((d, i) => (
              <Digit key={`${i}-${spin}`} value={d} index={i} total={digits.length} reduce={reduce} />
            ))}
            {bursts.map((id) => (
              <Burst key={id} />
            ))}
          </motion.span>
          <span className="pb-1 font-display text-xl font-bold text-paper sm:text-2xl">{years.unit}</span>
          <motion.span
            variants={{
              rest: { scale: 0, rotate: -45, opacity: 0 },
              hover: reduce ? { scale: 1, rotate: 0, opacity: 1, transition: { duration: 0 } } : { scale: 1, rotate: 0, opacity: 1 }
            }}
            transition={{ type: "spring", stiffness: 380, damping: 16 }}
            className="mb-auto text-lime"
          >
            <Sparkles className="h-5 w-5" />
          </motion.span>
        </span>
      </span>
      <span aria-hidden="true" className="h-12 w-px bg-white/15" />
      <span aria-hidden="true" className="max-w-[9.5rem] font-display text-base font-semibold leading-snug text-paper sm:text-lg">
        {years.suffix}
      </span>
    </motion.button>
  );
}

/** Un chiffre du compteur : une bande 0-9 qui roule jusqu'à la bonne valeur (le dernier fait un tour complet). */
function Digit({ value, index, total, reduce }: { value: number; index: number; total: number; reduce: boolean }) {
  const last = index === total - 1;
  const target = last ? value + 10 : value;
  // Rendu serveur = valeur finale (« 20 » même sans JavaScript) ; l'animation repart de 0 au montage
  const pos = useMotionValue(target);
  const y = useTransform(pos, (v) => `${-v}em`);

  useEffect(() => {
    if (reduce) return;
    pos.set(0);
    const controls = animate(pos, target, {
      type: "spring",
      stiffness: 46,
      damping: 13,
      mass: 1,
      delay: 0.55 + index * 0.12
    });
    return () => controls.stop();
  }, [pos, target, index, reduce]);

  const strip = Array.from({ length: last ? 20 : 10 }, (_, n) => n % 10);
  return (
    <span className="relative inline-block h-[1em] overflow-hidden tabular-nums">
      <span className="invisible">{value}</span>
      <motion.span style={{ y }} className="absolute left-0 top-0 flex flex-col">
        {strip.map((n, k) => (
          <span key={k} className="h-[1em] leading-none">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** Petite gerbe de points verts au clic. */
function Burst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-lime"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * 46, y: Math.sin(a) * 46, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </span>
  );
}

/** CTA principal : suit légèrement le pointeur (ressort), flèche dans sa pastille, vert au survol. */
function MagneticCta({ href, label, reduce }: { href: StaticAppPathname; label: string; reduce: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });
  const ax = useTransform(sx, (v) => v * 0.6);
  const ay = useTransform(sy, (v) => v * 0.6);

  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.18);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.28);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span ref={ref} style={{ x: sx, y: sy }} onPointerMove={onMove} onPointerLeave={onLeave} className="inline-flex">
      <Link
        href={href}
        className="group inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-paper py-1.5 pl-6 pr-1.5 font-display text-sm font-semibold text-ink shadow-[0_18px_40px_-18px_rgba(3,40,20,0.7)] transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#22c55e] active:scale-[0.98] sm:text-base"
      >
        {label}
        <motion.span
          style={{ x: ax, y: ay }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-paper transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        >
          <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-rotate-45" aria-hidden="true" />
        </motion.span>
      </Link>
    </motion.span>
  );
}
