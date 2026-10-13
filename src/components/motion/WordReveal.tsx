"use client";

import { motion, useReducedMotion } from "framer-motion";

type WordRevealProps = {
  text: string;
  className?: string;
  /** Mots (index, base 0) à colorer avec le dégradé accent */
  accentWords?: number[];
  delay?: number;
  as?: "h1" | "h2";
};

/** Titre qui se révèle mot par mot (hero). */
export function WordReveal({
  text,
  className,
  accentWords = [],
  delay = 0.15,
  as = "h1"
}: WordRevealProps) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const Tag = motion[as];

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={i}
          className={`inline-block overflow-hidden pb-1 align-bottom ${
            i < words.length - 1 ? "me-[0.28em]" : ""
          }`}
          aria-hidden="true"
        >
          <motion.span
            className={`inline-block ${accentWords.includes(i) ? "text-gradient" : ""}`}
            initial={reduce ? undefined : { y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{
              duration: 0.7,
              delay: delay + i * 0.08,
              ease: [0.21, 0.47, 0.32, 0.98]
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
