import type { AppPathname } from "@/i18n/routing";

/** Coordonnées officielles — ne jamais modifier sans confirmation du client. */
export const SITE = {
  name: "Info Liquidation Recycle",
  legalName: "Info Liquidation Recycle Inc.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://infoliquidationrecycle.com",
  phoneDisplay: "(450) 473-4636",
  phoneHref: "tel:4504734636",
  email: "info@infoliquidationrecycle.com",
  address: {
    street: "514 Chemin De La Rivière Sud, Local 102",
    city: "Saint-Eustache",
    region: "QC",
    postalCode: "J7R 0E2",
    country: "CA",
    mapsUrl: "https://g.page/InfoLiquidationRecycle?share",
    // Coordonnées géographiques de Saint-Eustache (secteur Chemin de la Rivière Sud)
    geo: { lat: 45.5379, lng: -73.8752 }
  },
  facebook: "https://www.facebook.com/InfoLiquidationRecycle/",
  foundedYear: 2005,
  founder: "Éric Després"
} as const;

/** Les 7 services, dans l'ordre officiel du site. */
export const SERVICE_ROUTES = [
  "/recyclage-ordinateur",
  "/formulaire-de-ramassage",
  "/destruction-des-donnees",
  "/matieres-recyclables",
  "/procedure-de-recuperation",
  "/destruction-des-disques-durs",
  "/recyclage-telephones"
] as const satisfies readonly AppPathname[];

export type ServiceRoute = (typeof SERVICE_ROUTES)[number];

/** Mapping clé de traduction (messages `services.*`) ↔ route. */
export const SERVICES = [
  { key: "computer", route: "/recyclage-ordinateur" },
  { key: "pickupForm", route: "/formulaire-de-ramassage" },
  { key: "data", route: "/destruction-des-donnees" },
  { key: "materials", route: "/matieres-recyclables" },
  { key: "procedure", route: "/procedure-de-recuperation" },
  { key: "hardDrives", route: "/destruction-des-disques-durs" },
  { key: "phones", route: "/recyclage-telephones" }
] as const satisfies readonly { key: string; route: ServiceRoute }[];

export type ServiceKey = (typeof SERVICES)[number]["key"];

/**
 * Villes desservies — slugs des pages SEO locales + libellés.
 * `region` : selon la FAQ officielle, la Rive-Sud est desservie à partir
 * de 50 items (au lieu du minimum habituel de 20).
 */
export const CITIES = [
  { slug: "montreal", fr: "Montréal", en: "Montreal", region: "montreal" },
  { slug: "laval", fr: "Laval", en: "Laval", region: "laval" },
  { slug: "saint-eustache", fr: "Saint-Eustache", en: "Saint-Eustache", region: "rive-nord" },
  { slug: "longueuil", fr: "Longueuil", en: "Longueuil", region: "rive-sud" },
  { slug: "boisbriand", fr: "Boisbriand", en: "Boisbriand", region: "rive-nord" },
  { slug: "st-jerome", fr: "Saint-Jérôme", en: "Saint-Jérôme", region: "rive-nord" },
  { slug: "mascouche", fr: "Mascouche", en: "Mascouche", region: "rive-nord" },
  { slug: "lachine", fr: "Lachine", en: "Lachine", region: "montreal" },
  { slug: "terrebonne", fr: "Terrebonne", en: "Terrebonne", region: "rive-nord" },
  { slug: "brossard", fr: "Brossard", en: "Brossard", region: "rive-sud" },
  { slug: "sainte-therese", fr: "Sainte-Thérèse", en: "Sainte-Thérèse", region: "rive-nord" },
  { slug: "mirabel", fr: "Mirabel", en: "Mirabel", region: "rive-nord" },
  { slug: "dorval", fr: "Dorval", en: "Dorval", region: "montreal" },
  { slug: "cote-saint-luc", fr: "Côte-Saint-Luc", en: "Côte-Saint-Luc", region: "montreal" },
  { slug: "saint-laurent", fr: "Ville Saint-Laurent", en: "Saint-Laurent", region: "montreal" },
  { slug: "kirkland", fr: "Kirkland", en: "Kirkland", region: "montreal" },
  { slug: "repentigny", fr: "Repentigny", en: "Repentigny", region: "rive-nord" },
  { slug: "lasalle", fr: "LaSalle", en: "LaSalle", region: "montreal" },
  { slug: "blainville", fr: "Blainville", en: "Blainville", region: "rive-nord" }
] as const;

export type CitySlug = (typeof CITIES)[number]["slug"];

export const CITY_SLUGS = CITIES.map((c) => c.slug);

export function getCity(slug: string) {
  return CITIES.find((c) => c.slug === slug);
}

/**
 * Slugs des articles migrés depuis le WordPress d'origine.
 * Les URL sont conservées 1:1 avec l'ancien site (SEO).
 */
export const BLOG_SLUGS = [
  "cybersecurite-et-recyclage-informatique-comment-proteger-les-donnees-de-votre-pme",
  "panneaux-solaires-en-fin-de-vie-le-prochain-grand-defi-du-recyclage-electronique-au-quebec",
  "le-passeport-numerique-des-produits-la-revolution-de-la-tracabilite-electronique-arrive-au-canada",
  "batteries-de-vehicules-electriques-en-fin-de-vie-seconde-vie-et-recyclage-au-quebec",
  "le-droit-a-la-reparation-au-canada-ce-que-ca-change-pour-vos-appareils-electroniques",
  "intelligence-artificielle-et-dechets-electroniques-le-nouveau-defi-du-recyclage-en-2026",
  "nos-5-conseils-pour-un-recyclage-reussi",
  "recyclage-informatique-guide-du-filage-electrique-responsable",
  "destruction-securisee-des-disques-durs-protegez-vos-donnees-sensibles",
  "gestion-ecologique-des-dechets-electroniques-a-montreal"
] as const;

export type BlogSlug = (typeof BLOG_SLUGS)[number];
