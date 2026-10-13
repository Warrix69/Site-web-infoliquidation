import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { GhostButtonLink } from "@/components/ui/Button";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "faq", href: "/faq" });
}

export default async function FaqPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faqPage");
  const tAll = await getTranslations();
  const items = tAll.raw("faqItems") as AccordionItem[];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a }
    }))
  };

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} intro={t("subtitle")} />

      <Section className="pt-0">
        <div className="mx-auto max-w-3xl">
          <Accordion items={items} />
          <Reveal className="glass mt-10 rounded-3xl p-7 text-center sm:p-8">
            <p className="font-display text-xl font-bold text-mist">{t("ctaTitle")}</p>
            <p className="mt-2 text-moss">{t("ctaText")}</p>
            <div className="mt-6">
              <GhostButtonLink href="/contact" withArrow>
                {t("ctaButton")}
              </GhostButtonLink>
            </div>
          </Reveal>
        </div>
      </Section>

      <CtaBanner title={tAll("home.finalCta.title")} text={tAll("home.finalCta.subtitle")} />
      <JsonLd data={faqJsonLd} />
    </>
  );
}
