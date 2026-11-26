/**
 * Comportements communs à toutes les pages PHP (remplace les petits
 * composants client React) : en-tête, bannière de témoins, défilement lissé,
 * révélation au scroll, compteurs, effets magnétiques/tilt, accordéon,
 * ruban défilant, titres mot par mot, carte en perspective.
 */
import Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T & Element>(sel)) as unknown as T[];

/* ---------------- Défilement lissé (Lenis) ---------------- */
function smoothScroll() {
  if (!finePointer || reduce) return;
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1
  });
  window.__lenis = lenis;
  const raf = (time: number) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

/* ---------------- En-tête ---------------- */
function header() {
  const root = document.querySelector<HTMLElement>("[data-header]");
  if (!root) return;
  // La barre du haut (téléphone, message, FR/EN) reste toujours visible
  const bar = root.querySelector<HTMLElement>("[data-headbar]")!;
  const onScroll = () => {
    const scrolled = window.scrollY > 24;
    bar.classList.toggle("shadow-[0_8px_24px_-16px_rgba(10,10,10,0.35)]", scrolled);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Menu Services (survol + clic)
  const wrap = root.querySelector<HTMLElement>("[data-services]");
  if (wrap) {
    const btn = wrap.querySelector<HTMLButtonElement>("[data-services-btn]")!;
    const panel = wrap.querySelector<HTMLElement>("[data-services-panel]")!;
    const chevron = btn.querySelector("svg");
    let timer: number | undefined;
    const set = (open: boolean) => {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.classList.toggle("text-emerald", open);
      chevron?.classList.toggle("rotate-180", open);
    };
    wrap.addEventListener("mouseenter", () => {
      clearTimeout(timer);
      set(true);
    });
    wrap.addEventListener("mouseleave", () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => set(false), 150);
    });
    btn.addEventListener("click", () => set(panel.hidden));
    document.addEventListener("keydown", (e) => e.key === "Escape" && set(false));
  }

  // Menu mobile
  const menuBtn = root.querySelector<HTMLButtonElement>("[data-menu-btn]");
  const menu = root.querySelector<HTMLElement>("[data-mobile-menu]");
  if (menuBtn && menu) {
    const iOpen = menuBtn.querySelector<HTMLElement>("[data-icon-open]")!;
    const iClose = menuBtn.querySelector<HTMLElement>("[data-icon-close]")!;
    const set = (open: boolean) => {
      menu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", (open ? menuBtn.dataset.labelClose : menuBtn.dataset.labelOpen) ?? "");
      iOpen.hidden = open;
      iClose.hidden = !open;
      document.body.style.overflow = open ? "hidden" : "";
      if (open) window.__lenis?.stop();
      else window.__lenis?.start();
    };
    menuBtn.addEventListener("click", () => set(menu.hidden));
    menu.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("a")) set(false);
    });
  }
}

/* ---------------- Bannière de témoins (Loi 25) ---------------- */
function cookieBanner() {
  const el = document.querySelector<HTMLElement>("[data-cookie-banner]");
  if (!el) return;
  const KEY = "ilr-cookie-consent-v1";
  try {
    if (!localStorage.getItem(KEY)) el.hidden = false;
  } catch {
    return;
  }
  el.querySelector("[data-cookie-accept]")?.addEventListener("click", () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    el.classList.add("is-leaving");
    setTimeout(() => (el.hidden = true), reduce ? 0 : 250);
  });
}

/* ---------------- Révélation au scroll ---------------- */
function reveals() {
  const els = $$<HTMLElement>("[data-reveal]:not(.is-visible)");
  if (!els.length) return;
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.05 }
  );
  els.forEach((el) => io.observe(el));
  // Filet de sécurité : jamais de contenu invisible
  setTimeout(() => {
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-visible");
    });
  }, 1500);
}

/* ---------------- Compteurs ---------------- */
function counters() {
  const els = $$<HTMLElement>("[data-counter]");
  if (!els.length) return;
  const ease = (t: number) => 1 - Math.pow(1 - t, 4);
  const run = (el: HTMLElement) => {
    const value = Number(el.dataset.counter);
    const plain = el.hasAttribute("data-plain");
    const loc = el.dataset.locale || "fr-CA";
    const fmt = (v: number) => (plain ? String(Math.round(v)) : Math.round(v).toLocaleString(loc));
    if (reduce) return void (el.textContent = fmt(value));
    const start = performance.now();
    const dur = 1600;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = fmt(value * ease(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          run(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "-40px" }
  );
  els.forEach((el) => io.observe(el));
}

/* ---------------- Magnétique ---------------- */
function magnetic() {
  if (!finePointer || reduce) return;
  $$<HTMLElement>("[data-magnetic]").forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.25;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = "translate3d(0, 0, 0)"));
  });
}

/* ---------------- Carte inclinable ---------------- */
function tilt() {
  if (reduce) return;
  $$<HTMLElement>("[data-tilt]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
      el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 6}deg) translateZ(0)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    });
  });
}

/* ---------------- Accordéon (FAQ) ---------------- */
function accordions() {
  $$<HTMLElement>("[data-accordion]").forEach((root) => {
    const items = $$<HTMLElement>("[data-acc-item]", root);
    const set = (item: HTMLElement, open: boolean) => {
      const btn = item.querySelector<HTMLButtonElement>("[data-acc-btn]")!;
      const panel = item.querySelector<HTMLElement>("[data-acc-panel]")!;
      const badge = item.querySelector<HTMLElement>("[data-acc-badge]")!;
      btn.setAttribute("aria-expanded", String(open));
      item.classList.toggle("border-emerald/40", open);
      item.classList.toggle("hover:border-emerald/30", !open);
      badge.style.transform = `rotate(${open ? 180 : 0}deg)`;
      badge.classList.toggle("bg-gradient-accent", open);
      badge.classList.toggle("text-ink", open);
      badge.classList.toggle("bg-emerald-soft", !open);
      badge.classList.toggle("text-emerald", !open);
      if (reduce) {
        panel.hidden = !open;
        return;
      }
      if (open) {
        panel.hidden = false;
        const h = panel.scrollHeight;
        panel.animate(
          [
            { height: "0px", opacity: 0 },
            { height: `${h}px`, opacity: 1 }
          ],
          { duration: 350, easing: "cubic-bezier(0.21,0.47,0.32,0.98)" }
        );
      } else if (!panel.hidden) {
        const h = panel.scrollHeight;
        panel
          .animate(
            [
              { height: `${h}px`, opacity: 1 },
              { height: "0px", opacity: 0 }
            ],
            { duration: 350, easing: "cubic-bezier(0.21,0.47,0.32,0.98)" }
          )
          .finished.then(() => {
            if (item.querySelector("[data-acc-btn]")!.getAttribute("aria-expanded") === "false") panel.hidden = true;
          });
      }
    };
    items.forEach((item) => {
      item.querySelector("[data-acc-btn]")!.addEventListener("click", () => {
        const isOpen = item.querySelector("[data-acc-btn]")!.getAttribute("aria-expanded") === "true";
        items.forEach((other) => {
          if (other !== item && other.querySelector("[data-acc-btn]")!.getAttribute("aria-expanded") === "true") set(other, false);
        });
        set(item, !isOpen);
      });
    });
  });
}

/* ---------------- Ruban défilant ---------------- */
function marquees() {
  $$<HTMLElement>("[data-marquee]").forEach((root) => {
    const track = root.querySelector<HTMLElement>("[data-marquee-track]")!;
    const half = root.querySelector<HTMLElement>("[data-marquee-half]")!;
    const clone = root.querySelector<HTMLElement>("[data-marquee-clone]");
    if (reduce) {
      root.classList.remove("overflow-hidden");
      root.classList.add("overflow-x-auto");
      clone?.remove();
      return;
    }
    const BASE = 38;
    // Largeur de la moitié mise en cache (lue une fois, puis à chaque changement de taille)
    // au lieu d'une lecture de mise en page à chaque image.
    const cached = "ResizeObserver" in window;
    let halfWidth = half.offsetWidth;
    if (cached) new ResizeObserver(() => (halfWidth = half.offsetWidth)).observe(half);
    let x = 0, dir = -1, boost = 0, lastY = window.scrollY, lastT = performance.now(), raf = 0, visible = false, hover = false;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      const width = (cached ? halfWidth : half.offsetWidth) + 16;
      boost *= 0.92;
      x += dir * (hover ? 0 : BASE + boost) * dt;
      if (width > 0) {
        if (x <= -width) x += width;
        if (x > 0) x -= width;
      }
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) {
        lastT = performance.now();
        raf = requestAnimationFrame(loop);
      }
    }).observe(root);
    const enter = () => (hover = true);
    const leave = () => (hover = false);
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    root.addEventListener("focusin", enter);
    root.addEventListener("focusout", leave);
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY;
        const dy = y - lastY;
        lastY = y;
        if (Math.abs(dy) > 0.5) dir = dy > 0 ? -1 : 1;
        boost = Math.min(900, boost + Math.abs(dy) * 6);
      },
      { passive: true }
    );
  });
}

/* ---------------- Carte en perspective liée au scroll ---------------- */
function containerScroll() {
  $$<HTMLElement>("[data-container-scroll]").forEach((root) => {
    const head = root.querySelector<HTMLElement>("[data-cs-header]")!;
    const card = root.querySelector<HTMLElement>("[data-cs-card]")!;
    if (reduce) return;
    const update = () => {
      const r = root.getBoundingClientRect();
      // Même calcul que useScroll({ target }) : 0 quand le haut entre en bas d'écran… 1 quand le bas sort en haut
      const total = r.height + window.innerHeight;
      const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / total));
      const mobile = window.innerWidth <= 768;
      const [s0, s1] = mobile ? [0.7, 0.9] : [1.05, 1];
      const rot = 20 - 20 * p;
      const scale = s0 + (s1 - s0) * p;
      const ty = -100 * p;
      head.style.transform = `translateY(${ty}px)`;
      card.style.transform = `rotateX(${rot}deg) scale(${scale})`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  });
}

function init() {
  smoothScroll();
  header();
  cookieBanner();
  reveals();
  counters();
  magnetic();
  tilt();
  accordions();
  marquees();
  containerScroll();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

// Les îlots React montés plus tard peuvent redemander une passe
(window as unknown as { __siteRefresh?: () => void }).__siteRefresh = () => {
  reveals();
  counters();
  magnetic();
  tilt();
};
