import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";

export type PageHeroImage =
  | { kind: "object"; src: string; width?: number }
  | { kind: "photo"; src: string };

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  intro?: string;
  image?: PageHeroImage;
  /** compact : titre et marges réduits (ex. page Contact) */
  size?: "default" | "compact";
  children?: ReactNode;
};

/** Hero des pages intérieures : aplat vert vif, titre display, objet ou photo en profondeur. */
export function PageHero({ eyebrow, title, intro, image, size = "default", children }: PageHeroProps) {
  const compact = size === "compact";
  return (
    <header
      data-theme="green"
      className={`relative isolate overflow-hidden text-mist ${compact ? "pb-10 pt-32 sm:pb-12 sm:pt-36" : "pb-16 pt-32 sm:pb-24 sm:pt-40"}`}
    >

      <div
        className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${
          image ? "grid items-center gap-12 lg:grid-cols-12 lg:gap-10" : ""
        }`}
      >
        <Reveal className={image ? "lg:col-span-7" : ""}>
          {eyebrow && (
            <p className="mb-4 inline-flex rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-paper">
              {eyebrow}
            </p>
          )}
          <h1
            className={`max-w-4xl font-display font-extrabold leading-[1.04] tracking-[-0.03em] text-mist ${
              compact ? "text-3xl sm:text-4xl lg:text-[2.75rem]" : "text-4xl sm:text-5xl lg:text-6xl"
            }`}
          >
            {title}
          </h1>
          {intro && <p className="mt-6 max-w-2xl text-base leading-relaxed text-moss sm:text-lg">{intro}</p>}
          {children}
        </Reveal>

        {image?.kind === "object" && (
          <div
            aria-hidden="true"
            className={`relative mx-auto w-full lg:col-span-5 ${compact ? "max-w-[220px] sm:max-w-[260px] lg:max-w-[300px]" : "max-w-[300px] sm:max-w-[360px] lg:max-w-none"}`}
          >
            <div className="relative aspect-square">
              <div className="absolute inset-[10%] rounded-full bg-paper/25" />
              <div className="absolute bottom-[14%] left-1/2 h-5 w-1/2 -translate-x-1/2 rounded-[50%] bg-black/30 blur-lg" />
              <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "heroFadeIn 900ms ease-out 150ms both" }}>
                <div className="animate-float" style={{ width: `${image.width ?? 72}%` }}>
                  <Image
                    src={image.src}
                    alt=""
                    width={560}
                    height={560}
                    priority
                    className="h-auto w-full drop-shadow-[0_24px_28px_rgba(0,0,0,0.45)]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {image?.kind === "photo" && (
          <div aria-hidden="true" className="relative lg:col-span-5">
            <div className="absolute -bottom-4 -left-4 h-full w-full rounded-3xl bg-ink" />
            <div
              className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]"
              style={{ animation: "heroFadeIn 900ms ease-out 150ms both" }}
            >
              <Image
                src={image.src}
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
