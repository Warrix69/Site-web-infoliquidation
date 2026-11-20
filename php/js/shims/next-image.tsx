/** Remplace next/image par une simple <img> (les images sont déjà optimisées en .webp). */
import type { CSSProperties, ImgHTMLAttributes } from "react";

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

export default function Image({ src, fill, priority, quality, placeholder, blurDataURL, unoptimized, style, loading, ...rest }: Props) {
  void quality; void placeholder; void blurDataURL; void unoptimized;
  const url = typeof src === "string" ? src : src.src;
  const fillStyle: CSSProperties = fill
    ? { position: "absolute", height: "100%", width: "100%", inset: 0, color: "transparent" }
    : { color: "transparent" };
  return (
    <img
      {...rest}
      src={url}
      decoding="async"
      loading={priority ? "eager" : (loading ?? "lazy")}
      fetchPriority={priority ? "high" : undefined}
      style={{ ...fillStyle, ...style }}
    />
  );
}
