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
      <div className="marquee-track flex w-max animate-marquee items-center gap-4">
        <div className="flex items-center gap-4">{children}</div>
        <div className="flex items-center gap-4" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
