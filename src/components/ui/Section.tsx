import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";

type SectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  /** `dark` inverse automatiquement la palette (fond noir, texte clair). */
  theme?: "light" | "dark";
};

/** Section pleine largeur avec conteneur centré. */
export function Section({ children, className, id, theme }: SectionProps) {
  const dataAttr = theme === "dark" ? { "data-theme": "dark" as const } : {};
  const base = theme === "dark" ? "bg-ink text-mist" : "";
  return (
    <section
      id={id}
      {...dataAttr}
      className={`relative py-16 sm:py-24 ${base} ${className ?? ""}`}
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">{children}</div>
    </section>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
};

/** En-tête de section : eyebrow pill + titre display + sous-titre. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className
}: SectionHeadingProps) {
  const alignCls = align === "center" ? "mx-auto text-center" : "text-left";
  return (
    <Reveal className={`max-w-3xl ${alignCls} ${className ?? ""}`}>
      {eyebrow && (
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-emerald-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl font-bold leading-tight text-mist sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-base leading-relaxed text-moss sm:text-lg">{subtitle}</p>}
    </Reveal>
  );
}
