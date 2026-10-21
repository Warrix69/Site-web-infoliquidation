import { getTranslations } from "next-intl/server";
import { PrimaryButtonLink } from "@/components/ui/Button";

export default async function NotFoundPage() {
  const t = await getTranslations("notFound");

  return (
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-5 pt-24 text-center">
      <p className="font-display text-7xl font-bold text-gradient sm:text-8xl">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-mist sm:text-3xl">{t("title")}</h1>
      <p className="mt-3 max-w-md text-moss">{t("text")}</p>
      <div className="mt-8">
        <PrimaryButtonLink href="/">{t("back")}</PrimaryButtonLink>
      </div>
    </section>
  );
}
