import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type AppPathname, type Locale } from "@/i18n/routing";
import { BLOG_SLUGS, CITY_SLUGS, SITE } from "@/lib/site";

type StaticRoute = Exclude<AppPathname, "/blog/[slug]" | "/[ville]">;

const STATIC_ROUTES: { route: StaticRoute; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { route: "/", priority: 1.0, changeFrequency: "weekly" },
  { route: "/formulaire-de-ramassage", priority: 0.9, changeFrequency: "monthly" },
  { route: "/recyclage-ordinateur", priority: 0.8, changeFrequency: "monthly" },
  { route: "/destruction-des-donnees", priority: 0.8, changeFrequency: "monthly" },
  { route: "/destruction-des-disques-durs", priority: 0.8, changeFrequency: "monthly" },
  { route: "/matieres-recyclables", priority: 0.7, changeFrequency: "monthly" },
  { route: "/procedure-de-recuperation", priority: 0.7, changeFrequency: "monthly" },
  { route: "/recyclage-telephones", priority: 0.7, changeFrequency: "monthly" },
  { route: "/a-propos", priority: 0.6, changeFrequency: "yearly" },
  { route: "/informations", priority: 0.6, changeFrequency: "yearly" },
  { route: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { route: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { route: "/contact", priority: 0.7, changeFrequency: "yearly" }
];

function alternates(href: Parameters<typeof getPathname>[0]["href"]) {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${SITE.url}${getPathname({ locale: locale as Locale, href })}`;
  }
  return { languages };
}

function entry(
  href: Parameters<typeof getPathname>[0]["href"],
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE.url}${getPathname({ locale: routing.defaultLocale, href })}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: alternates(href)
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = STATIC_ROUTES.map(({ route, priority, changeFrequency }) =>
    entry(route, priority, changeFrequency)
  );

  const cityEntries = CITY_SLUGS.map((ville) =>
    entry({ pathname: "/[ville]", params: { ville } }, 0.7, "monthly")
  );

  const blogEntries = BLOG_SLUGS.map((slug) =>
    entry({ pathname: "/blog/[slug]", params: { slug } }, 0.5, "yearly")
  );

  return [...staticEntries, ...cityEntries, ...blogEntries];
}
