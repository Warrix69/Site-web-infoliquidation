import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // FR (défaut) sans préfixe → infoliquidationrecycle.com/a-propos
  // EN sous /en → infoliquidationrecycle.com/en/about
  localePrefix: "as-needed",
  pathnames: {
    "/": "/",
    "/a-propos": {
      fr: "/a-propos",
      en: "/about"
    },
    "/informations": {
      fr: "/informations",
      en: "/information"
    },
    "/recyclage-ordinateur": {
      fr: "/recyclage-ordinateur",
      en: "/computer-recycling"
    },
    "/formulaire-de-ramassage": {
      fr: "/formulaire-de-ramassage",
      en: "/pick-up-form"
    },
    "/destruction-des-donnees": {
      fr: "/destruction-des-donnees",
      en: "/data-destruction"
    },
    "/matieres-recyclables": {
      fr: "/matieres-recyclables",
      en: "/recyclable-materials"
    },
    "/procedure-de-recuperation": {
      fr: "/procedure-de-recuperation",
      en: "/recovery-procedure"
    },
    "/destruction-des-disques-durs": {
      fr: "/destruction-des-disques-durs",
      en: "/hard-drive-destruction"
    },
    "/recyclage-telephones": {
      fr: "/recyclage-telephones",
      en: "/phone-recycling"
    },
    "/faq": "/faq",
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/contact": "/contact",
    "/merci": {
      fr: "/merci",
      en: "/thank-you"
    },
    "/admin": "/admin",
    "/politique-de-temoins": {
      fr: "/politique-de-temoins",
      en: "/cookie-policy"
    },
    "/[ville]": "/[ville]"
  }
});

export type AppPathname = keyof typeof routing.pathnames;
/** Routes sans segment dynamique (utilisables dans <Link> sans params). */
export type StaticAppPathname = Exclude<AppPathname, "/blog/[slug]" | "/[ville]">;
export type Locale = (typeof routing.locales)[number];
