"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
};

/**
 * Révélation au scroll : fade + translation.
 * Robuste : si framer-motion ne déclenche pas whileInView dans les 1.5 s
 * (certains navigateurs, scroll contexts imbriqués, etc.), on force la
 * visibilité pour que le contenu ne reste jamais invisible.
 */
export function Reveal({ children, className, delay = 0, y = 28, once = true }: RevealProps) {
  const reduce = useReducedMotion();
  const [forceShow, setForceShow] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const style = getComputedStyle(el);
      // Si opacité toujours à 0 après 1.5 s, l'animation ne s'est pas déclenchée → on force
      if (parseFloat(style.opacity) < 0.5) setForceShow(true);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Le rendu initial doit être identique serveur/client : le mouvement réduit
  // ne change que la durée, sinon le style SSR (opacité 0) n'est jamais corrigé.
  if (forceShow) {
    return (
      <div ref={containerRef} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.05 }}
      transition={reduce ? { duration: 0 } : { duration: 0.65, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}
