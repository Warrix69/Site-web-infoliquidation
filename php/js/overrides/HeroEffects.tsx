"use client";

import { useEffect, useRef } from "react";
import { EffectComposer, Bloom, N8AO, SMAA } from "@react-three/postprocessing";

/**
 * Post-traitement studio de la scène 3D du héros (mode « high », ordinateurs seulement).
 * Fichier à part (version PHP) : chargé par lazy() seulement en mode high, pour que le
 * mobile ne télécharge jamais postprocessing / N8AO. Mêmes réglages que HeroDevices.tsx de src/.
 * onMounted : appelé une fois le composer en place (il dessine dès l'image suivante).
 */
export function HeroEffects({ onMounted }: { onMounted?: () => void }) {
  const cb = useRef(onMounted);
  cb.current = onMounted;
  useEffect(() => {
    cb.current?.();
  }, []);
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <N8AO aoRadius={0.35} intensity={2.2} color="#000000" distanceFalloff={1.0} quality="medium" />
      <Bloom intensity={0.18} luminanceThreshold={0.9} luminanceSmoothing={0.4} mipmapBlur radius={0.4} />
      <SMAA />
    </EffectComposer>
  );
}
