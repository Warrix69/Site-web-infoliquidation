import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, Leaf, MapPin, ShieldCheck } from "lucide-react";
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
  const whyStats = t.raw("why.stats") as StatItem[];
  const securityBullets = t.raw("security.bullets") as string[];
  const regions = t.raw("zones.regions") as string[];
  const equipmentItems = t.raw("equipment.items") as string[];
  const choiceBullets = t.raw("choice.bullets") as string[];
  const faqItems = tAll.raw("faqItems") as AccordionItem[];

  return (
    <>
      {/* 3. HERO plein écran */}
      <Hero labels={heroLabels} />

      {/* 4. Bande de statistiques animées — fond noir pour contraste WOW */}
      <section data-theme="dark" className="relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-16 sm:grid-cols-3 sm:px-8 lg:grid-cols-5 lg:py-20">
          {stats.map((item, i) => (
            <Reveal key={i} delay={i * 0.08}>
              {/* Préfixe en petite capitale au-dessus, chiffre géant en dessous */}
              {item.prefix ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-moss">
                  {item.prefix}
                </p>
              ) : null}
              <p className="mt-2 font-display text-3xl font-bold leading-none text-mist sm:text-4xl">
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

      {/* Textes officiels de l'accueil : solution adaptée + équipements + bon choix */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-emerald-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald">
              {t("adapted.eyebrow")}
            </span>
            <h2 className="font-display text-3xl font-bold leading-tight text-mist sm:text-4xl">
              {t("adapted.title")}
            </h2>
            <p className="mt-5 leading-relaxed text-moss">{t("adapted.p1")}</p>
            <p className="mt-4 leading-relaxed text-moss">{t("adapted.p2")}</p>

            <h3 className="mt-8 font-display text-xl font-bold text-mist">
              {t("equipment.title")}
            </h3>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {equipmentItems.map((item) => (
                <li
                  key={item}
                  className="glass-light inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist/90"
                >
                  <Leaf className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm italic text-moss">{t("equipment.outro")}</p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-[2rem] bg-emerald/10 blur-2xl"
              />
              <Image
                src="/images/ordinateurs-portables-recyclage.jpg"
                alt={
                  locale === "fr"
                    ? "Ordinateurs portables récupérés pour le recyclage de matériel électronique"
                    : "Laptops recovered for electronic equipment recycling"
                }
                width={800}
                height={534}
                className="relative w-full rounded-3xl border border-line object-cover"
                sizes="(min-width: 1024px) 540px, 100vw"
              />
              <div className="glass absolute -bottom-6 left-5 right-5 rounded-2xl p-5 sm:left-8 sm:right-auto sm:max-w-sm">
                <p className="font-display text-base font-bold text-mist">
                  {t("choice.title")} — <span className="text-gradient">{t("choice.highlight")}</span>
                </p>
                <ul className="mt-3 space-y-2">
                  {choiceBullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-xs leading-relaxed text-moss sm:text-sm">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald" aria-hidden="true" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 7. Pourquoi recycler ? — grosses stats animées */}
      <Section className="mt-8 bg-surface/30">
        <SectionHeading
          eyebrow={t("why.eyebrow")}
          title={t("why.title")}
          subtitle={t("why.intro")}
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyStats.map((stat, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="glass relative overflow-hidden rounded-3xl p-6 text-center sm:p-8">
                <div
                  aria-hidden="true"
                  className="absolute -top-10 left-1/2 h-24 w-40 -translate-x-1/2 rounded-full bg-emerald/15 blur-2xl"
                />
                <p className="relative font-display text-4xl font-bold text-gradient sm:text-5xl">
                  <Counter value={stat.value ?? 0} suffix={stat.suffix} locale={locale} />
                </p>
                <p className="relative mt-3 text-sm leading-snug text-moss">{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 text-center">
          <GhostButtonLink href="/informations" withArrow>
            {t("why.cta")}
          </GhostButtonLink>
        </Reveal>
      </Section>

      {/* 8. Sécurité — destruction des données (section noire pour l'alternance) */}
      <Section theme="dark">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="order-2 lg:order-1">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-[2rem] bg-emerald/10 blur-2xl"
              />
              <Image
                src="/images/destruction-disque-dur.jpg"
                alt={
                  locale === "fr"
                    ? "Destruction sécurisée d'un disque dur"
                    : "Secure destruction of a hard drive"
                }
                width={1920}
                height={800}
                className="relative aspect-[16/10] w-full rounded-3xl border border-line object-cover"
                sizes="(min-width: 1024px) 540px, 100vw"
              />
            </div>
          </Reveal>
          <Reveal delay={0.15} className="order-1 lg:order-2">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-emerald-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t("security.eyebrow")}
            </span>
            <h2 className="font-display text-3xl font-bold leading-tight text-mist sm:text-4xl">
              {t("security.title")}
            </h2>
            <p className="mt-5 leading-relaxed text-moss">{t("security.p1")}</p>
            <p className="mt-4 leading-relaxed text-moss">{t("security.p2")}</p>
            <ul className="mt-6 space-y-3">
              {securityBullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-sm text-mist/90 sm:text-base">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
                  {bullet}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <PrimaryButtonLink href="/destruction-des-donnees">
                {t("security.cta")}
              </PrimaryButtonLink>
            </div>
          </Reveal>
        </div>
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
