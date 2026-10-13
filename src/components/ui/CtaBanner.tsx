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
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/15 blur-[130px]" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal className="glass relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="circuit-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_50%,black,transparent)]"
          />
          <div className="relative">
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
