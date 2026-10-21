"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows, Float } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Laptop 3D réaliste piloté par le scroll de la page.
 * — Fermé en haut de page (angle 2°) → ouvert à ~110° à mi-scroll
 * — Rotation Y qui suit le scroll
 * — Logo Info Liquidation Recycle apparaît sur l'écran et le capot
 */
export function HeroLaptop() {
  return (
    <Canvas
      camera={{ position: [0, 1.3, 4.2], fov: 36 }}
      dpr={[1, 2]}
      shadows
      gl={{ antialias: true, alpha: true }}
      className="pointer-events-none"
    >
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-5, 2, 2]} intensity={0.35} color="#dcfce7" />
      <Environment preset="apartment" environmentIntensity={0.5} />
      <ScrollLaptop />
      <ContactShadows
        position={[0, -0.5, 0]}
        opacity={0.4}
        scale={6}
        blur={2.2}
        far={2}
        resolution={1024}
        color="#000000"
      />
    </Canvas>
  );
}

function ScrollLaptop() {
  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const scrollRef = useRef(0);
  const reduce = useReducedMotion();

  // Mesure le scroll relatif à la section hero
  useEffect(() => {
    const update = () => {
      const section = document.querySelector("section");
      if (!section) return;
      const rect = section.getBoundingClientRect();
      // Progress 0 (top of section at top of viewport) → 1 (section bottom reaches top)
      const h = rect.height;
      const p = Math.min(1, Math.max(0, -rect.top / h));
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

  // Interpolation douce vers la cible
  const current = useRef({ lid: 0, rotY: 0, posY: 0 });

  useFrame((state, delta) => {
    if (!group.current || !lid.current) return;
    const p = reduce ? 0.5 : scrollRef.current;
    const t = state.clock.getElapsedTime();

    // Cibles basées sur le scroll
    const targetLid = 0.03 + p * 1.9; // 0.03 rad fermé → ~1.9 rad (~110°) ouvert
    const targetRotY = p * Math.PI * 0.6 + (reduce ? 0 : Math.sin(t * 0.3) * 0.08);
    const targetPosY = -p * 0.3;

    // Lerp
    const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, k * delta * 6);
    current.current.lid = lerp(current.current.lid, targetLid, 1);
    current.current.rotY = lerp(current.current.rotY, targetRotY, 1);
    current.current.posY = lerp(current.current.posY, targetPosY, 1);

    lid.current.rotation.x = -current.current.lid;
    group.current.rotation.y = current.current.rotY;
    group.current.position.y = current.current.posY;
  });

  const screenTexture = useMemo(() => buildScreenTexture(), []);
  const lidLogoTexture = useMemo(() => buildLidLogoTexture(), []);

  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e5e5e5",
        metalness: 0.75,
        roughness: 0.35,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3
      }),
    []
  );
  const bezelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#111111",
        metalness: 0.4,
        roughness: 0.6
      }),
    []
  );
  const keyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a1a1a",
        metalness: 0.1,
        roughness: 0.8
      }),
    []
  );

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={0.25} enabled={!reduce}>
      <group ref={group} position={[0, 0.1, 0]}>
        {/* Base (clavier) */}
        <mesh castShadow receiveShadow position={[0, -0.08, 0]} material={bodyMat}>
          <boxGeometry args={[2.4, 0.09, 1.6]} />
        </mesh>

        {/* Zone trackpad */}
        <mesh position={[0, -0.034, 0.55]}>
          <boxGeometry args={[0.9, 0.004, 0.6]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Clavier : grille de touches */}
        <group position={[0, -0.034, -0.22]}>
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: 14 }, (_, c) => (
              <mesh
                key={`k-${r}-${c}`}
                position={[(c - 6.5) * 0.14, 0.002, (r - 2) * 0.12]}
                material={keyMat}
              >
                <boxGeometry args={[0.12, 0.008, 0.1]} />
              </mesh>
            ))
          )}
        </group>

        {/* Charnière + écran — group qui pivote */}
        <group ref={lid} position={[0, -0.03, -0.78]}>
          {/* Capot écran */}
          <mesh castShadow position={[0, 0.72, -0.02]} material={bodyMat}>
            <boxGeometry args={[2.4, 1.45, 0.05]} />
          </mesh>
          {/* Logo sur le capot */}
          <mesh position={[0, 0.72, -0.051]}>
            <planeGeometry args={[1.0, 0.5]} />
            <meshStandardMaterial map={lidLogoTexture} transparent />
          </mesh>

          {/* Bezel noir intérieur */}
          <mesh position={[0, 0.72, 0.01]} material={bezelMat}>
            <boxGeometry args={[2.3, 1.37, 0.02]} />
          </mesh>

          {/* Écran */}
          <mesh position={[0, 0.72, 0.022]}>
            <planeGeometry args={[2.14, 1.22]} />
            <meshBasicMaterial map={screenTexture} toneMapped={false} />
          </mesh>

          {/* Petite caméra */}
          <mesh position={[0, 1.4, 0.016]}>
            <circleGeometry args={[0.015, 16]} />
            <meshStandardMaterial color="#000" metalness={0.3} />
          </mesh>
        </group>
      </group>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/* Textures : écran + logo capot (Canvas 2D)                           */
/* ------------------------------------------------------------------ */

function buildScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;

  // Fond légèrement en gradient blanc
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#f8fafc");
  g.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Barre de navigation
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, 80);
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "700 32px Inter, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("InfoLiquidationRecycle.com", 32, 40);

  ctx.fillStyle = "#01a447";
  ctx.beginPath();
  ctx.roundRect(canvas.width - 220, 20, 190, 42, 24);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px Inter, Arial, sans-serif";
  ctx.fillText("Ramassage gratuit", canvas.width - 200, 42);

  // Hero : grand titre
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "900 92px Arial, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Recycler.", 60, 240);
  ctx.fillStyle = "#01a447";
  ctx.fillText("Simplement.", 60, 340);

  // Petite ligne descriptive
  ctx.fillStyle = "#52525b";
  ctx.font = "500 24px Inter, Arial, sans-serif";
  ctx.fillText("Ramassage sans frais · Destruction certifiée · Grand Montréal", 62, 400);

  // Bouton CTA simulé
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.roundRect(60, 450, 310, 70, 36);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 24px Inter, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("Demander un ramassage →", 90, 485);

  // Carré d'image à droite (placeholder vert dégradé)
  const gRight = ctx.createLinearGradient(650, 180, 980, 540);
  gRight.addColorStop(0, "#01a447");
  gRight.addColorStop(1, "#00c65a");
  ctx.fillStyle = gRight;
  ctx.beginPath();
  ctx.roundRect(680, 160, 300, 400, 24);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 72px Arial, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("100%", 740, 380);
  ctx.font = "600 20px Inter, Arial, sans-serif";
  ctx.fillText("Valorisé", 740, 410);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildLidLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Logo "triangle flèches recyclage"
  ctx.save();
  ctx.translate(canvas.width / 2 - 110, canvas.height / 2);
  ctx.strokeStyle = "#01a447";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  const r = 54;
  for (let i = 0; i < 3; i++) {
    const a1 = (i * 2 * Math.PI) / 3 - Math.PI / 2;
    const a2 = ((i + 1) * 2 * Math.PI) / 3 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, a1 + 0.2, a2 - 0.55);
    ctx.stroke();
    const headAngle = a2 - 0.55;
    const ex = Math.cos(headAngle) * r;
    const ey = Math.sin(headAngle) * r;
    const ax = Math.cos(headAngle + 0.18) * (r + 14);
    const ay = Math.sin(headAngle + 0.18) * (r + 14);
    const bx = Math.cos(headAngle - 0.18) * (r - 14);
    const by = Math.sin(headAngle - 0.18) * (r - 14);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.closePath();
    ctx.fillStyle = "#01a447";
    ctx.fill();
  }
  ctx.restore();

  // Texte à droite du logo
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "900 32px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("INFO", 230, canvas.height / 2 - 20);
  ctx.fillStyle = "#01a447";
  ctx.fillText("LIQUIDATION", 230, canvas.height / 2 + 18);
  ctx.fillStyle = "#52525b";
  ctx.font = "600 16px Arial, sans-serif";
  ctx.fillText("· RECYCLE", 230, canvas.height / 2 + 46);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
