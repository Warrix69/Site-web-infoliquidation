import { ArrowRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type Href = ComponentProps<typeof Link>["href"];

type ButtonLinkProps = {
  href: Href;
  children: ReactNode;
  className?: string;
  withArrow?: boolean;
};

/** CTA principal : pill, dégradé émeraude → lime, glow au hover. */
export function PrimaryButtonLink({ href, children, className, withArrow = true }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-accent px-7 py-3.5 font-display text-sm font-bold tracking-wide text-ink shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:brightness-110 focus-visible:shadow-glow-lg sm:text-base ${className ?? ""}`}
    >
      {children}
      {withArrow && (
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

/** CTA secondaire : pill fantôme, bordure verte translucide. */
export function GhostButtonLink({ href, children, className, withArrow = false }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface/40 px-7 py-3.5 font-display text-sm font-semibold text-mist backdrop-blur transition-all duration-300 hover:border-emerald/50 hover:bg-emerald-soft sm:text-base ${className ?? ""}`}
    >
      {children}
      {withArrow && (
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
