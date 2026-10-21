import type { Metadata } from "next";
import Image from "next/image";
import { BatteryCharging, Cable, Cpu, Monitor, PhoneCall, Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { PageHero } from "@/components/ui/PageHero";
import { Section, SectionHeading } from "@/components/ui/Section";
import { TiltCard } from "@/components/ui/TiltCard";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

type Category = { title: string; examples: string[] };

const CATEGORY_ICONS = [Cpu, Monitor, PhoneCall, BatteryCharging, Cable];

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "materials", href: "/matieres-recyclables" });
}

export default async function MaterialsPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("svcMaterials");
  const categories = t.raw("categories") as Category[];
  const faq = t.raw("faq") as AccordionItem[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} image={{ kind: "photo", src: "/images/centre/matieres.webp" }} />

      <Section className="pt-0">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, i) => {
            const Icon = CATEGORY_ICONS[i] ?? Cpu;
            return (
              <Reveal key={category.title} delay={Math.min(i * 0.08, 0.4)}>
                <TiltCard className="h-full rounded-3xl">
                  <div className="glass flex h-full flex-col rounded-3xl p-6 sm:p-7">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h2 className="mt-4 font-display text-lg font-bold leading-snug text-mist">
                      {category.title}
                    </h2>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald">
                      {t("examplesLabel")}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {category.examples.map((example) => (
                        <li key={example} className="flex items-start gap-2 text-sm text-moss">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald" aria-hidden="true" />
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}

          {/* Illustration officielle du site */}
          <Reveal delay={0.4}>
            <div className="glass flex h-full flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center">
              <Image
                src="/images/liste-matieres.png"
                alt={
                  locale === "fr"
                    ? "Symbole de recyclage composé de circuits imprimés"
                    : "Recycling symbol made of printed circuit boards"
                }
                width={220}
                height={190}
                className="h-auto w-44"
              />
              <p className="text-sm leading-relaxed text-moss">{t("note")}</p>
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
