import { Clock, Facebook, Mail, MapPin, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { LogoPlaque } from "@/components/layout/LogoPlaque";
import { PrimaryButtonLink } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CITIES, SERVICES, SITE } from "@/lib/site";

/** Footer : bannière ramassage gratuit, coordonnées, navigation, villes. */
export async function Footer() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("footer");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");
  const ts = await getTranslations("services");

  const navLinks = [
    { label: tn("home"), route: "/" },
    { label: tn("about"), route: "/a-propos" },
    { label: tn("informations"), route: "/informations" },
    { label: tn("faq"), route: "/faq" },
    { label: tn("blog"), route: "/blog" },
    { label: tn("contact"), route: "/contact" }
  ] as const;

  // Liste officielle du footer : Montréal, Rive-Nord, Rive-Sud, puis les villes
  const riveNord = locale === "fr" ? "Rive-Nord" : "North Shore";
  const riveSud = locale === "fr" ? "Rive-Sud" : "South Shore";

  return (
    <footer data-theme="dark" className="relative mt-8 border-t border-line bg-ink text-mist">
      {/* Bannière ramassage gratuit */}
      <div className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 px-5 py-10 text-center sm:flex-row sm:px-8 sm:text-left">
          <p className="font-display text-xl font-bold text-mist sm:text-2xl">
            <span className="text-gradient">{t("bannerTitle")}</span>
          </p>
          <PrimaryButtonLink href="/formulaire-de-ramassage">{t("bannerCta")}</PrimaryButtonLink>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        {/* Marque */}
        <div className="space-y-4">
          <Link href="/" aria-label="Info Liquidation Recycle" className="inline-block">
            <LogoPlaque width={150} />
          </Link>
          <p className="font-display text-sm font-bold tracking-[0.2em] text-emerald">
            {tc("experts")}
          </p>
          <p className="text-sm leading-relaxed text-moss">{t("aboutText")}</p>
          <a
            href={SITE.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("facebookLabel")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-emerald-soft text-emerald transition-all duration-300 hover:bg-gradient-accent hover:text-ink hover:shadow-glow"
          >
            <Facebook className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>

        {/* Navigation */}
        <nav aria-label={t("navTitle")}>
          <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-mist">
            {t("navTitle")}
          </p>
          <ul className="space-y-2.5">
            {navLinks.map((item) => (
              <li key={item.route}>
                <Link
                  href={item.route}
                  className="text-sm text-moss transition-colors hover:text-emerald"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Services */}
        <nav aria-label={t("servicesTitle")}>
          <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-mist">
            {t("servicesTitle")}
          </p>
          <ul className="space-y-2.5">
            {SERVICES.map(({ key, route }) => (
              <li key={route}>
                <Link
                  href={route}
                  className="text-sm text-moss transition-colors hover:text-emerald"
                >
                  {ts(`${key}.title`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Coordonnées */}
        <div>
          <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-mist">
            {t("contactTitle")}
          </p>
          <ul className="space-y-3 text-sm text-moss">
            <li>
              <a
                href={SITE.address.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 transition-colors hover:text-emerald"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
                <span>
                  {SITE.address.street}
                  <br />
                  {SITE.address.city}, {SITE.address.region} {SITE.address.postalCode}
                </span>
              </a>
            </li>
            <li>
              <a
                href={SITE.phoneHref}
                className="flex items-center gap-2.5 transition-colors hover:text-emerald"
              >
                <Phone className="h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
                {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${SITE.email}`}
                className="flex items-center gap-2.5 break-all transition-colors hover:text-emerald"
              >
                <Mail className="h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
                {SITE.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
              <span>
                {tc("hoursMonThu")}
                <br />
                {tc("hoursFri")}
                <br />
                {tc("hoursWeekend")}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Villes desservies */}
      <div className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
          <p className="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-mist">
            {t("citiesTitle")}
          </p>
          <ul className="flex flex-wrap gap-x-2 gap-y-2 text-sm text-moss">
            <li>
              <Link
                href={{ pathname: "/[ville]", params: { ville: "montreal" } }}
                className="transition-colors hover:text-emerald"
              >
                {locale === "fr" ? "Montréal" : "Montreal"}
              </Link>
              <span aria-hidden="true" className="ms-2 text-line">·</span>
            </li>
            <li>
              {riveNord}
              <span aria-hidden="true" className="ms-2 text-line">·</span>
            </li>
            <li>
              {riveSud}
              <span aria-hidden="true" className="ms-2 text-line">·</span>
            </li>
            {CITIES.filter((c) => c.slug !== "montreal").map((city, i, arr) => (
              <li key={city.slug}>
                <Link
                  href={{ pathname: "/[ville]", params: { ville: city.slug } }}
                  className="transition-colors hover:text-emerald"
                >
                  {city[locale]}
                </Link>
                {i < arr.length - 1 && (
                  <span aria-hidden="true" className="ms-2 text-line">·</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-moss sm:flex-row sm:px-8">
          <p>{t("copyright")}</p>
          <a href="/sitemap.xml" className="transition-colors hover:text-emerald">
            {t("sitemap")}
          </a>
        </div>
      </div>
    </footer>
  );
}
