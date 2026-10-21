import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SERVICES, type ServiceKey } from "@/lib/site";

export type ServicesHeading = { eyebrow: string; title: string; subtitle: string };

/** Image détourée qui illustre chaque service, et sa largeur dans la carte. */
const OBJECTS: Record<ServiceKey, { src: string; w: number; h: number; size: string }> = {
  computer: { src: "/images/bac/portable.webp", w: 560, h: 253, size: "78%" },
  pickupForm: { src: "/images/bac/bac.webp", w: 900, h: 1150, size: "34%" },
  data: { src: "/images/objets/disque-dur.webp", w: 1100, h: 625, size: "70%" },
  materials: { src: "/images/objets/matieres.webp", w: 900, h: 493, size: "74%" },
  procedure: { src: "/images/objets/palette.webp", w: 900, h: 800, size: "54%" },
  hardDrives: { src: "/images/objets/dechiquete.webp", w: 900, h: 470, size: "74%" },
  phones: { src: "/images/bac/telephone.webp", w: 560, h: 216, size: "64%" }
};

/** Les 7 services en grille simple : une image claire par service, la carte entière est un lien. */
export async function ServicesGrid({ heading }: { heading: ServicesHeading }) {
  const t = await getTranslations("services");

  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-emerald">{heading.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-4xl lg:text-[2.75rem]">
            {heading.title}
          </h2>
        </div>
        <p className="max-w-md text-base leading-relaxed text-moss">{heading.subtitle}</p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map(({ key, route }, i) => {
          const obj = OBJECTS[key];
          return (
            <li key={key} className={i === 0 ? "sm:col-span-2" : ""}>
              <Link
                href={route}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-paper transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-emerald/40 hover:shadow-[0_24px_50px_-28px_rgba(10,10,10,0.35)]"
              >
                <div className="relative flex h-44 items-center justify-center bg-sand sm:h-48">
                  <span
                    aria-hidden="true"
                    className="absolute bottom-6 left-1/2 h-4 w-1/2 -translate-x-1/2 rounded-[50%] bg-ink/15 blur-md"
                  />
                  <div
                    className="relative transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-105"
                    style={{ width: obj.size }}
                  >
                    <Image
                      src={obj.src}
                      alt=""
                      width={obj.w}
                      height={obj.h}
                      sizes="(max-width: 640px) 70vw, 25vw"
                      className="mx-auto h-auto max-h-36 w-auto object-contain sm:max-h-40"
                    />
                  </div>
                </div>
                <div className="flex flex-1 items-start justify-between gap-3 p-5">
                  <div>
                    <h3 className="font-display text-base font-bold leading-snug text-ink sm:text-lg">
                      {t(`${key}.title`)}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-moss">{t(`${key}.desc`)}</p>
                  </div>
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors duration-300 group-hover:border-emerald group-hover:bg-emerald group-hover:text-paper">
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
