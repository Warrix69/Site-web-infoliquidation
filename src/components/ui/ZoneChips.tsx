import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** Chips des zones desservies (Montréal → page ville ; Rive-Nord/Rive-Sud → texte). */
export function ZoneChips({ locale }: { locale: Locale }) {
  const zones =
    locale === "fr"
      ? { mtl: "Montréal", nord: "Rive-Nord", sud: "Rive-Sud" }
      : { mtl: "Montreal", nord: "North Shore", sud: "South Shore" };

  const chipCls =
    "glass-light inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-mist/90";

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={{ pathname: "/[ville]", params: { ville: "montreal" } }}
        className={`${chipCls} transition-colors hover:border-emerald/40 hover:text-emerald`}
      >
        <MapPin className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
        {zones.mtl}
      </Link>
      <span className={chipCls}>
        <MapPin className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
        {zones.nord}
      </span>
      <span className={chipCls}>
        <MapPin className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
        {zones.sud}
      </span>
    </div>
  );
}
