import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: ReactNode;
};

/** Hero des pages intérieures : glow + grille circuit + titre display. */
export function PageHero({ eyebrow, title, intro, children }: PageHeroProps) {
  return (
    <header className="relative overflow-hidden pb-14 pt-32 sm:pb-20 sm:pt-40">
      {/* Décor */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="circuit-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute -top-32 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-emerald/15 blur-[120px]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal>
          {eyebrow && (
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-emerald-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald">
              {eyebrow}
            </span>
          )}
          <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.08] text-mist sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-moss sm:text-lg">{intro}</p>
          )}
          {children}
        </Reveal>
      </div>
    </header>
  );
}
