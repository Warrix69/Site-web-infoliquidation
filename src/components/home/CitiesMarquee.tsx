import { MapPin } from "lucide-react";
import { Marquee } from "@/components/ui/Marquee";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CITIES } from "@/lib/site";

type CitiesMarqueeProps = {
  locale: Locale;
  label: string;
};

/** Marquee infini des villes desservies (liens vers les pages villes). */
export function CitiesMarquee({ locale, label }: CitiesMarqueeProps) {
  return (
    <Marquee label={label} className="py-2">
      {CITIES.map((city) => (
        <Link
          key={city.slug}
          href={{ pathname: "/[ville]", params: { ville: city.slug } }}
          className="glass-light inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-mist/90 transition-colors hover:border-emerald/40 hover:text-emerald"
        >
          <MapPin className="h-3.5 w-3.5 text-emerald" aria-hidden="true" />
          {city[locale]}
        </Link>
      ))}
    </Marquee>
  );
}
