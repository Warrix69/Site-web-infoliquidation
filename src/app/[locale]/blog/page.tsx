import type { Metadata } from "next";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { TiltCard } from "@/components/ui/TiltCard";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { BLOG_SLUGS } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale }> };

type Article = { title: string; date: string; excerpt: string };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "blog", href: "/blog" });
}

function formatDate(date: string, locale: Locale) {
  return new Date(date).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default async function BlogPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");

  const articles = BLOG_SLUGS.map((slug) => ({
    slug,
    ...(t.raw(`articles.${slug}`) as Article)
  }));

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} intro={t("subtitle")} image={{ kind: "photo", src: "/images/centre/etabli.webp" }} />

      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <Reveal key={article.slug} delay={Math.min(i * 0.08, 0.3)}>
              <TiltCard className="h-full rounded-3xl">
                <Link
                  href={{ pathname: "/blog/[slug]", params: { slug: article.slug } }}
                  className="glass group/card flex h-full flex-col rounded-3xl p-6 transition-colors duration-300 hover:border-emerald/40 sm:p-7"
                >
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(article.date, locale)}
                  </p>
                  <h2 className="mt-3 font-display text-lg font-bold leading-snug text-mist">
                    {article.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-moss">{article.excerpt}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald">
                    {t("readArticle")}
                    <ArrowUpRight
                      className="h-4 w-4 transition-transform duration-300 group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <CtaBanner title={t("subtitle")} />
    </>
  );
}
