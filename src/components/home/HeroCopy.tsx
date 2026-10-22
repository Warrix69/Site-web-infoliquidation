"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
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

/** Délai CSS d'entrée (variable --d lue par .hero-word / .hero-item / .hero-digit). */
const delay = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;
const WORD_START = 0.05;
const WORD_STAGGER = 0.06;

/**
 * Bloc de texte du hero : titre révélé mot par mot, « 20+ ans » compté, CTA magnétique.
 * L'entrée est en CSS (globals.css) : le texte apparaît dès le premier affichage, même avant le JavaScript.
 */
export function HeroCopy({ labels }: { labels: HeroCopyLabels }) {
  const reduce = useReducedMotion();
  const leadCount = labels.titleLead.split(" ").length;

  return (
    // Mobile : « contents » pour que le titre, la 3D, le badge et les boutons s'ordonnent dans la colonne du hero
    <div className="contents lg:relative lg:z-10 lg:block lg:max-w-[52%]">
      <h1 className="order-1 font-display font-bold tracking-[-0.035em] text-paper">
        <Line
          text={labels.titleLead}
          start={0}
          className="text-[clamp(1.3rem,2.5vw,2.05rem)] font-semibold leading-tight tracking-[-0.02em] text-lime"
        />
        <Line text={labels.titleAccent} start={leadCount} className="mt-1 text-[clamp(2.3rem,5vw,4.6rem)] leading-[1.04]" />
      </h1>

      <div className="hero-item order-3 mt-3 lg:mt-7" style={delay(0.3)}>
        <YearsBadge years={labels.years} sentence={labels.since} reduce={!!reduce} />
      </div>

      <p
        className="hero-item order-4 mt-3 max-w-md text-sm leading-relaxed text-paper/85 sm:text-base lg:mt-6 lg:text-lg"
        style={delay(0.4)}
      >
        {labels.promise}
      </p>

      <div className="hero-item order-5 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 lg:mt-8" style={delay(0.5)}>
        <MagneticCta href="/formulaire-de-ramassage" label={labels.ctaPrimary} reduce={!!reduce} />
        <Link
          href="/informations"
          className="group relative px-1 py-2 font-display text-sm font-semibold text-paper sm:text-base"
        >
          {labels.ctaHow}
          <span className="absolute bottom-1 left-1 right-1 h-px origin-left bg-paper/40 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-110 group-hover:bg-paper" />
        </Link>
      </div>
    </div>
  );
}

/** Une ligne du titre : chaque mot glisse depuis un masque (marge prévue pour les jambages). */
function Line({ text, start, className = "" }: { text: string; start: number; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={`block ${className}`}>
      {words.map((w, i) => (
        <span key={i} className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
          <span className="hero-word inline-block" style={delay(WORD_START + (start + i) * WORD_STAGGER)}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
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
  // Une fois le compteur arrivé, le badge garde la pose « survol » (20 penché + étoile)
  const [settled, setSettled] = useState(false);
  const digits = String(years.number).split("").map(Number);

  useEffect(() => {
    if (reduce) {
      setSettled(true);
      return;
    }
    const id = window.setTimeout(() => setSettled(true), 1800);
    return () => window.clearTimeout(id);
  }, [reduce]);

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
      animate={settled ? "hover" : "rest"}
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
              <Digit key={`${i}-${spin}`} value={d} index={i} total={digits.length} replay={spin > 0} />
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

/**
 * Un chiffre du compteur : une bande 0-9 qui roule jusqu'à la bonne valeur (le dernier fait un tour complet).
 * Roulement en CSS (.hero-digit) : il part dès l'affichage, sans saut « 20 → 00 » à l'hydratation.
 */
function Digit({ value, index, total, replay }: { value: number; index: number; total: number; replay: boolean }) {
  const last = index === total - 1;
  const target = last ? value + 10 : value;
  const style = { ...delay((replay ? 0 : 0.45) + index * 0.12), "--to": `${-target}em` } as CSSProperties;

  const strip = Array.from({ length: last ? 20 : 10 }, (_, n) => n % 10);
  return (
    <span className="relative inline-block h-[1em] overflow-hidden tabular-nums">
      <span className="invisible">{value}</span>
      <span style={style} className="hero-digit absolute left-0 top-0 flex flex-col">
        {strip.map((n, k) => (
          <span key={k} className="h-[1em] leading-none">
            {n}
          </span>
        ))}
      </span>
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
        className="group inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-paper py-1.5 pl-6 pr-1.5 font-display text-sm font-semibold text-ink shadow-[0_18px_40px_-18px_rgba(3,40,20,0.7)] transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#00f060] active:scale-[0.98] sm:text-base"
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
