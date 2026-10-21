import type { Metadata } from "next";
import { CheckCircle2, PhoneCall } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { PrimaryButtonLink, GhostButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import type { Locale } from "@/i18n/routing";
import { SITE } from "@/lib/site";

type Params = { params: Promise<{ locale: Locale }> };

export const metadata: Metadata = {
  title: "Merci | Info Liquidation Recycle",
  robots: { index: false, follow: true }
};

const STEPS = [
  {
    title: "On vous appelle sous 24 h",
    desc: "Pour valider votre demande et confirmer la date de ramassage."
  },
  {
    title: "Regroupez le matériel",
    desc: "À un endroit facile d'accès (entrée, quai, hall)."
  },
  {
    title: "Sauvegardez vos données",
    desc: "On s'occupe de la destruction si vous l'avez demandée."
  },
  {
    title: "On ramasse, on part",
    desc: "Accueillez notre équipe. Transport gratuit, aucuns frais."
  },
  {
    title: "Certificat par courriel",
    desc: "Avec numéros de série, pour la conformité Loi 25."
  }
];

export default async function MerciPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("merci");

  return (
    <>
      {/* Confirmation */}
      <Section className="pb-10 pt-40">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-soft">
              <CheckCircle2 className="h-10 w-10 text-emerald" aria-hidden="true" />
            </div>
            <p className="mt-6 font-manifest text-xs uppercase tracking-[0.22em] text-emerald">
              Demande reçue
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-moss">{t("intro")}</p>
            <p className="mt-3 text-base leading-relaxed text-moss">{t("next")}</p>
          </Reveal>
        </div>
      </Section>

      {/* Étapes qui suivent — section avec fond vert très doux pour l'emphase */}
      <section className="relative overflow-hidden bg-emerald-soft py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Reveal className="mb-10 text-center">
            <p className="font-manifest text-xs uppercase tracking-[0.22em] text-emerald">
              La suite
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">
              Ce qui se passe maintenant
            </h2>
            <p className="mt-4 text-base leading-relaxed text-moss">
              Pour accélérer le ramassage et éviter tout tracas le jour J, voici les 5 étapes clés.
            </p>
          </Reveal>

          {/* Grille horizontale : 5 étapes épurées, de gauche à droite */}
          <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map(({ title, desc }, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <li className="flex h-full flex-col rounded-3xl bg-paper p-6 sm:p-7">
                  {/* Grosse pastille verte avec le numéro */}
                  <span
                    aria-hidden="true"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald font-display text-lg font-bold text-paper"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-6 font-display text-lg font-bold leading-snug text-ink">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-moss">{desc}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Contact + CTAs */}
      <Section>
        <div className="mx-auto max-w-6xl">
          <Reveal className="rounded-2xl border border-ink/10 bg-paper p-6 shadow-sm sm:p-8">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-manifest text-[11px] uppercase tracking-[0.2em] text-emerald">
                  Besoin de nous joindre
                </p>
                <p className="mt-2 font-display text-xl font-bold text-ink">
                  Nos représentants restent disponibles.
                </p>
                <p className="mt-1 text-sm text-moss">
                  Lundi au jeudi 8 h – 17 h, vendredi 8 h – 16 h.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <a
                  href={SITE.phoneHref}
                  className="inline-flex items-center gap-2 font-display text-xl font-bold text-emerald hover:text-lime"
                >
                  <PhoneCall className="h-5 w-5" />
                  {SITE.phoneDisplay}
                </a>
                <a
                  href={`mailto:${SITE.email}`}
                  className="text-sm font-semibold text-moss underline decoration-emerald/50 underline-offset-4 hover:text-emerald"
                >
                  {SITE.email}
                </a>
              </div>
            </div>
          </Reveal>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PrimaryButtonLink href="/">{t("home")}</PrimaryButtonLink>
            <GhostButtonLink href="/contact">{t("contact")}</GhostButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
