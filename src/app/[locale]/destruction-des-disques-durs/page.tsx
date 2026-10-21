import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, Hammer, Scissors } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { PageHero } from "@/components/ui/PageHero";
import { Section, SectionHeading } from "@/components/ui/Section";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

type Step = { title: string; text: string };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "hardDrives", href: "/destruction-des-disques-durs" });
}

export default async function HardDrivesPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("svcHardDrives");
  const bullets = t.raw("whyBullets") as string[];
  const steps = t.raw("steps") as Step[];
  const faq = t.raw("faq") as AccordionItem[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} image={{ kind: "object", src: "/images/bac/disque-dur.webp", width: 80 }} />

      <Section className="pt-0">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-display text-2xl font-bold text-mist sm:text-3xl">
              {t("whyTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-moss">{t("whyP1")}</p>
            <p className="mt-4 leading-relaxed text-moss">{t("whyP2")}</p>
            <ul className="mt-6 space-y-3">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-sm text-mist/90 sm:text-base">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
                  {bullet}
                </li>
              ))}
            </ul>

            <h2 className="mt-10 font-display text-2xl font-bold text-mist sm:text-3xl">
              {t("whereTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-moss">{t("whereText")}</p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-[2rem] bg-emerald/10 blur-2xl"
              />
              <Image
                src="/images/destruction-disque-dur.jpg"
                alt={
                  locale === "fr"
                    ? "Destruction de disques durs sur place"
                    : "On-site hard drive destruction"
                }
                width={1920}
                height={800}
                className="relative aspect-[16/10] w-full rounded-3xl border border-line object-cover"
                sizes="(min-width: 1024px) 540px, 100vw"
              />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 2 méthodes */}
      <Section className="bg-surface/30">
        <SectionHeading title={t("methodsTitle")} className="mb-12" />
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="glass h-full rounded-3xl p-7 sm:p-8">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
                <Scissors className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-mist">{t("method1Title")}</h3>
              <p className="mt-3 leading-relaxed text-moss">{t("method1Text")}</p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="glass h-full rounded-3xl p-7 sm:p-8">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
                <Hammer className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-mist">{t("method2Title")}</h3>
              <p className="mt-3 leading-relaxed text-moss">{t("method2Text")}</p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 5 étapes */}
      <Section>
        <SectionHeading title={t("stepsTitle")} className="mb-12" />
        <ol className="relative mx-auto max-w-3xl space-y-6 before:absolute before:bottom-6 before:start-6 before:top-6 before:w-px before:bg-gradient-to-b before:from-emerald/60 before:via-lime/40 before:to-emerald/10">
          {steps.map((step, i) => (
            <li key={step.title} className="relative">
              <Reveal delay={i * 0.08} className="flex gap-6">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-accent font-display text-lg font-bold text-ink shadow-glow">
                  {i + 1}
                </span>
                <div className="glass flex-1 rounded-2xl p-5 sm:p-6">
                  <h3 className="font-display text-lg font-bold text-mist">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-moss sm:text-base">{step.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </Section>

      {/* FAQ */}
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
