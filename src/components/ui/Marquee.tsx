import type { ReactNode } from "react";

type MarqueeProps = {
  children: ReactNode;
  label?: string;
  className?: string;
};

/**
 * Marquee infini en CSS pur (piste dupliquée, translation -50 %).
 * L'animation est neutralisée par prefers-reduced-motion (globals.css).
 */
export function Marquee({ children, label, className }: MarqueeProps) {
  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      role="marquee"
      aria-label={label}
    >
      {/* Fondus latéraux */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink to-transparent sm:w-32"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink to-transparent sm:w-32"
      />
      <div className="marquee-track flex w-max animate-marquee items-center gap-4">
        <div className="flex items-center gap-4">{children}</div>
        <div className="flex items-center gap-4" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
