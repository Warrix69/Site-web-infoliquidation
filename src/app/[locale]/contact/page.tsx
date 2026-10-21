import type { Metadata } from "next";
import { ArrowUpRight, Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
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

  // Initiales du propriétaire (ex. « Éric Després » → « ÉD »)
  const initials = t("ownerName")
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const mapSrc =
    "https://www.google.com/maps?q=Info+Liquidation+Recycle+514+Chemin+de+la+Rivi%C3%A8re+Sud+Saint-Eustache&output=embed";

  return (
    <>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        size="compact"
        image={{ kind: "object", src: "/images/bac/bac-plein.webp", width: 52 }}
      />

      <Section className="pt-12 sm:pt-16">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Coordonnées : mises en avant */}
          <div className="space-y-5 lg:col-span-5">
            <Reveal>
              <div data-theme="dark" className="rounded-3xl p-6 text-mist sm:p-8">
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-lime font-display text-xl font-extrabold text-ink"
                  >
                    {initials}
                  </span>
                  <div>
                    <p className="font-display text-2xl font-bold leading-tight text-mist">{t("ownerName")}</p>
                    <p className="mt-0.5 text-sm font-semibold text-lime">{t("ownerRole")}</p>
                  </div>
                </div>

                <a
                  href={SITE.phoneHref}
                  className="group mt-7 flex items-center justify-between gap-4 rounded-2xl bg-lime px-5 py-4 text-ink transition-colors hover:bg-paper"
                >
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-[0.12em] text-ink/70">{tc("phoneLabel")}</span>
                    <span className="mt-0.5 block font-display text-2xl font-bold tracking-[-0.01em] sm:text-3xl">
                      {SITE.phoneDisplay}
                    </span>
                  </span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-transform group-hover:scale-105">
                    <Phone className="h-5 w-5" aria-hidden="true" />
                  </span>
                </a>

                <a
                  href={`mailto:${SITE.email}`}
                  className="group mt-3 flex items-center justify-between gap-4 rounded-2xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1]"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-[0.12em] text-moss">{tc("emailLabel")}</span>
                    <span className="mt-0.5 block font-display text-[13px] font-semibold text-mist [overflow-wrap:anywhere] sm:text-base">
                      {SITE.email}
                    </span>
                  </span>
                  <Mail className="h-5 w-5 shrink-0 text-lime" aria-hidden="true" />
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-3xl bg-sand p-6 sm:p-8">
                <a
                  href={SITE.address.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-paper text-emerald">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold uppercase tracking-[0.12em] text-moss">{tc("addressLabel")}</span>
                    <span className="mt-1 block font-display text-lg font-semibold leading-snug text-ink">
                      {SITE.address.street}
                      <br />
                      {SITE.address.city}, {SITE.address.region} {SITE.address.postalCode}
                    </span>
                  </span>
                  <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-ink/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </a>

                <div className="mt-6 flex items-start gap-4 border-t border-ink/10 pt-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-paper text-emerald">
                    <Clock className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-[0.12em] text-moss">{tc("hoursLabel")}</span>
                    <span className="mt-1 block text-sm font-medium leading-relaxed text-ink sm:text-base">
                      {tc("hoursMonThu")}
                      <br />
                      {tc("hoursFri")}
                      <br />
                      {tc("hoursWeekend")}
                    </span>
                  </span>
                </div>

                <a
                  href={SITE.address.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-emerald"
                >
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  {t("directions")}
                </a>
              </div>
            </Reveal>
          </div>

          {/* Formulaire */}
          <Reveal delay={0.12} className="lg:col-span-7">
            <h2 className="mb-4 font-display text-2xl font-bold text-mist">{t("formTitle")}</h2>
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
