import { Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { PrimaryButtonLink } from "@/components/ui/Button";
import { SITE } from "@/lib/site";

type CtaBannerProps = {
  title: string;
  text?: string;
  buttonLabel?: string;
};

/** Bannière CTA réutilisable en bas de page → formulaire de ramassage. */
export async function CtaBanner({ title, text, buttonLabel }: CtaBannerProps) {
  const t = await getTranslations("common");

  return (
    <section className="relative overflow-hidden bg-sand py-16 sm:py-24">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal className="relative overflow-hidden rounded-3xl bg-forest px-6 py-12 text-center text-mist shadow-[0_30px_60px_-30px_rgba(15,61,46,0.6)] sm:px-12 sm:py-16">
          <div data-theme="dark" className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight text-mist sm:text-4xl">
              {title}
            </h2>
            {text && <p className="mx-auto mt-4 max-w-xl text-base text-moss sm:text-lg">{text}</p>}
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <PrimaryButtonLink href="/formulaire-de-ramassage">
                {buttonLabel ?? t("requestPickup")}
              </PrimaryButtonLink>
              <a
                href={SITE.phoneHref}
                className="inline-flex items-center gap-2 font-display text-sm font-semibold text-mist transition-colors hover:text-emerald sm:text-base"
              >
                <Phone className="h-4 w-4 text-emerald" aria-hidden="true" />
                {t("orCallUs")} {SITE.phoneDisplay}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
