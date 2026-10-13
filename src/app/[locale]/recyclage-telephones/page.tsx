import type { Metadata } from "next";
import { CheckCircle2, Smartphone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { PageHero } from "@/components/ui/PageHero";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ZoneChips } from "@/components/ui/ZoneChips";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

type Component = { name: string; value: string };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "phones", href: "/recyclage-telephones" });
}

export default async function PhonesPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("svcPhones");
  const components = t.raw("components") as Component[];
  const reasons = t.raw("reasons") as string[];
  const faq = t.raw("faq") as AccordionItem[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />

      <Section className="pt-0">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-display text-2xl font-bold text-mist sm:text-3xl">
              {t("componentsTitle")}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {components.map((component) => (
                <div key={component.name} className="glass rounded-2xl p-4 text-center">
                  <p className="font-display text-xl font-bold text-gradient">{component.value}</p>
                  <p className="mt-1 text-xs text-moss sm:text-sm">{component.name}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="glass relative overflow-hidden rounded-3xl p-7 sm:p-8">
              <div
                aria-hidden="true"
                className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald/15 blur-2xl"
              />
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
                <Smartphone className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-mist">{t("reasonsTitle")}</h2>
              <ul className="mt-4 space-y-3">
                {reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-3 text-sm text-mist/90 sm:text-base">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
                    {reason}
                  </li>
                ))}
              </ul>
              <h3 className="mt-7 font-display text-sm font-bold uppercase tracking-[0.14em] text-emerald">
                {t("zonesTitle")}
              </h3>
              <div className="mt-3">
                <ZoneChips locale={locale} />
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="bg-surface/30">
        <SectionHeading title={t("faqTitle")} className="mb-10" />
        <div className="mx-auto max-w-3xl">
          <Accordion items={faq} />
        </div>
      </Section>

      <CtaBanner title={t("ctaTitle")} text={t("ctaText")} />
    </>
  );
}
