"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring
} from "framer-motion";
import { ArrowRight, CalendarCheck, Check, ClipboardList, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type StepItem = { title: string; line: string };
export type StepsMock = {
  rows: string[];
  items: string;
  minimum: string;
  reply: string;
  date: string;
  free: string;
  within: string;
};
export type StepsHeading = { eyebrow: string; title: string; subtitle: string };

const ICONS = [ClipboardList, CalendarCheck, Truck];
const EASE = [0.16, 1, 0.3, 1] as const;
/** Exemple repris de la description d'origine : 45 ordinateurs, 30 écrans CRT, 6 imprimantes. */
const EXAMPLE = [45, 30, 6];

/**
 * « Comment ça marche » : la section s'épingle et le défilement fait avancer les étapes une à une,
 * avec une barre de progression. Un clic sur une étape y amène directement.
 */
export function StepsTimeline({
  heading,
  items,
  mock,
  cta
}: {
  heading: StepsHeading;
  items: StepItem[];
  mock: StepsMock;
  cta: string;
}) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  const n = items.length;

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduce) return;
    const next = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
    setActive((a) => (a === next ? a : next));
  });

  const select = (i: number) => {
    setActive(i);
    const track = trackRef.current;
    if (reduce || !track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const travel = track.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.5) / n) * travel, behavior: "smooth" });
  };

  return (
    <div ref={trackRef} className="relative h-[280vh] motion-reduce:h-auto lg:h-[300vh] motion-reduce:lg:h-auto">
      <div className="sticky top-0 flex h-[100svh] items-center pb-4 pt-32 motion-reduce:relative motion-reduce:h-auto motion-reduce:py-16 lg:pb-6">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-emerald">{heading.eyebrow}</p>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,3.6vw,2.75rem)] font-bold leading-tight tracking-[-0.02em] text-ink">
              {heading.title}
            </h2>
            <p className="mt-2 hidden text-base leading-relaxed text-moss sm:block">{heading.subtitle}</p>
          </div>

          <div className="mt-6 grid items-center gap-6 lg:mt-10 lg:grid-cols-12 lg:gap-12">
            {/* Étapes + progression */}
            <div className="relative lg:col-span-5">
              <div aria-hidden="true" className="absolute bottom-3 left-[27px] top-3 w-[3px] overflow-hidden rounded-full bg-ink/10 motion-reduce:hidden">
                <motion.div className="h-full w-full origin-top rounded-full bg-lime" style={{ scaleY: progress }} />
              </div>
              <ol className="relative space-y-2.5">
                {items.map((step, i) => {
                  const Icon = ICONS[i] ?? Check;
                  const on = i === active;
                  const done = i < active;
                  return (
                    <li key={step.title}>
                      <button
                        type="button"
                        onClick={() => select(i)}
                        aria-current={on ? "step" : undefined}
                        className={`relative flex w-full items-start gap-4 rounded-2xl p-3.5 text-left transition-[background-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:p-4 ${
                          on ? "bg-ink text-paper shadow-[0_20px_40px_-24px_rgba(10,10,10,0.6)]" : "text-ink hover:bg-sand"
                        }`}
                      >
                        <span
                          className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 ${
                            on ? "bg-lime text-ink" : done ? "bg-ink text-lime" : "bg-paper text-ink ring-1 ring-ink/10"
                          }`}
                        >
                          {done ? <Check className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
                        </span>
                        <span>
                          <span className="block font-display text-base font-bold leading-snug sm:text-lg">{step.title}</span>
                          <span
                            className={`mt-0.5 text-sm leading-relaxed transition-colors ${
                              on ? "block text-paper/75" : "hidden text-moss sm:block"
                            }`}
                          >
                            {step.line}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <Link
                href="/formulaire-de-ramassage"
                className="group mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-accent px-6 py-3.5 font-display text-sm font-semibold text-ink transition-[filter] hover:brightness-95 sm:text-base"
              >
                {cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>

            {/* Aperçu de l'étape active */}
            <div className="hidden lg:col-span-7 lg:block">
              <StepPreview active={active} mock={mock} reduce={!!reduce} />
            </div>
          </div>
          <div className="mt-5 lg:hidden">
            <StepPreview active={active} mock={mock} reduce={!!reduce} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepPreview({ active, mock, reduce }: { active: number; mock: StepsMock; reduce: boolean }) {
  const enter = reduce ? { duration: 0 } : { duration: 0.6, ease: EASE };
  return (
    <div className="relative flex h-[min(28svh,230px)] items-center justify-center overflow-hidden rounded-[2rem] bg-sand p-4 sm:h-[300px] sm:p-5 lg:h-[min(52svh,440px)] lg:p-10">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: enter }}
          exit={{ opacity: 0, y: -16, filter: "blur(6px)", transition: reduce ? { duration: 0 } : { duration: 0.3 } }}
          className="flex h-full w-full items-center justify-center"
        >
          {active === 0 && (
            <div className="w-full max-w-sm scale-[0.78] rounded-2xl bg-paper p-5 shadow-[0_24px_50px_-28px_rgba(10,10,10,0.4)] sm:scale-100 sm:p-6">
              <ul className="space-y-3">
                {mock.rows.map((row, i) => (
                  <li key={row} className="flex items-center justify-between gap-4 border-b border-line pb-3 text-sm font-medium sm:text-base">
                    {row}
                    <span className="rounded-lg bg-sand px-3 py-1 font-display font-bold tabular-nums">{EXAMPLE[i]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-display text-2xl font-bold tabular-nums">
                {EXAMPLE.reduce((a, b) => a + b, 0)} <span className="text-sm font-medium text-moss">{mock.items}</span>
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald sm:text-sm">
                <Check className="h-4 w-4" aria-hidden="true" />
                {mock.minimum}
              </p>
            </div>
          )}

          {active === 1 && (
            <div className="w-full max-w-sm scale-[0.78] rounded-2xl bg-paper p-5 shadow-[0_24px_50px_-28px_rgba(10,10,10,0.4)] sm:scale-100 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{mock.date}</p>
              <div className="mt-4 grid grid-cols-7 gap-1.5" aria-hidden="true">
                {Array.from({ length: 21 }, (_, d) => (
                  <span
                    key={d}
                    className={`flex aspect-square items-center justify-center rounded-lg text-xs font-semibold sm:text-sm ${
                      d === 10 ? "bg-ink text-paper" : d % 7 > 4 ? "text-ink/30" : "bg-sand text-ink/70"
                    }`}
                  >
                    {d + 1}
                  </span>
                ))}
              </div>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald/10 px-3 py-1.5 text-xs font-semibold text-emerald sm:text-sm">
                <Check className="h-4 w-4" aria-hidden="true" />
                {mock.reply}
              </p>
            </div>
          )}

          {active === 2 && <VanArrival mock={mock} reduce={reduce} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Étape 3 : la camionnette arrive en roulant, s'arrête avec un petit rebond, puis les pastilles apparaissent. */
function VanArrival({ mock, reduce }: { mock: StepsMock; reduce: boolean }) {
  return (
    <div className="relative w-full max-w-[560px]">
      {/* Route */}
      <span aria-hidden="true" className="absolute bottom-[6%] left-0 right-0 h-px bg-ink/15" />
      <motion.span
        aria-hidden="true"
        className="absolute bottom-[4%] left-[12%] h-4 w-[76%] rounded-[50%] bg-ink/25 blur-md"
        initial={{ opacity: 0, scaleX: 0.4 }}
        animate={{ opacity: 1, scaleX: 1, transition: reduce ? { duration: 0 } : { duration: 0.9, delay: 0.2, ease: EASE } }}
      />
      <motion.div
        initial={{ x: "70%", opacity: 0 }}
        animate={{
          x: "0%",
          opacity: 1,
          transition: reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 15, mass: 1.1 }
        }}
        whileHover={reduce ? undefined : { y: -4, transition: { type: "spring", stiffness: 300, damping: 15 } }}
        className="relative"
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, 0, -3, 0, -1, 0] }}
          transition={{ duration: 1.6, times: [0, 0.45, 0.55, 0.7, 0.82, 1], ease: "easeOut" }}
        >
          <Image
            src="/images/objets/camionnette-logo.webp"
            alt=""
            width={1200}
            height={497}
            sizes="(max-width: 1024px) 90vw, 40vw"
            className="h-auto w-full drop-shadow-[0_18px_22px_rgba(10,10,10,0.25)]"
          />
        </motion.div>
      </motion.div>
      <div className="absolute -top-2 right-0 flex flex-col items-end gap-2 sm:-top-4">
        <motion.span
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: reduce ? { duration: 0 } : { duration: 0.5, delay: 0.9, ease: EASE } }}
          className="rounded-full bg-ink px-4 py-1.5 font-display text-sm font-bold text-paper sm:text-base"
        >
          {mock.free}
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: reduce ? { duration: 0 } : { duration: 0.5, delay: 1.05, ease: EASE } }}
          className="rounded-full bg-lime px-4 py-1.5 text-xs font-bold text-ink sm:text-sm"
        >
          {mock.within}
        </motion.span>
      </div>
    </div>
  );
}
