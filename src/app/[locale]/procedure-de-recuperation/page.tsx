import type { Metadata } from "next";
import { Cpu, Monitor, Tv } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

type Block = { title: string; text: string };

const BLOCK_ICONS = [Tv, Monitor, Cpu];

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "procedure", href: "/procedure-de-recuperation" });
}

export default async function ProcedurePage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("svcProcedure");
  const blocks = t.raw("blocks") as Block[];

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />

      <Section className="pt-0">
        <div className="space-y-6">
          {blocks.map((block, i) => {
            const Icon = BLOCK_ICONS[i] ?? Cpu;
            return (
              <Reveal key={block.title} delay={i * 0.08}>
                <article className="glass relative overflow-hidden rounded-3xl p-7 sm:p-9">
                  <div
                    aria-hidden="true"
                    className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-emerald/10 blur-2xl"
                  />
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-accent text-ink shadow-glow">
                      <Icon className="h-7 w-7" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-display text-2xl font-bold text-mist">{block.title}</h2>
                      <p className="mt-3 leading-relaxed text-moss">{block.text}</p>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <CtaBanner title={t("ctaTitle")} text={t("ctaText")} />
    </>
  );
}
