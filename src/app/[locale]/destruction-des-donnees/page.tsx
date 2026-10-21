import type { Metadata } from "next";
import Image from "next/image";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "data", href: "/destruction-des-donnees" });
}

export default async function DataDestructionPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("svcData");
  const standards = t.raw("standards") as string[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} image={{ kind: "object", src: "/images/bac/ecran.webp", width: 70 }} />

      <Section className="pt-0">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="leading-relaxed text-moss">{t("p1")}</p>
            <p className="mt-4 leading-relaxed text-moss">{t("p2")}</p>
            <p className="mt-4 leading-relaxed text-moss">{t("p3")}</p>

            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-emerald">
              {t("standardsLabel")}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {standards.map((standard) => (
                <span
                  key={standard}
                  className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-sm font-bold text-mist"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald" aria-hidden="true" />
                  {standard}
                </span>
              ))}
            </div>
          </Reveal>

          <div className="space-y-8">
            <Reveal delay={0.1}>
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 rounded-[2rem] bg-emerald/10 blur-2xl"
                />
                <Image
                  src="/images/destruction-disque-dur.jpg"
                  alt={
                    locale === "fr"
                      ? "Destruction physique d'un disque dur pour protéger les données"
                      : "Physical destruction of a hard drive to protect data"
                  }
                  width={1920}
                  height={800}
                  className="relative aspect-[16/9] w-full rounded-3xl border border-line object-cover"
                  sizes="(min-width: 1024px) 540px, 100vw"
                />
              </div>
            </Reveal>

            {/* Encadré À savoir ! */}
            <Reveal delay={0.2}>
              <aside className="glass relative overflow-hidden rounded-3xl border-s-4 border-s-lime p-7">
                <div
                  aria-hidden="true"
                  className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lime/10 blur-2xl"
                />
                <p className="inline-flex items-center gap-2 font-display text-lg font-bold text-mist">
                  <AlertTriangle className="h-5 w-5 text-lime" aria-hidden="true" />
                  {t("knowTitle")}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-moss sm:text-base">
                  {t("knowText")}
                </p>
              </aside>
            </Reveal>
          </div>
        </div>
      </Section>

      <CtaBanner title={t("ctaTitle")} text={t("ctaText")} />
    </>
  );
}
