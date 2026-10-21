"use client";

import { useEffect, useRef } from "react";

const IMG = "/images/bac/";

/** Ce qui dépasse du bac plein (mêmes positions que dans le hero). */
const TOP_ITEMS = [
  { src: "clavier", w: 82, x: 50, y: 4, r: -7 },
  { src: "souris", w: 28, x: 74, y: -5, r: 18 },
  { src: "ecran", w: 46, x: 34, y: -14, r: -6 }
];

/** Le bac plein du hero, en écho : il s'oriente vers le pointeur sur toute la section. */
export function ClosingBin() {
  const rootRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const tilt = tiltRef.current;
    const section = root?.closest("section");
    if (!root || !tilt || !section) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    const frame = () => {
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      tilt.style.transform = `perspective(900px) rotateY(${(cur.x * 10).toFixed(2)}deg) rotateX(${(-cur.y * 6).toFixed(2)}deg) rotate(${(cur.x * 2).toFixed(2)}deg)`;
      raf = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.001 ? requestAnimationFrame(frame) : 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      target.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" className="relative mx-auto w-[min(56vw,260px)] pt-[18%] lg:w-[300px]">
      <div className="animate-float">
        <div ref={tiltRef} className="origin-bottom will-change-transform">
          <div className="relative aspect-[900/1150] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${IMG}bac.webp`} alt="" loading="lazy" draggable={false} className="absolute inset-0 h-full w-full" />
            {TOP_ITEMS.map((d) => (
              <span
                key={d.src}
                className="absolute block"
                style={{
                  left: `${d.x}%`,
                  top: `${d.y}%`,
                  width: `${d.w}%`,
                  transform: `translate(-50%, -50%) rotate(${d.r}deg)`
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${IMG}${d.src}.webp`} alt="" loading="lazy" draggable={false} className="block h-auto w-full" />
              </span>
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${IMG}bac-avant.webp`} alt="" loading="lazy" draggable={false} className="absolute inset-0 h-full w-full" />
            <span className="absolute inset-0 [filter:drop-shadow(0_0_14px_rgba(0,198,90,0.7))]">
              <span
                className="absolute inset-0 bg-lime"
                style={{
                  WebkitMaskImage: `url(${IMG}bac-symbole.png)`,
                  maskImage: `url(${IMG}bac-symbole.png)`,
                  WebkitMaskSize: "100% 100%",
                  maskSize: "100% 100%"
                }}
              />
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-3 h-5 w-3/4 rounded-[50%] bg-black/50 blur-lg" />
    </div>
  );
}
