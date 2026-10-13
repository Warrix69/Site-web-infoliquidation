import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "cookies", href: "/politique-de-temoins" });
}

export default async function CookiesPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cookies");
  const sections = t.raw("sections") as { h: string; p: string }[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <Section className="pt-0">
        <div className="mx-auto max-w-3xl">
          {sections.map((s, i) => (
            <Reveal key={i} delay={0.05 * i} className="mt-8 first:mt-0">
              <h2 className="font-display text-xl font-bold text-mist sm:text-2xl">{s.h}</h2>
              <p className="mt-3 leading-relaxed text-moss">{s.p}</p>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  );
}
