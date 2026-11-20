/**
 * Îlots React : les sections interactives du site Next.js, montées dans les
 * pages PHP. Chaque îlot est chargé seulement s'il est présent sur la page.
 *   <div data-island="Hero"><script type="application/json" data-props>{…}</script>…</div>
 */
import { createElement, type ComponentType } from "react";
import { createRoot } from "react-dom/client";

type Loader = () => Promise<ComponentType<Record<string, unknown>>>;
const c = <T,>(p: Promise<T>, name: keyof T) => p.then((m) => m[name] as unknown as ComponentType<Record<string, unknown>>);

const ISLANDS: Record<string, Loader> = {
  Hero: () => c(import("@/components/home/Hero"), "Hero"),
  StepsTimeline: () => c(import("@/components/home/StepsTimeline"), "StepsTimeline"),
  BinSection: () => c(import("@/components/home/BinSection"), "BinSection"),
  DataDestruction: () => c(import("@/components/home/DataDestruction"), "DataDestruction"),
  ClosingBin: () => c(import("@/components/home/ClosingBin"), "ClosingBin"),
  PickupForm: () => c(import("@/components/forms/PickupForm"), "PickupForm"),
  ContactForm: () => c(import("@/components/forms/ContactForm"), "ContactForm")
};

for (const el of Array.from(document.querySelectorAll<HTMLElement>("[data-island]"))) {
  const name = el.dataset.island!;
  const load = ISLANDS[name];
  if (!load) {
    console.warn(`Îlot inconnu : ${name}`);
    continue;
  }
  const raw = el.querySelector(":scope > script[data-props]")?.textContent ?? "{}";
  const props = JSON.parse(raw);
  load().then((Comp) => {
    // L'îlot remplace le contenu de secours rendu par PHP
    const root = createRoot(el);
    root.render(createElement(Comp, props));
    // display: contents pour ne pas changer la mise en page
    el.style.display = "contents";
  });
}
