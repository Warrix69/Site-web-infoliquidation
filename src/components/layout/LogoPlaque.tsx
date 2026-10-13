import Image from "next/image";

type LogoPlaqueProps = {
  className?: string;
  /** Largeur du logo en px (hauteur calculée, ratio 338×80) */
  width?: number;
  priority?: boolean;
};

/**
 * Logo officiel d'Info Liquidation Recycle sur une pastille claire arrondie,
 * pour rester lisible sur le fond sombre. Ne jamais substituer ce logo.
 */
export function LogoPlaque({ className, width = 170, priority = false }: LogoPlaqueProps) {
  const height = Math.round((width * 80) / 338);
  return (
    <span className={`inline-flex items-center ${className ?? ""}`}>
      <Image
        src="/logo.png"
        alt="Info Liquidation Recycle"
        width={width}
        height={height}
        priority={priority}
        className="h-auto w-auto"
        style={{ maxWidth: width }}
      />
    </span>
  );
}
