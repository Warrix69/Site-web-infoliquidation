import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: Locale }> };

export const metadata: Metadata = {
  title: "Dashboard · Admin | Info Liquidation Recycle",
  robots: { index: false, follow: false }
};

/**
 * Dashboard interne intégré en plein écran via iframe.
 * Le HTML du dashboard est servi en statique depuis /public/admin/dashboard.html,
 * donc tout le JavaScript du dashboard tourne au même origine que le site.
 */
export default async function AdminPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <iframe
      src="/admin/dashboard.html"
      title="Dashboard Info Liquidation"
      className="fixed inset-0 z-[9999] h-screen w-screen border-0 bg-[#0A0F1C]"
      allow="clipboard-write; clipboard-read"
    />
  );
}
