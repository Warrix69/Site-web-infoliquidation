import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { SITE } from "./site";

type PathnameHref = Parameters<typeof getPathname>[0]["href"];

type PageMetadataArgs = {
  locale: Locale;
  /** Clé sous le namespace `meta` (ex. « home », « about », « city ») */
  ns: string;
  href: PathnameHref;
  /** Valeurs d'interpolation (ex. { city: "Laval" }) */
  values?: Record<string, string>;
};

/**
 * Construit les métadonnées d'une page : title/description localisés,
 * canonical, hreflang FR/EN et balises Open Graph.
 */
export async function pageMetadata({ locale, ns, href, values }: PageMetadataArgs): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t(`${ns}.title`, values);
  const description = t(`${ns}.description`, values);

  const urlFor = (l: Locale) => `${SITE.url}${getPathname({ locale: l, href })}`;
  const canonical = urlFor(locale);
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, urlFor(l)])
  );
  languages["x-default"] = urlFor(routing.defaultLocale);

  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE.name,
      locale: locale === "fr" ? "fr_CA" : "en_CA",
      type: "website",
      images: [
        {
          url: "/images/ordinateurs-portables-recyclage.jpg",
          width: 1200,
          height: 675,
          alt: SITE.name
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}
