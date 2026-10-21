import type { Metadata } from "next";
import { Award, Recycle, UserRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "about", href: "/a-propos" });
}

export default async function AboutPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} image={{ kind: "photo", src: "/images/centre/allee.webp" }} />

      <Section className="pt-0">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Fondateur */}
          <Reveal className="lg:col-span-2">
            <div className="glass relative h-full overflow-hidden rounded-3xl p-7 sm:p-8">
              <div
                aria-hidden="true"
                className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald/15 blur-2xl"
              />
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent text-ink shadow-glow">
                <UserRound className="h-7 w-7" aria-hidden="true" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-bold text-mist">{t("founderName")}</h2>
              <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-emerald">
                {t("founderRole")}
              </p>
              <p className="mt-5 leading-relaxed text-moss">{t("founderText")}</p>
              <p className="mt-6 border-t border-line pt-5 text-sm text-moss">
                <Award className="mb-0.5 me-2 inline h-4 w-4 text-emerald" aria-hidden="true" />
                Info Liquidation Recycle · {SITE.foundedYear}
              </p>
            </div>
          </Reveal>

          {/* Entreprise + mission */}
          <div className="space-y-8 lg:col-span-3">
            <Reveal delay={0.1}>
              <div className="glass rounded-3xl p-7 sm:p-8">
                <h2 className="font-display text-2xl font-bold text-mist">{t("companyTitle")}</h2>
                <p className="mt-4 leading-relaxed text-moss">{t("p1")}</p>
                <p className="mt-4 leading-relaxed text-moss">{t("p2")}</p>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="glass relative overflow-hidden rounded-3xl p-7 sm:p-8">
                <div
                  aria-hidden="true"
                  className="absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-lime/10 blur-2xl"
                />
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
                  <Recycle className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-display text-2xl font-bold text-mist">
                  {t("missionTitle")}
                </h2>
                <p className="mt-4 leading-relaxed text-moss">{t("p3")}</p>
                <p className="mt-4 leading-relaxed text-moss">{t("p4")}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <CtaBanner title={t("ctaTitle")} text={t("ctaText")} />
    </>
  );
}
