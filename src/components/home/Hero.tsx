"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { DeviceKey } from "./HeroDevices";

const HeroDevices = dynamic(() => import("./HeroDevices").then((m) => m.HeroDevices), {
  ssr: false,
  loading: () => <HeroDevicesSkeleton />
});

/**
 * Précharge le chunk HeroDevices (Three + drei + PBR) dès que le script
 * s'exécute, pour que le canvas apparaisse plus vite au premier paint.
 */
if (typeof window !== "undefined") {
  // Déclenche le fetch du chunk JS en parallèle du rendu HTML
  import("./HeroDevices").catch(() => {});
}

/** Placeholder visible pendant que le bundle 3D charge — évite le flash blanc. */
function HeroDevicesSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-40 w-40 animate-pulse">
        <div className="absolute inset-0 rounded-3xl bg-emerald/10" />
        <div className="absolute inset-4 rounded-2xl bg-emerald/15" />
      </div>
    </div>
  );
}

export type HeroLabels = {
  badge: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  proofs: string[];
  scrollHint: string;
};

const DEVICE_LABEL: Record<DeviceKey, string> = {
  laptop: "Portables",
  phone: "Téléphones",
  tower: "Tours & serveurs",
  switch: "Équipements réseau",
  monitor: "Écrans"
};

const MANIFEST_SAMPLES = [
  { time: "14:22", city: "Montréal", items: 18 },
  { time: "11:08", city: "Laval", items: 32 },
  { time: "09:41", city: "Saint-Eustache", items: 46 },
  { time: "16:40", city: "Longueuil", items: 12 },
  { time: "13:15", city: "Terrebonne", items: 24 },
  { time: "10:02", city: "Brossard", items: 51 },
  { time: "15:33", city: "Blainville", items: 15 },
  { time: "08:50", city: "Mirabel", items: 28 }
];

/* ------------------------------------------------------------------ */
/* Titre éditorial animé                                               */
/* ------------------------------------------------------------------ */

/** Mot interactif : glow vert + translation subtile au hover de la souris */
function HoverWord({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-block cursor-default transition-colors duration-300 hover:text-emerald ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Chip interactive « 20 ans » :
 * - compteur qui monte de 0 à 20 au premier survol / scroll
 * - au hover : pill verte pleine, texte blanc, échelle +2 %, confettis verts qui jaillissent
 * - au clic : relance la count-up pour le fun
 */
function YearsChip() {
  const [count, setCount] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [bursts, setBursts] = useState<number[]>([]);
  const started = useRef(false);
  const ref = useRef<HTMLButtonElement>(null);

  // Count-up : déclenché la 1re fois que l'élément entre dans la vue
  const runCount = () => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const duration = 1600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * 20));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) runCount();
      },
      { threshold: 0.5 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  // Confettis au clic : relance le compteur + burst
  const onClick = () => {
    started.current = false;
    setCount(0);
    runCount();
    const id = Date.now();
    setBursts((b) => [...b, id]);
    setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 900);
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="20 ans d'expérience — cliquez pour rejouer"
      className={`group relative inline-flex items-baseline gap-1 rounded-full border border-emerald/40 px-3 py-0.5 align-baseline font-bold tabular-nums transition-all duration-300 hover:scale-[1.04] ${
        hovered
          ? "bg-emerald text-paper shadow-glow"
          : "bg-emerald-soft text-ink"
      }`}
    >
      <span className="tabular-nums">{count}</span>
      <span className="text-[0.75em]">ans</span>

      {/* Petits ronds verts qui jaillissent au clic */}
      {bursts.map((id) => (
        <ConfettiBurst key={id} />
      ))}

      {/* Reflet qui balaye au hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
      >
        <span
          className={`absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out ${
            hovered ? "translate-x-[380%]" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function ConfettiBurst() {
  const dots = Array.from({ length: 10 }, (_, i) => i);
  return (
    <>
      {dots.map((i) => {
        const angle = (i / dots.length) * Math.PI * 2;
        const dx = Math.cos(angle) * 60;
        const dy = Math.sin(angle) * 60;
        return (
          <span
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald"
            style={{
              animation: "confettiOut 0.9s ease-out forwards",
              // @ts-expect-error — propriétés CSS custom pour le keyframe
              "--dx": `${dx}px`,
              "--dy": `${dy}px`
            }}
          />
        );
      })}
    </>
  );
}

function HeroTitle() {
  return (
    <h1 className="relative mx-auto mt-6 max-w-5xl text-center font-display leading-[1.05] text-ink">
      {/* Halo vert diffus en arrière-plan */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[320px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/10 blur-3xl"
      />

      {/* Ligne 1 — "La référence pour votre" (poids plus léger, mot-clé vert) */}
      <span className="animate-[riseIn_0.9s_cubic-bezier(0.21,0.47,0.32,0.98)_0.05s_both] block text-[clamp(1.9rem,5vw,3.75rem)] font-medium text-ink/80">
        La <HoverWord className="font-bold text-ink">référence</HoverWord> pour votre
      </span>

      {/* Ligne 2 — "recyclage informatique" en punch vert dégradé */}
      <span className="animate-[riseIn_0.9s_cubic-bezier(0.21,0.47,0.32,0.98)_0.18s_both] mt-1 block text-[clamp(2.4rem,7vw,5.25rem)] font-extrabold tracking-tight">
        <HoverWord className="text-gradient">recyclage informatique</HoverWord>
      </span>

      {/* Ligne 3 — "et électronique" (et en gris doux, mot-clé en vert plein) */}
      <span className="animate-[riseIn_0.9s_cubic-bezier(0.21,0.47,0.32,0.98)_0.3s_both] mt-1 block text-[clamp(1.9rem,5vw,3.75rem)] font-medium">
        <span className="text-moss">et</span>{" "}
        <HoverWord className="font-extrabold text-emerald">électronique</HoverWord>
      </span>

      {/* Ligne 4 — "depuis plus de 20 ans" avec chip interactive */}
      <span className="animate-[riseIn_0.9s_cubic-bezier(0.21,0.47,0.32,0.98)_0.45s_both] mt-6 flex flex-wrap items-center justify-center gap-2 text-[clamp(1rem,2.1vw,1.5rem)] font-medium text-moss">
        depuis plus de
        <YearsChip />
      </span>
    </h1>
  );
}

/* ------------------------------------------------------------------ */
/* Hero principal                                                      */
/* ------------------------------------------------------------------ */

export function Hero({ labels }: { labels: HeroLabels }) {
  const [device, setDevice] = useState<DeviceKey>("laptop");

  return (
    <section className="relative isolate bg-paper pt-24 text-center sm:pt-28">
      {/* Grille éditoriale */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="circuit-grid absolute inset-0 opacity-45 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black_0%,transparent_82%)]" />
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center px-5 pb-14 sm:px-8">
        {/* Eyebrow centré */}
        <p className="font-manifest text-xs uppercase tracking-[0.22em] text-emerald">
          Recyclage informatique · Grand Montréal
        </p>

        {/* Titre géant éditorial */}
        <HeroTitle />

        {/* CTA */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/formulaire-de-ramassage"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-ink px-7 py-4 font-display text-base font-semibold text-paper transition-transform duration-300 hover:scale-[1.02]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 translate-y-full bg-emerald transition-transform duration-500 ease-out group-hover:translate-y-0"
            />
            <span className="relative">{labels.ctaPrimary}</span>
            <ArrowRight className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link
            href="/recyclage-ordinateur"
            className="group inline-flex items-center gap-2 font-display text-sm font-semibold text-moss transition-colors hover:text-ink"
          >
            {labels.ctaSecondary}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Indicateur de scroll (chevron seul) */}
        <div
          aria-hidden="true"
          className="mt-8 flex flex-col items-center text-moss"
        >
          <ChevronDown className="h-4 w-4 animate-scroll-hint" />
        </div>

        {/* Scène 3D sticky : canvas + labels dans un seul container sticky,
            avec 220vh de scroll runway pour que chaque appareil ait le temps d'être vu. */}
        <div className="relative mt-8 w-full" style={{ minHeight: "220vh" }}>
          <div className="sticky top-20 mx-auto flex w-full max-w-3xl flex-col items-center">
            <div className="pointer-events-none relative h-[62vh] max-h-[560px] min-h-[380px] w-full">
              <HeroDevices onDeviceChange={setDevice} />
            </div>

            {/* Nom de l'appareil courant + pastilles d'index — juste sous le canvas */}
            <div className="mt-2 flex flex-col items-center gap-3">
            <p
              key={device}
              className="morph-word font-display text-lg font-bold text-ink"
            >
              {DEVICE_LABEL[device].split("").map((ch, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    animation: "morphLetter 0.5s cubic-bezier(0.21, 0.47, 0.32, 0.98) both",
                    animationDelay: `${i * 0.02}s`
                  }}
                >
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </p>
            <div className="flex items-center gap-2">
              {(["laptop", "phone", "tower", "switch", "monitor"] as DeviceKey[]).map((k) => (
                <span
                  key={k}
                  className={`h-1 w-6 rounded-full transition-colors ${
                    k === device ? "bg-emerald" : "bg-ink/15"
                  }`}
                />
              ))}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bandeau manifeste live */}
      <ManifestTicker />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ruban manifeste live                                                */
/* ------------------------------------------------------------------ */

function ManifestTicker() {
  const ref = useRef<HTMLDivElement>(null);
  const rows = [...MANIFEST_SAMPLES, ...MANIFEST_SAMPLES];
  return (
    <div className="relative border-y border-line-strong bg-paper">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-paper to-transparent" />

      <div className="flex items-center gap-5 overflow-hidden py-3">
        <div className="shrink-0 pl-5 sm:pl-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald/25 bg-emerald-soft px-2.5 py-1 font-manifest text-[10px] uppercase tracking-[0.2em] text-emerald">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald" />
            </span>
            Manifeste · Live
          </span>
        </div>
        <div
          ref={ref}
          className="marquee-track flex min-w-max shrink-0 items-center gap-10 whitespace-nowrap animate-marquee font-manifest text-[12px] tabular-nums text-moss"
          style={{ animationDuration: "48s" }}
        >
          {rows.map((row, i) => (
            <span key={i} className="inline-flex items-center gap-3">
              <span className="text-ink">2026-10-06 {row.time}</span>
              <span className="h-3 w-px bg-line-strong" />
              <span>{row.city.padEnd(16, " ")}</span>
              <span className="h-3 w-px bg-line-strong" />
              <span>
                {String(row.items).padStart(2, "0")}&nbsp;items
              </span>
              <span className="h-3 w-px bg-line-strong" />
              <span className="text-emerald">RAMASSÉ ✓</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
