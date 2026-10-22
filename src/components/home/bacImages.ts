/** Images du bac (public/images/bac/) et leurs dimensions d'origine, pour next/image. */
export const BAC_DIR = "/images/bac/";

export const BAC_DIMS = {
  bac: [900, 1150],
  "bac-avant": [900, 1150],
  "disque-dur": [560, 252],
  telephone: [560, 216],
  portable: [560, 253],
  routeur: [560, 286],
  souris: [560, 308],
  clavier: [560, 180],
  ecran: [560, 505]
} as const;

export type BacImage = keyof typeof BAC_DIMS;
