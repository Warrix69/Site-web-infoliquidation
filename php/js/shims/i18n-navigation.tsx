/**
 * Remplace @/i18n/navigation (next-intl) dans les îlots : liens <a> classiques
 * vers les chemins traduits. La langue vient de <html lang>.
 */
import { forwardRef, type AnchorHTMLAttributes } from "react";
import { routing } from "@/i18n/routing";

type Locale = "fr" | "en";
type Href = string | { pathname: string; params?: Record<string, string>; query?: Record<string, string>; hash?: string };

const currentLocale = (): Locale => (document.documentElement.lang === "en" ? "en" : "fr");

export function getPathname({ href, locale }: { href: Href; locale?: Locale }): string {
  const loc = locale ?? currentLocale();
  const obj = typeof href === "string" ? { pathname: href } : href;
  let [pathname, hash] = obj.pathname.split("#");
  const entry = (routing.pathnames as Record<string, string | Record<string, string>>)[pathname];
  let p = entry === undefined ? pathname : typeof entry === "string" ? entry : entry[loc];
  for (const [k, v] of Object.entries(obj.params ?? {})) p = p.replace(`[${k}]`, encodeURIComponent(v));
  if (loc !== routing.defaultLocale) p = `/${loc}${p === "/" ? "" : p}`;
  if (obj.query) p += "?" + new URLSearchParams(obj.query).toString();
  hash = obj.hash ?? hash;
  if (hash) p += "#" + hash.replace(/^#/, "");
  return p;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: Href;
  locale?: Locale;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, locale, prefetch, scroll, replace, ...rest },
  ref
) {
  void prefetch; void scroll; void replace;
  return <a ref={ref} href={getPathname({ href, locale })} {...rest} />;
});

/** Route interne courante (ex. « /a-propos »), fournie par PHP dans <html data-route>. */
export function usePathname(): string {
  return document.documentElement.dataset.route ?? "/";
}

export function useRouter() {
  return {
    push: (href: Href, opts?: { locale?: Locale }) => {
      window.location.href = getPathname({ href, locale: opts?.locale });
    },
    replace: (href: Href, opts?: { locale?: Locale }) => {
      window.location.replace(getPathname({ href, locale: opts?.locale }));
    },
    back: () => history.back(),
    refresh: () => location.reload(),
    prefetch: () => {}
  };
}

export function redirect(href: Href) {
  window.location.href = getPathname({ href });
}
