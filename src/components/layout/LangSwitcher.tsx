"use client";

import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

type LangSwitcherProps = {
  currentLocale: Locale;
  label: string;
  /** onGreen : posé sur le bandeau vert (pastille noire pour la langue active) */
  tone?: "default" | "onGreen";
};

/** Sélecteur FR / EN — conserve la page courante (slugs traduits). */
export function LangSwitcher({ currentLocale, label, tone = "default" }: LangSwitcherProps) {
  const onGreen = tone === "onGreen";
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function switchTo(locale: Locale) {
    if (locale === currentLocale) return;
    startTransition(() => {
      // Les params dynamiques (ville, slug) sont réinjectés dans la route localisée
      router.replace(
        { pathname, params } as unknown as Parameters<typeof router.replace>[0],
        { locale }
      );
    });
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 ${
        onGreen ? "border-ink/15 bg-ink/10" : "border-line bg-surface/60"
      } ${
        isPending ? "opacity-60" : ""
      }`}
    >
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchTo(locale)}
          aria-current={locale === currentLocale ? "true" : undefined}
          className={`rounded-full px-2.5 py-1 font-display text-xs font-bold uppercase tracking-wide transition-colors ${
            locale === currentLocale
              ? onGreen
                ? "bg-ink text-paper"
                : "bg-gradient-accent text-ink"
              : onGreen
                ? "text-ink/70 hover:text-ink"
                : "text-moss hover:text-mist"
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
