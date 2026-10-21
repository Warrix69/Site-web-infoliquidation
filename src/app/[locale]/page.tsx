import type { Metadata } from "next";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CitiesMarquee } from "@/components/home/CitiesMarquee";
import { ClosingBin } from "@/components/home/ClosingBin";
import { Magnetic } from "@/components/motion/Magnetic";
import { BinSection, type BinLabels } from "@/components/home/BinSection";
import { DataDestruction, type DestructionLabels } from "@/components/home/DataDestruction";
import { FlowSection, type FlowLabels } from "@/components/home/FlowSection";
import { Hero, type HeroLabels } from "@/components/home/Hero";
import { StepsTimeline, type StepItem, type StepsMock } from "@/components/home/StepsTimeline";
import { Counter } from "@/components/motion/Counter";
import { Reveal } from "@/components/motion/Reveal";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { PrimaryButtonLink } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

type StatItem = {
  prefix?: string;
  value?: number;
  suffix?: string;
  label: string;
  plain?: boolean;
  /** Si présent, remplace le compteur par du texte libre (ex. « Sans frais »). */
  text?: string;
};

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "home", href: "/" });
}


export default async function HomePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tAll = await getTranslations();

  const heroLabels: HeroLabels = {
    titleLead: t("hero.titleLead"),
    titleAccent: t("hero.titleAccent"),
    since: t("hero.since"),
    years: t.raw("hero.years") as HeroLabels["years"],
    promise: t("hero.promise"),
    ctaPrimary: t("hero.ctaPrimary"),
    ctaHow: t("hero.ctaHow"),
    devices: t.raw("hero.devices") as HeroLabels["devices"]
  };
  const binLabels = t.raw("hero.bin") as BinLabels;
  const flowLabels = t.raw("flow") as FlowLabels;
  const destructionLabels = t.raw("destruction") as DestructionLabels;


  const stats = t.raw("stats.items") as StatItem[];
  const steps = t.raw("steps.short") as StepItem[];
  const stepsMock = t.raw("steps.mock") as StepsMock;
  const regions = t.raw("zones.regions") as string[];

  return (
    <>
      {/* Hero : chaque appareil a une seconde vie (3D) */}
      <Hero labels={heroLabels} />

      {/* Chiffres clés */}
      <section data-theme="dark" className="relative overflow-hidden text-mist">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-16 sm:grid-cols-3 sm:px-8 lg:grid-cols-5 lg:py-20">
          {stats.map((item, i) => (
            <Reveal key={i} delay={i * 0.08}>
              {item.prefix ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-moss">
                  {item.prefix}
                </p>
              ) : null}
              <p className="mt-2 font-display text-3xl font-bold leading-none text-lime sm:text-4xl">
                {item.text ? (
                  item.text
                ) : (
                  <Counter
                    value={item.value ?? 0}
                    suffix={item.suffix || undefined}
                    plain={item.plain}
                    locale={locale}
                  />
                )}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-moss sm:text-sm">
                {item.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Comment ça marche : 3 étapes interactives */}
      <section className="relative bg-paper">
        <StepsTimeline
          heading={{ eyebrow: t("steps.eyebrow"), title: t("steps.title"), subtitle: t("steps.subtitle") }}
          items={steps}
          mock={stepsMock}
          cta={t("steps.cta")}
        />
      </section>

      {/* Le bac bleu se remplit : minimum 10 items */}
      <BinSection labels={binLabels} cta={t("hero.ctaPrimary")} />

      {/* Destruction des données : le disque dur se dissout */}
      <DataDestruction labels={destructionLabels} />

      {/* Zones desservies */}
      <section className="relative overflow-hidden bg-sand py-16 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12">
          <Reveal className="lg:col-span-5">
            <p className="text-sm font-semibold text-emerald">{t("zones.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-4xl lg:text-[2.75rem]">
              {t("zones.title")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-moss sm:text-lg">{t("zones.desc")}</p>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-start gap-2 text-sm font-semibold text-ink underline decoration-emerald/50 underline-offset-4 transition-colors hover:text-emerald"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
              {t("zones.addressNote")}
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-7">
            <ul className="grid grid-cols-2 gap-3 sm:gap-4">
              {regions.map((region, i) => (
                <li
                  key={region}
                  className={`flex h-28 flex-col justify-between rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1 sm:h-32 ${
                    i === 0 ? "bg-ink text-paper" : "bg-paper text-ink"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      i === 0 ? "bg-lime text-ink" : "bg-sand text-emerald"
                    }`}
                  >
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="font-display text-lg font-bold leading-tight sm:text-xl">{region}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <div className="mt-12">
          <CitiesMarquee locale={locale} label={t("zones.marqueeLabel")} />
        </div>
      </section>

      {/* Rien n'est perdu : ramasser, détruire, recycler */}
      <FlowSection labels={flowLabels} />

      {/* Services */}
      <section className="relative bg-paper py-16 sm:py-24">
        <ServicesGrid
          heading={{
            eyebrow: t("servicesSection.eyebrow"),
            title: t("servicesSection.title"),
            subtitle: t("servicesSection.subtitle")
          }}
        />
      </section>

      {/* 11. CTA final plein écran — fond noir */}
      <section
        data-theme="green"
        className="relative isolate flex min-h-[80vh] items-center overflow-hidden py-20 sm:py-24"
        style={{ backgroundColor: "var(--color-vivid-deep)" }}
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-12">
          <Reveal className="order-2 text-center lg:order-1 lg:col-span-7 lg:text-left">
            <h2 className="font-display text-[clamp(2.2rem,5.4vw,4rem)] font-bold leading-[1.08] text-mist">
              {t("finalCta.title")}
              <br />
              <span className="text-paper">{t("finalCta.subtitle")}</span>
            </h2>
            <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row lg:items-center">
              <Magnetic strength={0.25}>
                <PrimaryButtonLink href="/formulaire-de-ramassage" className="px-10 py-5 text-lg sm:whitespace-nowrap">
                  {t("finalCta.button")}
                </PrimaryButtonLink>
              </Magnetic>
              <a
                href={SITE.phoneHref}
                className="font-display text-base font-semibold text-mist transition-colors hover:text-emerald sm:whitespace-nowrap"
              >
                {tAll("common.orCallUs")} {SITE.phoneDisplay}
              </a>
            </div>
          </Reveal>
          <div className="order-1 lg:order-2 lg:col-span-5">
            <ClosingBin />
          </div>
        </div>
      </section>
    </>
  );
}
