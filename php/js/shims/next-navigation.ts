/** Remplace next/navigation dans les îlots. */
export { usePathname, useRouter } from "./i18n-navigation";
export function useParams(): Record<string, string> {
  try {
    return JSON.parse(document.documentElement.dataset.params ?? "{}");
  } catch {
    return {};
  }
}
export function useSearchParams() {
  return new URLSearchParams(window.location.search);
}
export function notFound(): never {
  throw new Error("notFound");
}
