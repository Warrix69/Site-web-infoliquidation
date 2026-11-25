/**
 * Remplace next/image par une simple <img> (les images sont déjà optimisées en .webp).
 * Si l'image a des variantes de largeur générées au build (manifeste __IMG_VARIANTS__,
 * voir php/build.mjs) et que le composant donne `sizes`, on produit un srcSet comme
 * next/image. Sinon : l'original seul, comme avant.
 */
import type { CSSProperties, ImgHTMLAttributes } from "react";

/** [largeur, hauteur, empreinte, largeurs des variantes] — injecté par esbuild (define). */
declare const __IMG_VARIANTS__: Record<string, [number, number, string, number[]]>;

type Src = string | { src: string; width?: number; height?: number };
type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: Src;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
};

function srcSetFor(url: string): string | undefined {
  const v = __IMG_VARIANTS__[url];
  if (!v) return undefined;
  const [w, , hash, widths] = v;
  const base = "/images/_w/" + url.slice(8).replace(/\.[a-z]+$/i, "");
  return [...widths.map((x) => `${base}-${x}-${hash}.webp ${x}w`), `${url} ${w}w`].join(", ");
}

export default function Image({ src, fill, priority, quality, placeholder, blurDataURL, unoptimized, style, loading, ...rest }: Props) {
  void quality; void placeholder; void blurDataURL; void unoptimized;
  const url = typeof src === "string" ? src : src.src;
  const srcSet = rest.sizes && !rest.srcSet ? srcSetFor(url) : undefined;
  const fillStyle: CSSProperties = fill
    ? { position: "absolute", height: "100%", width: "100%", inset: 0, color: "transparent" }
    : { color: "transparent" };
  return (
    <img
      {...rest}
      srcSet={srcSet ?? rest.srcSet}
      src={url}
      decoding="async"
      loading={priority ? "eager" : (loading ?? "lazy")}
      fetchPriority={priority ? "high" : undefined}
      style={{ ...fillStyle, ...style }}
    />
  );
}
