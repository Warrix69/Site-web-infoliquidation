import type { Metadata } from "next";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CitiesMarquee } from "@/components/home/CitiesMarquee";
import { Hero, type HeroLabels } from "@/components/home/Hero";
import { StepsTimeline, type StepItem } from "@/components/home/StepsTimeline";
import { Counter } from "@/components/motion/Counter";
import { Reveal } from "@/components/motion/Reveal";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { GhostButtonLink, PrimaryButtonLink } from "@/components/ui/Button";
import { Section, SectionHeading } from "@/components/ui/Section";
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

const STEP_IMAGES = [
  "/images/etape-formulaire.png",
  "/images/etape-date.png",
  "/images/etape-ramassage.png"
];

export default async function HomePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tAll = await getTranslations();

  const heroLabels: HeroLabels = {
    badge: t("hero.badge"),
    title: t("hero.title"),
    subtitle: t("hero.subtitle"),
    ctaPrimary: t("hero.ctaPrimary"),
    ctaSecondary: t("hero.ctaSecondary"),
    proofs: t.raw("hero.proofs") as string[],
    scrollHint: t("hero.scrollHint")
  };

  const stats = t.raw("stats.items") as StatItem[];
  const steps = (t.raw("steps.items") as { title: string; desc: string }[]).map((s, i) => ({
    ...s,
    img: STEP_IMAGES[i]
  })) satisfies StepItem[];
  const regions = t.raw("zones.regions") as string[];
  const faqItems = tAll.raw("faqItems") as AccordionItem[];

  return (
    <>
      {/* 3. HERO plein écran */}
      <Hero labels={heroLabels} />

      {/* 4. Bande de statistiques — bannière verte */}
      <section className="relative overflow-hidden bg-emerald text-paper">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-16 sm:grid-cols-3 sm:px-8 lg:grid-cols-5 lg:py-20">
          {stats.map((item, i) => (
            <Reveal key={i} delay={i * 0.08}>
              {item.prefix ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/80">
                  {item.prefix}
                </p>
              ) : null}
              <p className="mt-2 font-display text-3xl font-bold leading-none text-paper sm:text-4xl">
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
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-paper/80 sm:text-sm">
                {item.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 5. Comment ça marche — 3 étapes */}
      <Section>
        <SectionHeading
          eyebrow={t("steps.eyebrow")}
          title={t("steps.title")}
          subtitle={t("steps.subtitle")}
        />
        <StepsTimeline items={steps} />
      </Section>

      {/* 6. Grille des services */}
      <Section className="bg-surface/30">
        <SectionHeading
          eyebrow={t("servicesSection.eyebrow")}
          title={t("servicesSection.title")}
          subtitle={t("servicesSection.subtitle")}
          className="mb-12"
        />
        <ServicesGrid />
      </Section>


      {/* 9. Zones desservies + marquee */}
      <Section className="bg-surface/30">
        <SectionHeading
          eyebrow={t("zones.eyebrow")}
          title={t("zones.title")}
          subtitle={t("zones.desc")}
        />
        <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {regions.map((region) => (
            <span
              key={region}
              className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-sm font-semibold text-mist"
            >
              <MapPin className="h-4 w-4 text-emerald" aria-hidden="true" />
              {region}
            </span>
          ))}
        </Reveal>
        <Reveal className="mt-6 text-center">
          <Link
            href="/contact"
            className="text-sm text-moss underline decoration-emerald/50 underline-offset-4 transition-colors hover:text-emerald"
          >
            {t("zones.addressNote")}
          </Link>
        </Reveal>
        <div className="mt-10 -mx-5 sm:-mx-8">
          <CitiesMarquee locale={locale} label={t("zones.marqueeLabel")} />
        </div>
      </Section>

      {/* 10. FAQ */}
      <Section>
        <SectionHeading
          eyebrow={t("faq.eyebrow")}
          title={t("faq.title")}
          subtitle={t("faq.subtitle")}
          className="mb-10"
        />
        <div className="mx-auto max-w-3xl">
          <Accordion items={faqItems} />
          <Reveal className="mt-8 text-center">
            <GhostButtonLink href="/faq" withArrow>
              {t("faq.cta")}
            </GhostButtonLink>
          </Reveal>
        </div>
      </Section>

      {/* 11. CTA final plein écran — fond noir */}
      <section data-theme="dark" className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-ink py-24">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="circuit-grid absolute inset-0 animate-grid-pan opacity-60 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black,transparent)]" />
          <div className="absolute left-1/4 top-1/4 h-[360px] w-[360px] animate-blob rounded-full bg-emerald/20 blur-[110px]" />
          <div className="absolute bottom-1/4 right-1/4 h-[320px] w-[320px] animate-blob-slow rounded-full bg-lime/15 blur-[110px]" />
        </div>
        <div className="mx-auto w-full max-w-4xl px-5 text-center sm:px-8">
          <Reveal>
            <h2 className="font-display text-[clamp(2.2rem,6vw,4rem)] font-bold leading-[1.08] text-mist">
              {t("finalCta.title")}
              <br />
              <span className="text-gradient">{t("finalCta.subtitle")}</span>
            </h2>
            <div className="mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row">
              <PrimaryButtonLink
                href="/formulaire-de-ramassage"
                className="px-10 py-5 text-lg"
              >
                {t("finalCta.button")}
              </PrimaryButtonLink>
              <a
                href={SITE.phoneHref}
                className="font-display text-base font-semibold text-mist transition-colors hover:text-emerald"
              >
                {tAll("common.orCallUs")} {SITE.phoneDisplay}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
