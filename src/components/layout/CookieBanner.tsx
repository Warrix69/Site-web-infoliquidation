"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

const STORAGE_KEY = "ilr-cookie-consent-v1";

export type CookieBannerLabels = {
  message: string;
  accept: string;
  learnMore: string;
};

export function CookieBanner({ labels }: { labels: CookieBannerLabels }) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      /* accès bloqué (private mode) : ne pas afficher la bannière */
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-4 z-[80] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-md"
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
        >
          <div className="glass rounded-2xl border border-line bg-surface/95 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm leading-relaxed text-mist">{labels.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={accept}
                className="inline-flex items-center justify-center rounded-full bg-gradient-accent px-5 py-2 text-sm font-semibold text-ink transition-transform hover:scale-[1.02]"
              >
                {labels.accept}
              </button>
              <Link
                href="/politique-de-temoins"
                className="text-sm font-semibold text-moss underline decoration-emerald/50 underline-offset-4 transition-colors hover:text-emerald"
              >
                {labels.learnMore}
              </Link>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
