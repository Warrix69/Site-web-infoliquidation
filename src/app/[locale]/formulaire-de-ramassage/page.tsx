import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PickupForm, type PickupFormLabels } from "@/components/forms/PickupForm";
import { Reveal } from "@/components/motion/Reveal";
import { QUANTITY_KEYS, type QuantityKey } from "@/lib/schemas";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, ns: "pickup", href: "/formulaire-de-ramassage" });
}

export default async function PickupFormPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pickup");

  const quantities = Object.fromEntries(
    QUANTITY_KEYS.map((key) => [key, t(`quantities.${key}`)])
  ) as Record<QuantityKey, string>;

  const labels: PickupFormLabels = {
    requiredNote: t("requiredNote"),
    minItemsNote: t("minItemsNote"),
    identityTitle: t("identityTitle"),
    quantitiesTitle: t("quantitiesTitle"),
    certificateTitle: t("certificateTitle"),
    fields: {
      title: t("fields.title"),
      titleOptions: { mr: t("fields.titleOptions.mr"), mrs: t("fields.titleOptions.mrs") },
      firstName: t("fields.firstName"),
      lastName: t("fields.lastName"),
      company: t("fields.company"),
      email: t("fields.email"),
      phone: t("fields.phone"),
      address: t("fields.address"),
      city: t("fields.city"),
      postalCode: t("fields.postalCode"),
      otherEquipment: t("fields.otherEquipment"),
      otherEquipmentPlaceholder: t("fields.otherEquipmentPlaceholder"),
      extraNamePlaceholder: t("fields.extraNamePlaceholder"),
      extraQuantityPlaceholder: t("fields.extraQuantityPlaceholder"),
      extraAdd: t("fields.extraAdd"),
      extraRemove: t("fields.extraRemove")
    },
    quantities,
    decrease: t("decrease"),
    increase: t("increase"),
    certificateQuestion: t("certificateQuestion"),
    yes: t("yes"),
    no: t("no"),
    submit: t("submit"),
    submitting: t("submitting"),
    bottomNote: t("bottomNote"),
    successTitle: t("successTitle"),
    successText: t("successText"),
    errorTitle: t("errorTitle"),
    errorText: t("errorText"),
    newRequest: t("newRequest"),
    errors: {
      titleRequired: t("errors.titleRequired"),
      firstNameRequired: t("errors.firstNameRequired"),
      lastNameRequired: t("errors.lastNameRequired"),
      emailInvalid: t("errors.emailInvalid"),
      phoneRequired: t("errors.phoneRequired"),
      addressRequired: t("errors.addressRequired"),
      cityRequired: t("errors.cityRequired"),
      postalCodeInvalid: t("errors.postalCodeInvalid"),
      certificateRequired: t("errors.certificateRequired"),
      minItems: t("errors.minItems")
    },
    totalItemsTemplate: t.raw("totalItems") as string
  };

  return (
    <>
      {/* ─── Hero (centré) ────────────────────────────────────── */}
      <header data-theme="green" className="relative overflow-hidden pb-12 pt-32 sm:pb-16 sm:pt-40">
        <div className="mx-auto w-full max-w-3xl px-5 text-center sm:px-8">
          <Reveal>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
              {t("eyebrow")}
            </span>
            <h1 className="mx-auto font-display text-4xl font-bold leading-[1.05] text-mist sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-moss sm:text-lg">
              Réponse en <span className="font-semibold text-emerald">24 h</span>, ramassage en{" "}
              <span className="font-semibold text-emerald">72 h max</span>.
            </p>
          </Reveal>
        </div>
      </header>

      {/* ─── Formulaire centré ────────────────────────────────── */}
      <section className="relative pb-24">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <PickupForm labels={labels} />
        </div>
      </section>
    </>
  );
}
