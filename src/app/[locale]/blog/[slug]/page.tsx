import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { Section } from "@/components/ui/Section";
import { Link } from "@/i18n/navigation";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { BLOG_SLUGS, SITE, type BlogSlug } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale; slug: string }> };

type ArticleSection = { h: string; p: string };
type Article = {
  title: string;
  date: string;
  excerpt: string;
  sections: ArticleSection[];
};

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    BLOG_SLUGS.map((slug) => ({ locale, slug }))
  );
}

function isBlogSlug(slug: string): slug is BlogSlug {
  return (BLOG_SLUGS as readonly string[]).includes(slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isBlogSlug(slug)) return {};
  const t = await getTranslations({ locale, namespace: "blog" });
  const article = t.raw(`articles.${slug}`) as Article;

  const canonical = `${SITE.url}${getPathname({
    locale,
    href: { pathname: "/blog/[slug]", params: { slug } }
  })}`;

  return {
    title: `${article.title} | Info Liquidation Recycle`,
    description: article.excerpt,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      url: canonical,
      images: ["/images/ordinateurs-portables-recyclage.jpg"]
    }
  };
}

function formatDate(date: string, locale: Locale) {
  return new Date(date).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default async function BlogArticlePage({ params }: Params) {
  const { locale, slug } = await params;
  if (!isBlogSlug(slug)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const article = t.raw(`articles.${slug}`) as Article;

  const others = BLOG_SLUGS.filter((s) => s !== slug).map((s) => ({
    slug: s,
    ...(t.raw(`articles.${s}`) as Article)
  }));

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    inLanguage: locale,
    author: { "@type": "Organization", name: SITE.name },
    publisher: {
      "@type": "Organization",
      name: SITE.legalName,
      logo: { "@type": "ImageObject", url: `${SITE.url}/logo.png` }
    }
  };

  return (
    <>
      <article>
        <header data-theme="green" className="relative overflow-hidden pb-12 pt-32 sm:pb-16 sm:pt-40">
          <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
            <Reveal>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald transition-colors hover:text-lime"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t("backToBlog")}
              </Link>
              <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-moss">
                <CalendarDays className="h-4 w-4 text-emerald" aria-hidden="true" />
                {t("publishedOn")} {formatDate(article.date, locale)}
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold leading-[1.12] text-mist sm:text-4xl lg:text-5xl">
                {article.title}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-moss">{article.excerpt}</p>
            </Reveal>
          </div>
        </header>

        <Section className="pt-4">
          <div className="mx-auto max-w-3xl">
            {article.sections.map((section, i) => (
              <Reveal key={i} delay={0.05 * i} className="mt-8 first:mt-0">
                <h2 className="font-display text-xl font-bold text-mist sm:text-2xl">{section.h}</h2>
                <p className="mt-3 leading-relaxed text-moss">{section.p}</p>
              </Reveal>
            ))}
          </div>
        </Section>
      </article>

      {/* À lire aussi */}
      <Section className="bg-surface/30">
        <h2 className="mb-8 font-display text-2xl font-bold text-mist">{t("moreArticles")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {others.map((other) => (
            <Reveal key={other.slug}>
              <Link
                href={{ pathname: "/blog/[slug]", params: { slug: other.slug } }}
                className="glass group flex h-full flex-col rounded-3xl p-6 transition-colors duration-300 hover:border-emerald/40"
              >
                <p className="text-xs font-medium text-emerald">{formatDate(other.date, locale)}</p>
                <h3 className="mt-2 font-display text-base font-bold leading-snug text-mist group-hover:text-emerald">
                  {other.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-moss">{other.excerpt}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      <CtaBanner title={t("subtitle")} />
      <JsonLd data={articleJsonLd} />
    </>
  );
}
