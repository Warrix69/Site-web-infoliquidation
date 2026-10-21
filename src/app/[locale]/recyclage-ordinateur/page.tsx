import type { Metadata } from "next";
import Image from "next/image";
import { Briefcase, CircleSlash, Leaf } from "lucide-react";
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

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "computer", href: "/recyclage-ordinateur" });
}

export default async function ComputerRecyclingPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("svcComputer");
  const deeeItems = t.raw("deeeItems") as string[];
  const faq = t.raw("faq") as AccordionItem[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} image={{ kind: "object", src: "/images/bac/portable.webp", width: 86 }} />

      <Section className="pt-0">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-display text-2xl font-bold text-mist sm:text-3xl">
              {t("whyTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-moss">{t("whyText")}</p>

            <h2 className="mt-10 font-display text-2xl font-bold text-mist sm:text-3xl">
              {t("deeeTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-moss">{t("deeeText")}</p>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {deeeItems.map((item) => (
                <li
                  key={item}
                  className="glass-light inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist/90"
                >
                  <CircleSlash className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
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
                    ? "Ordinateurs portables en attente de recyclage avec certificat de destruction"
                    : "Laptops awaiting recycling with destruction certificate"
                }
                width={800}
                height={534}
                className="relative w-full rounded-3xl border border-line object-cover"
                sizes="(min-width: 1024px) 540px, 100vw"
              />
            </div>
            <div className="glass mt-8 rounded-3xl p-7">
              <h2 className="font-display text-xl font-bold text-mist">{t("howTitle")}</h2>
              <p className="mt-3 leading-relaxed text-moss">{t("howText")}</p>
              <h3 className="mt-6 font-display text-sm font-bold uppercase tracking-[0.14em] text-emerald">
                {t("zonesTitle")}
              </h3>
              <div className="mt-3">
                <ZoneChips locale={locale} />
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Avantages */}
      <Section className="bg-surface/30">
        <SectionHeading title={t("benefitsTitle")} subtitle={t("benefitsIntro")} className="mb-12" />
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="glass h-full rounded-3xl p-7 sm:p-8">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
                <Leaf className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-mist">{t("benefit1Title")}</h3>
              <p className="mt-3 leading-relaxed text-moss">{t("benefit1Text")}</p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="glass h-full rounded-3xl p-7 sm:p-8">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
                <Briefcase className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-mist">{t("benefit2Title")}</h3>
              <p className="mt-3 leading-relaxed text-moss">{t("benefit2Text")}</p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <SectionHeading title={t("faqTitle")} className="mb-10" />
        <div className="mx-auto max-w-3xl">
          <Accordion items={faq} />
        </div>
      </Section>

      <CtaBanner title={t("ctaTitle")} text={t("ctaText")} />
    </>
  );
}
