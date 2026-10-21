"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Menu, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LangSwitcher } from "@/components/layout/LangSwitcher";
import { LogoPlaque } from "@/components/layout/LogoPlaque";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale, StaticAppPathname } from "@/i18n/routing";
import { SITE } from "@/lib/site";

export type HeaderLabels = {
  topbarMessage: string;
  cta: string;
  openMenu: string;
  closeMenu: string;
  servicesMenuLabel: string;
  langSwitchLabel: string;
  mainNavLabel: string;
  nav: {
    home: string;
    about: string;
    informations: string;
    services: string;
    faq: string;
    blog: string;
    contact: string;
  };
  services: { key: string; route: StaticAppPathname; title: string }[];
};

type NavItem = { label: string; route: StaticAppPathname };

type HeaderProps = {
  locale: Locale;
  labels: HeaderLabels;
};

/** Header sticky glassmorphism : topbar, nav, dropdown Services, FR/EN, CTA. */
export function Header({ locale, labels }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ferme les menus à chaque navigation
  useEffect(() => {
    setMobileOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  // Verrouille le scroll quand le menu mobile est ouvert (y compris le défilement lissé)
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    if (mobileOpen) window.__lenis?.stop();
    else window.__lenis?.start();
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function openServices() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setServicesOpen(true);
  }

  function scheduleCloseServices() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setServicesOpen(false), 150);
  }

  const before: NavItem[] = [
    { label: labels.nav.home, route: "/" },
    { label: labels.nav.about, route: "/a-propos" },
    { label: labels.nav.informations, route: "/informations" }
  ];
  const after: NavItem[] = [
    { label: labels.nav.faq, route: "/faq" },
    { label: labels.nav.blog, route: "/blog" },
    { label: labels.nav.contact, route: "/contact" }
  ];

  const linkCls = (active: boolean) =>
    `rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 ${
      active ? "text-emerald" : "text-mist/90 hover:text-emerald"
    }`;

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      {/* Topbar — vert accent */}
      <div
        className="overflow-hidden bg-forest"
      >
        <div className="mx-auto flex h-10 w-full max-w-6xl items-center justify-between gap-4 px-5 text-xs sm:px-8">
          <a
            href={SITE.phoneHref}
            className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-paper transition-opacity hover:opacity-90"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {SITE.phoneDisplay}
          </a>
          <p className="hidden truncate text-paper/90 md:block">{labels.topbarMessage}</p>
          <LangSwitcher currentLocale={locale} label={labels.langSwitchLabel} />
        </div>
      </div>

      {/* Barre principale */}
      <header
        className={`transition-all duration-300 ${
          scrolled
            ? "border-b border-line bg-paper/95 shadow-[0_8px_24px_-16px_rgba(10,10,10,0.35)] backdrop-blur"
            : "border-b border-line bg-paper/95 backdrop-blur"
        }`}
      >
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="Info Liquidation Recycle" className="shrink-0">
            <LogoPlaque width={180} priority />
          </Link>

          {/* Nav desktop */}
          <nav aria-label={labels.mainNavLabel} className="hidden items-center gap-1 lg:flex">
            {before.map((item) => (
              <Link key={item.route} href={item.route} className={linkCls(pathname === item.route)}>
                {item.label}
              </Link>
            ))}

            {/* Dropdown Services */}
            <div className="relative" onMouseEnter={openServices} onMouseLeave={scheduleCloseServices}>
              <button
                type="button"
                aria-expanded={servicesOpen}
                aria-haspopup="true"
                aria-label={labels.servicesMenuLabel}
                onClick={() => setServicesOpen((o) => !o)}
                className={`inline-flex items-center gap-1 ${linkCls(servicesOpen)}`}
              >
                {labels.nav.services}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <AnimatePresence>
                {servicesOpen && (
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
                    className="absolute left-1/2 top-full w-[600px] -translate-x-1/2 pt-3"
                  >
                    {/* pt-3 : zone de survol continue entre le bouton et le panneau */}
                    <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-paper p-2 shadow-[0_24px_60px_-20px_rgba(10,10,10,0.35)]">
                      {labels.services.map((service) => {
                        const current = pathname === service.route;
                        return (
                          <Link
                            key={service.route}
                            href={service.route}
                            onClick={() => setServicesOpen(false)}
                            aria-current={current ? "page" : undefined}
                            className={`group/item flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors ${
                              current ? "bg-emerald text-paper" : "bg-sand/60 text-ink hover:bg-ink hover:text-paper"
                            }`}
                          >
                            {service.title}
                            <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60 transition-transform group-hover/item:-translate-y-0.5 group-hover/item:translate-x-0.5 group-hover/item:opacity-100" aria-hidden="true" />
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {after.map((item) => (
              <Link key={item.route} href={item.route} className={linkCls(pathname === item.route)}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/formulaire-de-ramassage"
              className="hidden rounded-full bg-gradient-accent px-5 py-2.5 font-display text-sm font-bold text-ink shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:brightness-110 md:inline-flex"
            >
              {labels.cta}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? labels.closeMenu : labels.openMenu}
              className="glass-light inline-flex h-10 w-10 items-center justify-center rounded-full text-mist lg:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Menu mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            aria-label={labels.mainNavLabel}
            initial={reduce ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="mx-4 mt-2 max-h-[calc(100dvh-120px)] overflow-y-auto rounded-2xl border border-line bg-paper p-4 shadow-[0_24px_60px_-20px_rgba(10,10,10,0.35)] lg:hidden"
          >
            <div className="flex flex-col">
              {before.map((item) => (
                <Link
                  key={item.route}
                  href={item.route}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 font-display text-base font-semibold text-mist hover:bg-emerald-soft hover:text-emerald"
                >
                  {item.label}
                </Link>
              ))}
              <p className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald">
                {labels.nav.services}
              </p>
              {labels.services.map((service) => (
                <Link
                  key={service.route}
                  href={service.route}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm text-mist/90 hover:bg-emerald-soft hover:text-emerald"
                >
                  {service.title}
                </Link>
              ))}
              <div className="my-2 border-t border-line" />
              {after.map((item) => (
                <Link
                  key={item.route}
                  href={item.route}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 font-display text-base font-semibold text-mist hover:bg-emerald-soft hover:text-emerald"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/formulaire-de-ramassage"
                onClick={() => setMobileOpen(false)}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-gradient-accent px-5 py-3 font-display text-sm font-bold text-ink shadow-glow"
              >
                {labels.cta}
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
