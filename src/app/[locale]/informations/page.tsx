import type { Metadata } from "next";
import { PackageSearch, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Counter } from "@/components/motion/Counter";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { PageHero } from "@/components/ui/PageHero";
import { Section, SectionHeading } from "@/components/ui/Section";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

type StatItem = { value: number; suffix?: string; label: string };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "informations", href: "/informations" });
}

export default async function InformationsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("informations");
  const batteriesStats = t.raw("batteriesStats") as StatItem[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} image={{ kind: "photo", src: "/images/centre/matieres.webp" }}>
        <blockquote className="glass mt-8 max-w-3xl rounded-2xl border-s-4 border-s-emerald px-6 py-5 font-display text-lg font-semibold leading-relaxed text-mist sm:text-xl">
          {t("banner")}
        </blockquote>
      </PageHero>

      {/* Pourquoi recycler */}
      <Section className="pt-0">
        <Reveal className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-mist">{t("whyTitle")}</h2>
          <p className="mt-5 leading-relaxed text-moss">{t("whyP1")}</p>
          <p className="mt-4 leading-relaxed text-moss">{t("whyP2")}</p>
        </Reveal>
      </Section>

      {/* Le recyclage des piles */}
      <Section className="bg-surface/30">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("batteriesTitle")}
          align="left"
          className="mb-10"
        />
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="leading-relaxed text-moss">{t("batteriesP1")}</p>
            <p className="mt-4 leading-relaxed text-moss">{t("batteriesP2")}</p>
          </Reveal>
          <div className="grid grid-cols-2 gap-4">
            {batteriesStats.map((stat, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="glass h-full rounded-2xl p-5 text-center">
                  <p className="font-display text-3xl font-bold text-gradient">
                    <Counter value={stat.value} suffix={stat.suffix} locale={locale} />
                  </p>
                  <p className="mt-2 text-xs leading-snug text-moss sm:text-sm">{stat.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* Que deviennent vos produits ? */}
      <Section>
        <SectionHeading title={t("productsTitle")} className="mb-12" />
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="glass h-full rounded-3xl p-7 sm:p-8">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
                <PackageSearch className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-mist">{t("collectTitle")}</h3>
              <p className="mt-3 leading-relaxed text-moss">{t("collectText")}</p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="glass h-full rounded-3xl p-7 sm:p-8">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-mist">{t("dataTitle")}</h3>
              <p className="mt-3 leading-relaxed text-moss">{t("dataText")}</p>
            </div>
          </Reveal>
        </div>
      </Section>

      <CtaBanner title={t("ctaTitle")} text={t("ctaText")} />
    </>
  );
}
