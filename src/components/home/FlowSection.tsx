import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

export type FlowLabels = {
  title: string;
  text: string;
  items: { title: string; text: string }[];
};

/** Visuel de chaque étape, du ramassage au recyclage. */
const VISUALS = [
  { src: "/images/objets/camionnette-logo.webp", w: 1200, h: 497, size: "w-[88%]" },
  { src: "/images/objets/dechiquete.webp", w: 900, h: 470, size: "w-[78%]" },
  { src: "/images/objets/matieres.webp", w: 900, h: 493, size: "w-[78%]" }
];

/** « Rien n'est perdu » : ce qu'on fait, en trois images simples. */
export function FlowSection({ labels }: { labels: FlowLabels }) {
  return (
    <section data-theme="dark" className="relative py-20 text-mist sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.02] tracking-[-0.03em] text-mist">
            {labels.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-moss sm:text-lg">{labels.text}</p>
        </Reveal>

        <ol className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
          {labels.items.map((item, i) => {
            const v = VISUALS[i];
            return (
              <li key={item.title} className="relative">
                <Reveal delay={i * 0.12} className="group h-full">
                  <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-surface transition-colors duration-300 hover:bg-surface-2">
                    <div className="relative flex h-48 items-center justify-center sm:h-56">
                      <span
                        aria-hidden="true"
                        className="absolute bottom-7 left-1/2 h-4 w-1/2 -translate-x-1/2 rounded-[50%] bg-black/50 blur-md"
                      />
                      {v && (
                        <div className={`relative ${v.size} transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-105`}>
                          <Image
                            src={v.src}
                            alt=""
                            width={v.w}
                            height={v.h}
                            sizes="(max-width: 768px) 70vw, 25vw"
                            className="mx-auto h-auto max-h-40 w-auto object-contain sm:max-h-44"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 items-start gap-4 p-6 pt-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime font-display text-sm font-bold text-ink">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-display text-xl font-bold leading-snug text-mist">{item.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-moss sm:text-base">{item.text}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
                {i < labels.items.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-[26px] top-24 z-10 hidden h-8 w-8 items-center justify-center rounded-full bg-lime text-ink md:flex"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
