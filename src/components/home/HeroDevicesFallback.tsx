"use client";

import Image from "next/image";

/**
 * Version allégée du hero (appareil faible, connexion lente, WebGL absent ou 3D en échec) :
 * le portable en studio, qui flotte doucement.
 */
export function HeroDevicesFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="relative w-[min(78%,520px)]">
        <span
          aria-hidden="true"
          className="absolute -bottom-6 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-[50%] bg-black/30 blur-lg"
        />
        <div className="animate-float">
          <Image
            src="/images/bac/portable.webp"
            alt=""
            width={560}
            height={253}
            sizes="(max-width: 1024px) 80vw, 40vw"
            priority
            className="h-auto w-full drop-shadow-[0_24px_28px_rgba(0,0,0,0.35)]"
          />
        </div>
      </div>
    </div>
  );
}
