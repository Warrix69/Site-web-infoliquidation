import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Building2, CheckCircle2, MapPin } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Counter } from "@/components/motion/Counter";
import { Reveal } from "@/components/motion/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { CtaBanner } from "@/components/ui/CtaBanner";
import { PageHero } from "@/components/ui/PageHero";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Link } from "@/i18n/navigation";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { CITIES, CITY_SLUGS, getCity, SERVICES, SITE } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale; ville: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    CITY_SLUGS.map((ville) => ({ locale, ville }))
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, ville } = await params;
  const city = getCity(ville);
  if (!city) return {};
  return pageMetadata({
    locale,
    ns: "city",
    href: { pathname: "/[ville]", params: { ville } },
    values: { city: city[locale] }
  });
}

export default async function CityPage({ params }: Params) {
  const { locale, ville } = await params;
  const city = getCity(ville);
  if (!city) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("city");
  const ts = await getTranslations("services");
  const th = await getTranslations("home");
  const cityName = city[locale];
  const regionLabel = t(`regionLabels.${city.region}`);

  const steps = th.raw("steps.items") as { title: string; desc: string }[];

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType:
      locale === "fr"
        ? "Recyclage informatique et électronique"
        : "Computer and electronic recycling",
    provider: { "@type": "LocalBusiness", name: SITE.legalName, telephone: "+1-450-473-4636" },
    areaServed: { "@type": "City", name: cityName },
    url: `${SITE.url}${getPathname({ locale, href: { pathname: "/[ville]", params: { ville } } })}`
  };

  const otherCities = CITIES.filter((c) => c.slug !== ville);

  return (
    <>
      <PageHero eyebrow={`${t("eyebrow")} · ${regionLabel}`} title={t("title", { city: cityName })} image={{ kind: "photo", src: "/images/centre/allee.webp" }}>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-moss sm:text-lg">
          {t("intro", { city: cityName })}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="glass-light inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist/90">
            <MapPin className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
            {regionLabel}
          </span>
          <span className="glass-light inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist/90">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
            {t("minNote")}
          </span>
          {city.region === "rive-sud" && (
            <span className="glass-light inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist/90">
              {t("southShoreNote")}
            </span>
          )}
        </div>
      </PageHero>

      {/* Ce que nous récupérons */}
      <Section className="pt-0">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-display text-2xl font-bold text-mist sm:text-3xl">
              {t("whatTitle", { city: cityName })}
            </h2>
            <p className="mt-4 leading-relaxed text-moss">{t("whatText", { city: cityName })}</p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { value: 24, suffix: "h" },
                { value: 72, suffix: "h" },
                { value: 0, suffix: "$" }
              ].map((stat, i) => (
                <div key={i} className="glass rounded-2xl p-4 text-center">
                  <p className="font-display text-2xl font-bold text-gradient sm:text-3xl">
                    <Counter value={stat.value} suffix={stat.suffix} locale={locale} />
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="glass rounded-3xl p-7 sm:p-8">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-accent text-ink shadow-glow">
                <Building2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-mist">
                {t("servicesTitle", { city: cityName })}
              </h2>
              <ul className="mt-4 grid gap-2">
                {SERVICES.map(({ key, route }) => (
                  <li key={route}>
                    <Link
                      href={route}
                      className="group flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm text-mist/90 transition-colors hover:bg-emerald-soft hover:text-emerald"
                    >
                      {ts(`${key}.title`)}
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-emerald opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Comment ça marche */}
      <Section className="bg-surface/30">
        <SectionHeading title={t("howTitle")} className="mb-12" />
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.1}>
              <div className="glass h-full rounded-3xl p-6 sm:p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-accent font-display text-lg font-bold text-ink shadow-glow">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-mist">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-moss">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Autres villes */}
      <Section>
        <SectionHeading title={t("otherCities")} className="mb-8" />
        <Reveal>
          <ul className="flex flex-wrap justify-center gap-3">
            {otherCities.map((other) => (
              <li key={other.slug}>
                <Link
                  href={{ pathname: "/[ville]", params: { ville: other.slug } }}
                  className="glass-light inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist/90 transition-colors hover:border-emerald/40 hover:text-emerald"
                >
                  <MapPin className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
                  {other[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      <CtaBanner title={t("ctaTitle", { city: cityName })} text={t("ctaText")} />
      <JsonLd data={serviceJsonLd} />
    </>
  );
}
