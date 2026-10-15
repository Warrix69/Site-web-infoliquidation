"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { DeviceKey } from "./HeroDevices";
import { HeroDevicesFallback } from "./HeroDevicesFallback";

export type HeroLabels = {
  badge: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  proofs: string[];
  scrollHint: string;
};

/* ───────────────────── 3D Scene (lazy + protected) ───────────────────── */

const HeroDevices = dynamic(() => import("./HeroDevices").then((m) => m.HeroDevices), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-20 w-20 animate-pulse rounded-full bg-emerald/20" />
    </div>
  )
});

function hasWebGL(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

class ThreeErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function SafeHeroDevices({ onDeviceChange }: { onDeviceChange?: (d: DeviceKey) => void }) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  useEffect(() => setWebglOk(hasWebGL()), []);
  if (webglOk === null)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-20 w-20 animate-pulse rounded-full bg-emerald/20" />
      </div>
    );
  if (!webglOk) return <HeroDevicesFallback />;
  return (
    <ThreeErrorBoundary fallback={<HeroDevicesFallback />}>
      <HeroDevices onDeviceChange={onDeviceChange} />
    </ThreeErrorBoundary>
  );
}

/* ───────────────────── Hero ───────────────────── */

const DEVICE_LABEL: Record<DeviceKey, string> = {
  laptop: "Portables",
  phone: "Téléphones",
  tower: "Tours & serveurs",
  switch: "Équipements réseau",
  monitor: "Écrans"
};

export function Hero({ labels: _labels }: { labels: HeroLabels }) {
  const [device, setDevice] = useState<DeviceKey>("laptop");

  return (
    <>
      {/* ═════════ Hero : photo incrustée à droite (statique) ═════════ */}
      <section
        aria-label="Accueil Info Liquidation Recycle"
        className="relative isolate overflow-hidden bg-paper text-ink"
      >
        {/* ───── Background : photo mi-droite + fade blanc vers la gauche ───── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{ animation: "heroFadeIn 700ms ease-out both" }}
        >
          {/* Photo en absolute, mi-droite — statique */}
          <div className="absolute inset-y-0 right-0 w-full overflow-hidden md:w-[60%] lg:w-[55%]">
            <Image
              src="/images/hero-poubelle.webp"
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 60vw"
              className="object-cover object-center"
            />
            {/* Fade vers blanc à gauche : lisibilité du titre, mais photo visible */}
            <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/70 to-transparent md:from-paper/95 md:via-paper/30 md:to-transparent" />
            {/* Scrim mobile : fade blanc du bas pour que le titre lise */}
            <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/20 to-transparent md:hidden" />
          </div>

          {/* Halo vert diffus derrière le titre */}
          <div className="absolute left-[-10%] top-[20%] h-[400px] w-[400px] rounded-full bg-emerald/10 blur-[120px]" />
        </div>

        {/* ───── Contenu ───── */}
        <div className="relative mx-auto flex min-h-[85vh] max-w-7xl flex-col justify-end px-5 pb-10 pt-24 sm:px-10 sm:pb-16 sm:pt-32 md:min-h-[78vh] md:justify-between md:pt-36">
          {/* Bloc titre + CTA */}
          <div className="relative flex flex-col gap-5 sm:gap-6 md:max-w-[62%] lg:max-w-[58%]">
            <h1 className="font-bold leading-[0.98] tracking-[-0.03em] text-ink" style={{ fontFamily: "var(--font-hero), ui-sans-serif, system-ui, sans-serif" }}>
              <Line delay={60}>
                <span className="text-ink/80">La </span>
                <HoverWord>référence</HoverWord>
                <span className="text-ink/80"> pour votre</span>
              </Line>
              <Line delay={160} xlarge>
                <HoverFill>recyclage informatique</HoverFill>
              </Line>
              <div
                className="mt-6 flex flex-wrap items-center gap-3 text-[clamp(1rem,1.6vw,1.4rem)] font-medium text-ink/70"
                style={{ animation: "heroRiseIn 700ms ease-out 320ms both" }}
              >
                <span>depuis plus de</span>
                <YearsChip />
                <span>au Grand Montréal</span>
              </div>
            </h1>

            <div
              className="flex flex-col gap-6"
              style={{ animation: "heroRiseIn 700ms ease-out 480ms both" }}
            >
              <p className="max-w-xl text-[16px] leading-relaxed text-ink/70 sm:text-[18px]">
                Ramassage gratuit en 72 h. Destruction physique des disques durs sur place.
                Certificat sans frais.
              </p>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/formulaire-de-ramassage"
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden bg-emerald px-8 py-5 font-display text-base font-semibold text-paper shadow-[0_12px_30px_-10px_rgba(22,163,74,0.5)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 translate-y-full bg-ink transition-transform duration-300 ease-out group-hover:translate-y-0"
                  />
                  <span className="relative">Demander un ramassage</span>
                  <ArrowRight className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/informations"
                  className="group inline-flex items-center justify-center gap-2 px-3 py-4 font-display text-base font-semibold text-ink/80 transition-colors hover:text-emerald"
                >
                  <span className="relative">
                    Comment ça marche
                    <span className="absolute bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-emerald transition-transform duration-300 group-hover:scale-x-100" />
                  </span>
                </Link>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* ═════════ 3D carousel des appareils — gris pâle pour contraste doux ═════════ */}
      <section
        aria-label="Ce que nous recyclons"
        data-hero-3d
        style={{ backgroundColor: "#E8E8E8" }}
        className="relative flex min-h-[110vh] flex-col items-center justify-center overflow-hidden px-5 py-14 text-ink sm:px-10 sm:py-20 md:min-h-[130vh]"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center">
          <div className="mb-4 flex flex-col items-center gap-2 text-center sm:mb-6 sm:gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald sm:text-xs">
              Ce que nous recyclons
            </p>
            <h2 className="font-display text-[clamp(1.7rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-7xl">
              <span className="text-emerald">Chaque appareil</span>
              <br />
              a une seconde vie.
            </h2>
          </div>

          <div className="pointer-events-none relative mx-auto h-[48vh] max-h-[560px] min-h-[300px] w-full max-w-5xl sm:h-[60vh] sm:min-h-[420px] md:h-[70vh] md:max-h-[720px] md:min-h-[480px]">
            <SafeHeroDevices onDeviceChange={setDevice} />
          </div>

          <div className="mt-3 flex flex-col items-center gap-2 sm:mt-4 sm:gap-3">
            <p
              key={device}
              className="font-display text-lg font-bold tracking-tight sm:text-2xl md:text-3xl"
              style={{ animation: "fadeIn 0.4s ease-out both" }}
            >
              {DEVICE_LABEL[device]}
            </p>
            <div className="flex items-center gap-2">
              {(["laptop", "phone", "tower", "switch", "monitor"] as DeviceKey[]).map((k) => (
                <span
                  key={k}
                  className={`h-1 w-6 rounded-full transition-colors sm:w-7 ${
                    k === device ? "bg-emerald" : "bg-ink/15"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Lines                                                        */
/* ─────────────────────────────────────────────────────────── */

function Line({
  children,
  delay,
  // mounted intentionnellement ignoré : on utilise une animation CSS pure
  // (robuste même si JS/hydration échoue : fallback = visible via fill-mode forwards)
  large = false,
  xlarge = false
}: {
  children: React.ReactNode;
  delay: number;
  mounted?: boolean;
  large?: boolean;
  xlarge?: boolean;
}) {
  const sizeClass = xlarge
    ? "inline-block text-[clamp(2.1rem,7vw,5.5rem)] font-bold tracking-[-0.035em]"
    : large
      ? "inline-block text-[clamp(1.9rem,6vw,4.5rem)] font-bold tracking-[-0.035em]"
      : "inline-block text-[clamp(1.35rem,4vw,2.5rem)] font-medium tracking-[-0.02em]";
  return (
    <span className={`block ${large || xlarge ? "mt-1" : ""}`}>
      <span
        className={sizeClass}
        style={{
          animation: `heroLineIn 600ms ease-out ${delay}ms both`
        }}
      >
        {children}
      </span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Hover primitives                                             */
/* ─────────────────────────────────────────────────────────── */

function HoverWord({ children }: { children: React.ReactNode }) {
  return (
    <span className="group/word relative inline-block cursor-default font-bold text-ink">
      {children}
      <span
        aria-hidden="true"
        className="absolute bottom-[0.08em] left-0 h-[0.08em] w-full origin-left scale-x-0 bg-emerald transition-transform duration-500 ease-out group-hover/word:scale-x-100"
      />
    </span>
  );
}

function HoverFill({ children }: { children: React.ReactNode }) {
  return <span className="relative inline-block cursor-default text-emerald">{children}</span>;
}

/* ─────────────────────────────────────────────────────────── */
/* Years chip                                                   */
/* ─────────────────────────────────────────────────────────── */

function YearsChip() {
  const [count, setCount] = useState(0);
  const [bursts, setBursts] = useState<number[]>([]);
  const started = useRef(false);
  const ref = useRef<HTMLButtonElement>(null);

  const runCount = () => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const duration = 1400;
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
      aria-label="20 ans d'expérience — cliquez pour rejouer"
      className="relative inline-flex items-baseline gap-1 overflow-visible rounded-full border-2 border-emerald bg-emerald/10 px-4 py-1 font-display font-black tabular-nums text-emerald transition-all duration-300 hover:bg-emerald hover:text-paper hover:shadow-[0_8px_32px_-8px_rgba(22,163,74,0.6)]"
    >
      <span className="tabular-nums">{count}</span>
      <span className="text-[0.7em] font-semibold">ans</span>
      {bursts.map((id) => (
        <ConfettiBurst key={id} />
      ))}
    </button>
  );
}

function ConfettiBurst() {
  const dots = Array.from({ length: 12 }, (_, i) => i);
  return (
    <>
      {dots.map((i) => {
        const angle = (i / dots.length) * Math.PI * 2;
        const dx = Math.cos(angle) * 56;
        const dy = Math.sin(angle) * 56;
        return (
          <span
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald"
            style={{
              animation: "confettiOut 0.9s ease-out forwards",
              // @ts-expect-error — CSS vars custom pour le keyframe
              "--dx": `${dx}px`,
              "--dy": `${dy}px`
            }}
          />
        );
      })}
    </>
  );
}
