import {
  HardDrive,
  Laptop,
  Recycle,
  ShieldCheck,
  Smartphone,
  Truck,
  Workflow,
  ArrowUpRight
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";
import { Link } from "@/i18n/navigation";
import { SERVICES, type ServiceKey } from "@/lib/site";

const ICONS: Record<ServiceKey, typeof Laptop> = {
  computer: Laptop,
  pickupForm: Truck,
  data: ShieldCheck,
  materials: Recycle,
  procedure: Workflow,
  hardDrives: HardDrive,
  phones: Smartphone
};

/** Grille des 7 services — cartes glassmorphism avec tilt 3D + glow souris. */
export async function ServicesGrid() {
  const t = await getTranslations("services");

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {SERVICES.map(({ key, route }, i) => {
        const Icon = ICONS[key];
        return (
          <Reveal key={key} delay={Math.min(i * 0.07, 0.42)} className={i === 6 ? "sm:col-span-2 lg:col-span-1" : ""}>
            <TiltCard className="h-full rounded-3xl">
              <Link
                href={route}
                className="glass group/card relative flex h-full flex-col gap-4 rounded-3xl p-6 transition-colors duration-300 hover:border-emerald/40 sm:p-7"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald transition-all duration-300 group-hover/card:bg-gradient-accent group-hover/card:text-ink group-hover/card:shadow-glow">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="font-display text-lg font-bold leading-snug text-mist">
                  {t(`${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-moss">{t(`${key}.desc`)}</p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-emerald">
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-300 group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </TiltCard>
          </Reveal>
        );
      })}
    </div>
  );
}
