"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, RoundedBox } from "@react-three/drei";
import { EffectComposer, Bloom, N8AO, SMAA } from "@react-three/postprocessing";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type DeviceKey = "laptop" | "phone" | "tower" | "switch" | "monitor";

/**
 * Carrousel 3D haute qualité, piloté par le scroll.
 * Post-processing : N8AO (ambient occlusion), Bloom (émissifs), SMAA.
 * Matériaux PBR physiques, bords arrondis partout, HDRI studio.
 */
export function HeroDevices({ onDeviceChange }: { onDeviceChange?: (d: DeviceKey) => void }) {
  return (
    <Canvas
      camera={{ position: [0, 1.1, 4.6], fov: 34 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
      className="pointer-events-none"
    >
      {/* Éclairage réaliste à 3 points */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 7, 4]} intensity={2.4} />
      {/* Fill light vert doux (ambiance éco) */}
      <directionalLight position={[-6, 2, 2]} intensity={0.5} color="#bbf7d0" />
      {/* Rim light pour détacher du fond */}
      <directionalLight position={[0, 1, -5]} intensity={0.7} color="#ffffff" />

      <Environment preset="warehouse" environmentIntensity={0.35} />

      <DeviceCarousel onDeviceChange={onDeviceChange} />

      {/* Post-processing : SSAO + Bloom pour un rendu "studio" */}
      <EffectComposer multisampling={0} enableNormalPass>
        <N8AO
          aoRadius={0.35}
          intensity={2.2}
          color="#000000"
          distanceFalloff={1.0}
          quality="medium"
        />
        <Bloom
          intensity={0.18}
          luminanceThreshold={0.9}
          luminanceSmoothing={0.4}
          mipmapBlur
          radius={0.4}
        />
        <SMAA />
      </EffectComposer>
    </Canvas>
  );
}

const DEVICES: DeviceKey[] = ["laptop", "phone", "tower", "switch", "monitor"];

function DeviceCarousel({ onDeviceChange }: { onDeviceChange?: (d: DeviceKey) => void }) {
  const scrollRef = useRef(0);
  const reduce = useReducedMotion();
  const lastDevice = useRef<DeviceKey>("laptop");

  useEffect(() => {
    const update = () => {
      const section =
        (document.querySelector("[data-hero-3d]") as HTMLElement | null) ||
        document.querySelector("section");
      if (!section) return;
      const rect = section.getBoundingClientRect();
      // Progress basé sur le passage de la section dans le viewport :
      // 0 = section tout en bas, 1 = section tout en haut (hors du viewport).
      // Marche même quand la section fait exactement 1 viewport.
      const total = rect.height + window.innerHeight;
      const traveled = window.innerHeight - rect.top;
      const p = Math.min(1, Math.max(0, traveled / total));
      scrollRef.current = p;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const refs = useRef<Record<DeviceKey, THREE.Group | null>>({
    laptop: null,
    phone: null,
    tower: null,
    switch: null,
    monitor: null
  });

  useFrame((state) => {
    const rawP = reduce ? 0 : scrollRef.current;
    // Le laptop reste visible un peu plus longtemps : les 28% premiers du scroll,
    // puis les 4 autres appareils se partagent les 72% restants.
    const LAPTOP_HOLD = 0.28;
    const p =
      rawP < LAPTOP_HOLD ? 0 : (rawP - LAPTOP_HOLD) / (1 - LAPTOP_HOLD);
    const stepSize = 1 / DEVICES.length;
    const idxFloat = p / stepSize;
    const currentIdx = Math.min(DEVICES.length - 1, Math.floor(idxFloat));
    const localProgress = idxFloat - currentIdx;

    const currentDevice = DEVICES[currentIdx];
    if (currentDevice !== lastDevice.current) {
      lastDevice.current = currentDevice;
      onDeviceChange?.(currentDevice);
    }

    const t = state.clock.getElapsedTime();

    DEVICES.forEach((key, i) => {
      const group = refs.current[key];
      if (!group) return;
      const distance = i - idxFloat;
      const abs = Math.abs(distance);
      const visible = abs < 1;
      const opacity = visible ? Math.max(0, 1 - abs) : 0;
      const scale = 0.5 + 0.5 * opacity;
      const posY = -distance * 1.1;

      group.position.y = posY;
      group.scale.setScalar(scale);
      group.visible = opacity > 0.01;

      // L'appareil fait face à la caméra quand il est centré (distance = 0).
      // En entrée (distance négative), il arrive tourné vers la gauche ;
      // en sortie (distance positive), il part tourné vers la droite.
      group.rotation.y = distance * Math.PI * 0.55 + (reduce ? 0 : Math.sin(t * 0.3) * 0.06);

      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const mat = m as THREE.Material & { opacity?: number; transparent?: boolean };
            mat.transparent = true;
            mat.opacity = opacity;
          });
        }
      });
    });
  });

  return (
    <>
      <group ref={(r) => void (refs.current.laptop = r)}>
        <Laptop />
      </group>
      <group ref={(r) => void (refs.current.phone = r)}>
        <Phone />
      </group>
      <group ref={(r) => void (refs.current.tower = r)}>
        <TowerPC />
      </group>
      <group ref={(r) => void (refs.current.switch = r)}>
        <NetworkSwitch />
      </group>
      <group ref={(r) => void (refs.current.monitor = r)}>
        <Monitor />
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Matériaux partagés (PBR physiques)                                  */
/* ------------------------------------------------------------------ */

function useBrushedAluminum() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#cfd3d7",
        metalness: 0.6,
        roughness: 0.55,
        clearcoat: 0.25,
        clearcoatRoughness: 0.5,
        envMapIntensity: 0.5
      }),
    []
  );
}

function useGlossyBlack() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#0f1114",
        metalness: 0.3,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.3
      }),
    []
  );
}

function useMattePlastic(color: string) {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0,
        roughness: 0.75,
        clearcoat: 0.15,
        clearcoatRoughness: 0.4,
        envMapIntensity: 0.9
      }),
    [color]
  );
}

function useGlassScreen() {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        metalness: 0.0,
        roughness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        transparent: true,
        opacity: 0.12,
        envMapIntensity: 0.6
      }),
    []
  );
}

/* ------------------------------------------------------------------ */
/* 1. Portable                                                         */
/* ------------------------------------------------------------------ */

function Laptop() {
  const body = useBrushedAluminum();
  const key = useMattePlastic("#15171a");
  const screenTex = useMemo(() => buildScreenTexture(), []);

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={0.2}>
      <group>
        {/* Base aluminium brossé, bords arrondis */}
        <RoundedBox
          args={[2.3, 0.09, 1.55]}
          radius={0.025}
          smoothness={5}
          position={[0, -0.08, 0]}
          castShadow
          receiveShadow
          material={body}
        />
        {/* Trackpad en verre */}
        <RoundedBox
          args={[0.85, 0.006, 0.55]}
          radius={0.01}
          smoothness={3}
          position={[0, -0.032, 0.5]}
        >
          <meshPhysicalMaterial
            color="#aeb2b6"
            metalness={0.6}
            roughness={0.18}
            clearcoat={0.8}
            clearcoatRoughness={0.1}
          />
        </RoundedBox>
        {/* Clavier : touches avec léger bevel */}
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 13 }, (_, c) => (
            <RoundedBox
              key={`k-${r}-${c}`}
              args={[0.125, 0.008, 0.105]}
              radius={0.012}
              smoothness={2}
              position={[(c - 6) * 0.14, -0.032, (r - 1.5) * 0.12 - 0.2]}
              material={key}
              castShadow
            />
          ))
        )}
        {/* Charnière + capot — 120° d'ouverture (30° au-delà de la verticale).
            La convention locale place le capot déjà debout à rotation=0 (90° ouvert),
            donc -π/6 = 120°. */}
        <group position={[0, -0.03, -0.76]} rotation={[-Math.PI / 6, 0, 0]}>
          {/* Capot (face arrière, derrière le bezel) */}
          <RoundedBox
            args={[2.3, 1.4, 0.05]}
            radius={0.025}
            smoothness={5}
            position={[0, 0.7, -0.02]}
            material={body}
            castShadow
          />
          {/* Bezel écran noir */}
          <RoundedBox
            args={[2.22, 1.32, 0.02]}
            radius={0.02}
            smoothness={3}
            position={[0, 0.7, 0.005]}
          >
            <meshStandardMaterial color="#09090b" metalness={0.1} roughness={0.6} />
          </RoundedBox>
          {/* Écran avec le logo Info Liquidation Recycle */}
          <mesh position={[0, 0.7, 0.018]}>
            <planeGeometry args={[2.1, 1.2]} />
            <meshBasicMaterial
              map={screenTex}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Caméra */}
          <mesh position={[0, 1.37, 0.016]}>
            <circleGeometry args={[0.015, 20]} />
            <meshStandardMaterial color="#000" metalness={0.3} />
          </mesh>
        </group>
      </group>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Téléphone                                                        */
/* ------------------------------------------------------------------ */

function Phone() {
  const body = useGlossyBlack();
  const matteFrame = useMattePlastic("#1a1d20");
  const phoneScreenTex = useMemo(() => buildPhoneScreenTexture(), []);

  return (
    <Float speed={1.1} rotationIntensity={0} floatIntensity={0.3}>
      <group>
        {/* Cadre latéral mat */}
        <RoundedBox args={[0.9, 1.8, 0.11]} radius={0.08} smoothness={5} material={matteFrame} castShadow />
        {/* Dalle noire (fond de l'écran) */}
        <RoundedBox
          args={[0.84, 1.74, 0.005]}
          radius={0.06}
          smoothness={5}
          position={[0, 0, 0.058]}
        >
          <meshStandardMaterial color="#050607" roughness={0.5} />
        </RoundedBox>
        {/* Texture de l'écran : logo InfoLiquidationRecycle */}
        <mesh position={[0, 0, 0.0615]}>
          <planeGeometry args={[0.82, 1.72]} />
          <meshBasicMaterial map={phoneScreenTex} toneMapped={false} />
        </mesh>
        {/* Dynamic island / encoche */}
        <RoundedBox
          args={[0.26, 0.08, 0.004]}
          radius={0.04}
          smoothness={4}
          position={[0, 0.76, 0.062]}
        >
          <meshStandardMaterial color="#000" />
        </RoundedBox>
        {/* Module caméra arrière (bosse) */}
        <RoundedBox
          args={[0.42, 0.44, 0.03]}
          radius={0.05}
          smoothness={5}
          position={[-0.22, 0.6, -0.064]}
          material={matteFrame}
        />
        <mesh position={[-0.33, 0.7, -0.08]}>
          <cylinderGeometry args={[0.075, 0.075, 0.025, 24]} />
          <meshPhysicalMaterial color="#000" metalness={0.9} roughness={0.08} clearcoat={1} />
        </mesh>
        <mesh position={[-0.11, 0.7, -0.08]}>
          <cylinderGeometry args={[0.075, 0.075, 0.025, 24]} />
          <meshPhysicalMaterial color="#000" metalness={0.9} roughness={0.08} clearcoat={1} />
        </mesh>
        <mesh position={[-0.33, 0.48, -0.08]}>
          <cylinderGeometry args={[0.075, 0.075, 0.025, 24]} />
          <meshPhysicalMaterial color="#000" metalness={0.9} roughness={0.08} clearcoat={1} />
        </mesh>
        {/* LED flash */}
        <mesh position={[-0.11, 0.48, -0.072]}>
          <circleGeometry args={[0.03, 16]} />
          <meshStandardMaterial color="#fef9c3" emissive="#fef08a" emissiveIntensity={0.6} />
        </mesh>
        {/* Boutons */}
        <RoundedBox args={[0.015, 0.18, 0.04]} radius={0.005} smoothness={2} position={[0.45, 0.3, 0]}>
          <meshStandardMaterial color="#2d3135" metalness={0.6} roughness={0.3} />
        </RoundedBox>
        <RoundedBox args={[0.015, 0.1, 0.04]} radius={0.005} smoothness={2} position={[0.45, 0.05, 0]}>
          <meshStandardMaterial color="#2d3135" metalness={0.6} roughness={0.3} />
        </RoundedBox>
      </group>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Tour PC                                                          */
/* ------------------------------------------------------------------ */

function TowerPC() {
  // Matériau dédié à la tour : encore moins brillant (clearcoat et metalness bas)
  const body = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#17191c",
        metalness: 0.05,
        roughness: 0.95,
        envMapIntensity: 0.2
      }),
    []
  );
  const panelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1f2226",
        metalness: 0.05,
        roughness: 0.95,
        envMapIntensity: 0.15
      }),
    []
  );

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={0.2}>
      <group>
        {/* Tour un peu plus compacte (hauteur réduite de 1.85 → 1.4) */}
        <RoundedBox args={[0.95, 1.4, 1.35]} radius={0.025} smoothness={5} material={body} castShadow />
        {/* Panneau avant texturé */}
        <RoundedBox
          args={[0.92, 1.38, 0.02]}
          radius={0.015}
          smoothness={3}
          position={[0, 0, 0.675]}
          material={panelMat}
        />
        {/* Grille d'aération */}
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i} position={[0, 0.42 - i * 0.07, 0.69]}>
            <boxGeometry args={[0.55, 0.012, 0.003]} />
            <meshStandardMaterial color="#09090b" roughness={0.9} />
          </mesh>
        ))}
        {/* Logo plaque alu brossé */}
        <RoundedBox args={[0.25, 0.08, 0.004]} radius={0.008} smoothness={3} position={[0, 0.3, 0.692]}>
          <meshPhysicalMaterial color="#9ca3af" metalness={0.95} roughness={0.25} />
        </RoundedBox>
        {/* Lecteur optique */}
        <RoundedBox
          args={[0.65, 0.07, 0.006]}
          radius={0.004}
          smoothness={3}
          position={[0, 0.56, 0.691]}
        >
          <meshStandardMaterial color="#09090b" roughness={0.85} />
        </RoundedBox>
        {/* Bouton power + LED verte */}
        <mesh position={[0.3, 0.66, 0.691]}>
          <cylinderGeometry args={[0.028, 0.028, 0.008, 20]} />
          <meshPhysicalMaterial color="#52525b" metalness={0.9} roughness={0.2} clearcoat={1} />
        </mesh>
        <mesh position={[0.38, 0.66, 0.691]}>
          <cylinderGeometry args={[0.014, 0.014, 0.008, 16]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} />
        </mesh>
        {/* Ports USB (3) */}
        {Array.from({ length: 3 }, (_, i) => (
          <RoundedBox
            key={i}
            args={[0.09, 0.028, 0.006]}
            radius={0.004}
            smoothness={2}
            position={[-0.3 + i * 0.1, 0.62, 0.691]}
          >
            <meshStandardMaterial color="#09090b" />
          </RoundedBox>
        ))}
      </group>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Switch réseau                                                    */
/* ------------------------------------------------------------------ */

function NetworkSwitch() {
  const body = useMattePlastic("#232529");

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={0.2}>
      <group>
        <RoundedBox args={[2.4, 0.3, 1.0]} radius={0.015} smoothness={3} material={body} castShadow />
        {/* Oreilles de rack latérales */}
        <RoundedBox args={[0.08, 0.3, 1.0]} radius={0.01} smoothness={2} position={[1.25, 0, 0]} material={body} />
        <RoundedBox args={[0.08, 0.3, 1.0]} radius={0.01} smoothness={2} position={[-1.25, 0, 0]} material={body} />
        {/* Ports RJ45 : 2 rangées de 12 */}
        {Array.from({ length: 2 }, (_, row) =>
          Array.from({ length: 12 }, (_, col) => (
            <RoundedBox
              key={`p-${row}-${col}`}
              args={[0.12, 0.06, 0.015]}
              radius={0.006}
              smoothness={2}
              position={[(col - 5.5) * 0.14, 0.05 - row * 0.082, 0.505]}
            >
              <meshStandardMaterial color="#060608" roughness={0.9} />
            </RoundedBox>
          ))
        )}
        {/* LEDs vertes bloom-éligibles */}
        {[0, 3, 5, 7, 10, 14, 18, 22, 1, 9].map((i) => {
          const row = Math.floor(i / 12);
          const col = i % 12;
          return (
            <mesh
              key={`led-${i}`}
              position={[(col - 5.5) * 0.14 - 0.038, 0.065 - row * 0.082, 0.515]}
            >
              <sphereGeometry args={[0.008, 12, 12]} />
              <meshStandardMaterial
                color="#22c55e"
                emissive="#22c55e"
                emissiveIntensity={3}
              />
            </mesh>
          );
        })}
        {/* Plaque de marque à droite (alu brossé) */}
        <RoundedBox args={[0.32, 0.2, 0.005]} radius={0.01} smoothness={3} position={[0.95, 0, 0.505]}>
          <meshPhysicalMaterial color="#9ca3af" metalness={0.95} roughness={0.3} />
        </RoundedBox>
      </group>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Écran                                                            */
/* ------------------------------------------------------------------ */

function Monitor() {
  const body = useMattePlastic("#1a1c20");
  const screenTex = useMemo(() => buildScreenTexture(), []);

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={0.2}>
      <group>
        {/* Dalle (épaisseur réaliste très fine) */}
        <RoundedBox
          args={[2.7, 1.55, 0.08]}
          radius={0.025}
          smoothness={4}
          position={[0, 0.4, 0]}
          material={body}
          castShadow
        />
        {/* Bezel noir intérieur */}
        <RoundedBox
          args={[2.58, 1.43, 0.015]}
          radius={0.015}
          smoothness={3}
          position={[0, 0.4, 0.041]}
        >
          <meshStandardMaterial color="#09090b" roughness={0.6} />
        </RoundedBox>
        {/* Écran avec le logo */}
        <mesh position={[0, 0.4, 0.051]}>
          <planeGeometry args={[2.52, 1.37]} />
          <meshBasicMaterial map={screenTex} toneMapped={false} />
        </mesh>
        {/* Logo plaque sous l'écran */}
        <RoundedBox args={[0.2, 0.045, 0.005]} radius={0.004} smoothness={2} position={[0, -0.4, 0.046]}>
          <meshPhysicalMaterial color="#9ca3af" metalness={0.9} roughness={0.3} />
        </RoundedBox>
        {/* Pied vertical */}
        <RoundedBox args={[0.14, 0.5, 0.1]} radius={0.015} smoothness={3} position={[0, -0.5, 0]} material={body} />
        {/* Base */}
        <RoundedBox args={[0.85, 0.045, 0.52]} radius={0.015} smoothness={3} position={[0, -0.78, 0]} material={body} castShadow />
      </group>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/* Texture écran homepage                                              */
/* ------------------------------------------------------------------ */

/**
 * Texture d'écran de téléphone (vertical) — logo + mini-UI mobile.
 * Charge /logo.png et le compose sur un fond crème.
 */
function buildPhoneScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 540;
  canvas.height = 1100;
  const ctx = canvas.getContext("2d")!;

  const render = (logo?: HTMLImageElement) => {
    // Fond
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, "#fdfdfc");
    bg.addColorStop(1, "#f3f4f1");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;

    // Status bar (heure + icônes)
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "700 22px Inter, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("9:41", 36, 54);

    ctx.textAlign = "right";
    ctx.fillText("● ● ● ●", canvas.width - 36, 54);

    // Logo centré en haut
    if (logo && logo.width > 0) {
      const targetW = canvas.width * 0.75;
      const scale = targetW / logo.width;
      const w = logo.width * scale;
      const h = logo.height * scale;
      ctx.drawImage(logo, cx - w / 2, 280, w, h);
    } else {
      ctx.fillStyle = "#6b7280";
      ctx.font = "600 28px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Info Liquidation Recycle", cx, 360);
    }

    // Tagline
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "600 24px Inter, Arial, sans-serif";
    ctx.fillStyle = "#52525b";
    ctx.fillText("Recyclage informatique", cx, 580);
    ctx.font = "500 20px Inter, Arial, sans-serif";
    ctx.fillStyle = "#71717a";
    ctx.fillText("Grand Montréal · Depuis 2005", cx, 614);

    // Bouton CTA
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.roundRect(50, 720, canvas.width - 100, 92, 46);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 28px Inter, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Ramassage gratuit →", cx, 766);

    // Secondary link
    ctx.font = "600 20px Inter, Arial, sans-serif";
    ctx.fillStyle = "#52525b";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Découvrir nos services", cx, 870);

    // Home indicator (barre blanche en bas)
    ctx.fillStyle = "#9ca3af";
    ctx.beginPath();
    ctx.roundRect(cx - 70, canvas.height - 24, 140, 6, 3);
    ctx.fill();
  };

  render();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    render(img);
    texture.needsUpdate = true;
  };
  img.src = "/logo.png";

  return texture;
}

/**
 * Texture d'écran — charge le vrai logo /logo.png et le compose
 * sur un fond blanc avec tagline + URL.
 * La texture est redessinée automatiquement une fois le logo chargé.
 */
function buildScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;

  const render = (logo?: HTMLImageElement) => {
    // Fond blanc légèrement crème
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, "#fdfdfc");
    bg.addColorStop(1, "#f3f4f1");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (logo && logo.width > 0) {
      // Logo réel centré, dimensionné à 60 % de la largeur
      const targetW = canvas.width * 0.62;
      const scale = targetW / logo.width;
      const w = logo.width * scale;
      const h = logo.height * scale;
      ctx.drawImage(logo, cx - w / 2, cy - h / 2 - 30, w, h);
    } else {
      // Fallback texte pendant le chargement du logo
      ctx.fillStyle = "#6b7280";
      ctx.font = "600 32px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Info Liquidation Recycle", cx, cy);
    }

    // Tagline + URL
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "500 22px Inter, Arial, sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.fillText(
      "Recyclage informatique · Grand Montréal · Depuis 2005",
      cx,
      cy + 160
    );

    ctx.font = "600 20px Inter, Arial, sans-serif";
    ctx.fillStyle = "#16a34a";
    ctx.fillText("infoliquidationrecycle.com", cx, cy + 198);
  };

  // Rend un fallback immédiat
  render();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;

  // Charge le vrai logo et redessine la texture quand il est prêt
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    render(img);
    texture.needsUpdate = true;
  };
  img.src = "/logo.png";

  return texture;
}
