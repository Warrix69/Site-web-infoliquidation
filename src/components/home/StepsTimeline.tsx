"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

export type StepItem = {
  title: string;
  desc: string;
  img: string;
};

/** Timeline des 3 étapes : ligne qui se dessine au scroll + cartes en cascade. */
export function StepsTimeline({ items }: { items: StepItem[] }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative mt-14">
      {/* Ligne de connexion (desktop) */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-10 hidden h-px md:block"
      >
        <motion.div
          className="h-px w-full origin-left bg-gradient-to-r from-emerald/60 via-lime/50 to-emerald/20"
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        />
      </div>
      {/* Ligne verticale (mobile) */}
      <div aria-hidden="true" className="absolute bottom-8 left-10 top-4 w-px md:hidden">
        <motion.div
          className="h-full w-px origin-top bg-gradient-to-b from-emerald/60 via-lime/50 to-emerald/20"
          initial={reduce ? false : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        />
      </div>

      <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
        {items.map((step, i) => (
          <motion.li
            key={step.title}
            initial={reduce ? false : { opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.25 + i * 0.25 }}
            className="relative flex gap-5 md:flex-col md:gap-0"
          >
            {/* Pastille numérotée */}
            <div className="relative z-10 flex h-20 w-20 shrink-0 items-center justify-center md:mb-6">
              <span className="glass flex h-20 w-20 items-center justify-center rounded-2xl">
                <Image src={step.img} alt="" width={44} height={44} className="h-11 w-11" />
              </span>
              <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-accent font-display text-sm font-bold text-ink shadow-glow">
                {i + 1}
              </span>
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-mist">{step.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-moss sm:text-base">{step.desc}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
