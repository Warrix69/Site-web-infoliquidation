import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CookieBanner, type CookieBannerLabels } from "@/components/layout/CookieBanner";
import { Footer } from "@/components/layout/Footer";
import { Header, type HeaderLabels } from "@/components/layout/Header";
import { JsonLd } from "@/components/seo/JsonLd";
import { routing, type Locale } from "@/i18n/routing";
import { SERVICES, SITE } from "@/lib/site";
import "../globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap"
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  display: "swap"
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: t("home.title"),
      template: `%s`
    },
    description: t("home.description")
  };
}

function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE.url}/#business`,
    name: SITE.legalName,
    url: SITE.url,
    logo: `${SITE.url}/logo.png`,
    image: `${SITE.url}/images/ordinateurs-portables-recyclage.jpg`,
    telephone: "+1-450-473-4636",
    email: SITE.email,
    foundingDate: String(SITE.foundedYear),
    founder: { "@type": "Person", name: SITE.founder },
    slogan: "La référence pour votre recyclage informatique et électronique",
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.address.geo.lat,
      longitude: SITE.address.geo.lng
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "08:00",
        closes: "17:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Friday",
        opens: "08:00",
        closes: "16:00"
      }
    ],
    sameAs: [SITE.facebook],
    areaServed: ["Montréal", "Laval", "Rive-Nord", "Rive-Sud", "Grand Montréal"]
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const tn = await getTranslations({ locale, namespace: "nav" });
  const ts = await getTranslations({ locale, namespace: "services" });
  const tt = await getTranslations({ locale, namespace: "topbar" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const tcb = await getTranslations({ locale, namespace: "cookieBanner" });

  const cookieLabels: CookieBannerLabels = {
    message: tcb("message"),
    accept: tcb("accept"),
    learnMore: tcb("learnMore")
  };

  const headerLabels: HeaderLabels = {
    topbarMessage: tt("message"),
    cta: tc("freePickupCta"),
    openMenu: tn("openMenu"),
    closeMenu: tn("closeMenu"),
    servicesMenuLabel: tn("servicesMenuLabel"),
    langSwitchLabel: tn("langSwitchLabel"),
    mainNavLabel: tn("mainNavLabel"),
    nav: {
      home: tn("home"),
      about: tn("about"),
      informations: tn("informations"),
      services: tn("services"),
      faq: tn("faq"),
      blog: tn("blog"),
      contact: tn("contact")
    },
    services: SERVICES.map(({ key, route }) => ({
      key,
      route,
      title: ts(`${key}.title`)
    }))
  };

  return (
    <html lang={locale} className={`${poppins.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-gradient-accent focus:px-5 focus:py-2.5 focus:font-semibold focus:text-ink"
        >
          {tc("skipToContent")}
        </a>
        {/* Les libellés passent par props : aucun message n'est embarqué côté client */}
        <NextIntlClientProvider messages={{}}>
          <Header locale={locale as Locale} labels={headerLabels} />
          <main id="main">{children}</main>
          <Footer />
          <CookieBanner labels={cookieLabels} />
        </NextIntlClientProvider>
        <JsonLd data={localBusinessJsonLd()} />
      </body>
    </html>
  );
}
