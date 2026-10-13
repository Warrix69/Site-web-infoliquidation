import type { Metadata } from "next";
import { Clock, Mail, MapPin, Navigation, Phone, UserRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm, type ContactFormLabels } from "@/components/forms/ContactForm";
import { Reveal } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "contact", href: "/contact" });
}

export default async function ContactPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const tc = await getTranslations("common");

  const labels: ContactFormLabels = {
    fields: {
      name: t("fields.name"),
      email: t("fields.email"),
      phone: t("fields.phone"),
      message: t("fields.message")
    },
    errors: {
      nameRequired: t("errors.nameRequired"),
      emailInvalid: t("errors.emailInvalid"),
      messageRequired: t("errors.messageRequired")
    },
    submit: t("submit"),
    submitting: t("submitting"),
    successTitle: t("successTitle"),
    successText: t("successText"),
    errorTitle: t("errorTitle"),
    errorText: t("errorText"),
    newRequest: tc("contactUs")
  };

  const mapSrc =
    "https://www.google.com/maps?q=Info+Liquidation+Recycle+514+Chemin+de+la+Rivi%C3%A8re+Sud+Saint-Eustache&output=embed";

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} />

      <Section className="pt-0">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Coordonnées */}
          <Reveal className="lg:col-span-2">
            <div className="glass h-full rounded-3xl p-7 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-accent text-ink shadow-glow">
                  <UserRound className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-mist">{t("ownerName")}</p>
                  <p className="text-sm text-emerald">{t("ownerRole")}</p>
                </div>
              </div>

              <ul className="mt-7 space-y-5 text-sm">
                <li>
                  <a
                    href={SITE.address.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 text-moss transition-colors hover:text-emerald"
                  >
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold text-mist/90">{tc("addressLabel")}</span>
                      {SITE.address.street}
                      <br />
                      {SITE.address.city}, {SITE.address.region} {SITE.address.postalCode}
                    </span>
                  </a>
                </li>
                <li>
                  <a href={SITE.phoneHref} className="group flex items-start gap-3 text-moss transition-colors hover:text-emerald">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold text-mist/90">{tc("phoneLabel")}</span>
                      {SITE.phoneDisplay}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${SITE.email}`}
                    className="group flex items-start gap-3 break-all text-moss transition-colors hover:text-emerald"
                  >
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold text-mist/90">{tc("emailLabel")}</span>
                      {SITE.email}
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-3 text-moss">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-emerald" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold text-mist/90">{tc("hoursLabel")}</span>
                    {tc("hoursMonThu")}
                    <br />
                    {tc("hoursFri")}
                    <br />
                    {tc("hoursWeekend")}
                  </span>
                </li>
              </ul>

              <a
                href={SITE.address.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface/40 px-5 py-2.5 text-sm font-semibold text-mist transition-colors hover:border-emerald/50 hover:bg-emerald-soft"
              >
                <Navigation className="h-4 w-4 text-emerald" aria-hidden="true" />
                {t("directions")}
              </a>
            </div>
          </Reveal>

          {/* Formulaire */}
          <Reveal delay={0.12} className="lg:col-span-3">
            <h2 className="mb-4 font-display text-xl font-bold text-mist">{t("formTitle")}</h2>
            <ContactForm labels={labels} />
          </Reveal>
        </div>

        {/* Carte Google Maps */}
        <Reveal className="mt-10">
          <div className="glass overflow-hidden rounded-3xl p-2">
            <iframe
              title={t("mapTitle")}
              src={mapSrc}
              width="100%"
              height="420"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full rounded-2xl border-0"
            />
          </div>
        </Reveal>
      </Section>
    </>
  );
}
