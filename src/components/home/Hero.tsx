"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { DeviceKey } from "./HeroDevices";
import { HeroCopy, type YearsLabels } from "./HeroCopy";
import { HeroDevicesFallback } from "./HeroDevicesFallback";

export type HeroLabels = {
  titleLead: string;
  titleAccent: string;
  since: string;
  years: YearsLabels;
  promise: string;
  ctaPrimary: string;
  ctaHow: string;
  devices: Record<"eyebrow" | "titleAccent" | "titleRest" | DeviceKey, string>;
};

/* ───────────────────── Scène 3D (chargée à la demande, protégée) ───────────────────── */

const HeroDevices = dynamic(() => import("./HeroDevices").then((m) => m.HeroDevices), {
  ssr: false,
  loading: () => null
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"wait" | "3d" | "fallback">("wait");
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [active, setActive] = useState(true);
  // La scène apparaît en fondu seulement quand sa première image est dessinée (pas d'apparition sèche)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasWebGL()) {
      setMode("fallback");
      return;
    }
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const light =
      window.matchMedia("(pointer: coarse)").matches ||
      window.innerWidth < 1024 ||
      (nav.hardwareConcurrency ?? 8) <= 4 ||
      (nav.deviceMemory ?? 8) <= 4 ||
      !!nav.connection?.saveData;
    setQuality(light ? "low" : "high");
    // Le code 3D se télécharge tout de suite ; la scène démarre (compilation des shaders, ~0,5 s de calcul)
    // une fois toutes les animations CSS du texte lancées, pour qu'elles ne soient jamais figées.
    import("./HeroDevices").catch(() => setMode("fallback"));
    const timer = window.setTimeout(() => setMode((m) => (m === "wait" ? "3d" : m)), 600);
    return () => window.clearTimeout(timer);
  }, []);

  // Aucun calcul 3D quand le hero n'est pas à l'écran
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      {mode === "fallback" && <HeroDevicesFallback />}
      {mode === "3d" && (
        <ThreeErrorBoundary fallback={<HeroDevicesFallback />}>
          <div
            className={`absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              ready ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"
            }`}
          >
            <HeroDevices
              onDeviceChange={onDeviceChange}
              quality={quality}
              active={active}
              onReady={() => setReady(true)}
              onContextLost={() => setMode("fallback")}
            />
          </div>
        </ThreeErrorBoundary>
      )}
    </div>
  );
}

const DEVICE_KEYS: DeviceKey[] = ["laptop", "phone", "tower", "switch", "monitor"];

/* ───────────────────── Hero ───────────────────── */

/**
 * Hero épinglé : le message à gauche, les appareils 3D à droite qui défilent
 * au scroll et suivent la souris. La zone 3D couvre toute la hauteur pour que
 * l'appareil ne soit jamais coupé quand il tourne ou se déplace.
 */
export function Hero({ labels }: { labels: HeroLabels }) {
  const [device, setDevice] = useState<DeviceKey>("laptop");
  const index = DEVICE_KEYS.indexOf(device);
  const deviceName = labels.devices[device];

  return (
    <section aria-label={labels.titleAccent} className="relative bg-vivid text-paper">
      <div data-hero-3d data-pinned="1" className="relative h-[300vh] motion-reduce:h-auto lg:h-[360vh] motion-reduce:lg:h-auto">
        <div className="sticky top-0 h-[100svh] min-h-[640px] overflow-hidden motion-reduce:relative">
          {/* Fond : studio vert vif, coupé en deux par un dégradé (profond à gauche, lumineux à droite) */}
          <Image
            src="/images/hero-studio.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[70%_center] [filter:saturate(1.8)_brightness(1.08)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,78,37,0.9)_0%,rgba(1,101,46,0.72)_26%,rgba(1,164,71,0.08)_42%,rgba(1,164,71,0.08)_54%,rgba(1,101,46,0.78)_70%,rgba(1,78,37,0.92)_100%)] lg:bg-[linear-gradient(100deg,rgba(1,78,37,0.92)_0%,rgba(1,101,46,0.8)_30%,rgba(1,131,60,0.38)_50%,rgba(1,164,71,0)_66%)]"
          />

          <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col px-5 pb-5 pt-[7.25rem] sm:px-8 lg:justify-center lg:pb-10 lg:pt-28">
            {/* Message (titre, badge, promesse, boutons) */}
            <HeroCopy
              labels={{
                titleLead: labels.titleLead,
                titleAccent: labels.titleAccent,
                since: labels.since,
                years: labels.years,
                promise: labels.promise,
                ctaPrimary: labels.ctaPrimary,
                ctaHow: labels.ctaHow
              }}
            />

            {/* Scène 3D + appareil affiché : au centre sur mobile, à droite sur ordinateur */}
            <div className="pointer-events-none relative order-2 my-2 min-h-[150px] flex-1 lg:absolute lg:bottom-0 lg:right-0 lg:top-28 lg:my-0 lg:w-[56%]">
              <div className="absolute inset-0" style={{ animation: "heroFadeIn 1000ms ease-out 300ms both" }}>
                {/* Halo lumineux derrière l'appareil */}
                <div className="absolute inset-[4%] rounded-full bg-[radial-gradient(closest-side,rgba(220,252,231,0.5),rgba(187,247,208,0.18)_55%,transparent)]" />
                <SafeHeroDevices onDeviceChange={setDevice} />
              </div>

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 [text-shadow:0_1px_14px_rgba(3,40,20,0.55)] lg:bottom-10 lg:left-auto lg:right-8 lg:flex-col lg:items-end">
                <div className="lg:text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-paper/85 sm:text-xs">{labels.devices.eyebrow}</p>
                  <p
                    key={device}
                    className="mt-0.5 font-display text-lg font-bold tracking-[-0.02em] text-paper sm:text-3xl"
                    style={{ animation: "heroRiseIn 450ms ease-out both" }}
                  >
                    {deviceName}
                  </p>
                  <p className="mt-0.5 hidden text-xs font-medium text-paper/80 sm:block sm:text-sm">
                    {labels.devices.titleAccent} {labels.devices.titleRest}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 pb-1" aria-hidden="true">
                  {DEVICE_KEYS.map((k, i) => (
                    <span
                      key={k}
                      className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        i === index ? "w-8 bg-paper" : "w-3 bg-paper/35"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
