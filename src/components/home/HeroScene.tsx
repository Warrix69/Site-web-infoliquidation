"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  RoundedBox
} from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";

/**
 * Scène 3D du hero :
 * — Camion blanc réaliste lettré « INFO LIQUIDATION RECYCLE »
 * — Boîtes de matériel qui flottent vers lui (ramassage)
 * — Mini-planète verte qui tourne (impact écologique)
 * Lumière HDRI studio + ombres de contact pour un rendu PBR crédible.
 */
export function HeroScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [1.4, 1.6, 5.6], fov: 36 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      className="pointer-events-none"
    >
      <color attach="background" args={["#ffffff00"]} />

      {/* Éclairage réaliste */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-4, 2, 3]} intensity={0.4} color="#dcfce7" />

      <Suspense fallback={null}>
        <Scene />
        <Environment preset="studio" environmentIntensity={0.65} />
        <ContactShadows
          position={[0, -0.95, 0]}
          opacity={0.42}
          scale={10}
          blur={2.4}
          far={2}
          resolution={1024}
          color="#000000"
        />
      </Suspense>
    </Canvas>
  );
}

function Scene() {
  const reduce = useReducedMotion();
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || reduce) return;
    const t = state.clock.getElapsedTime();
    const mx = state.mouse.x * 0.1;
    const my = state.mouse.y * 0.05;
    group.current.rotation.y = -0.25 + Math.sin(t * 0.2) * 0.07 + mx;
    group.current.rotation.x = my;
  });

  return (
    <group ref={group}>
      <Float speed={1.1} rotationIntensity={0} floatIntensity={0.25}>
        <Truck />
      </Float>

      {/* Boîtes qui "arrivent" vers le camion */}
      <FloatingBox position={[-2.6, 0.5, 1.1]} rotation={[0.3, 0.5, 0.1]} delay={0} />
      <FloatingBox position={[-3.1, -0.2, 0.4]} rotation={[-0.2, 0.8, 0.2]} delay={0.5} size={0.42} />
      <FloatingBox position={[-2.3, 1.1, -0.5]} rotation={[0.15, -0.3, 0.4]} delay={1.1} size={0.38} />

      {/* Mini-planète */}
      <group position={[2.7, 1.6, -0.5]}>
        <Planet />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Camion                                                              */
/* ------------------------------------------------------------------ */

function Truck() {
  const logoTexture = useMemo(() => buildLogoTexture(), []);

  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f8fafc",
        metalness: 0.25,
        roughness: 0.35,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.0
      }),
    []
  );
  const windowMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#0b1016",
        metalness: 0.85,
        roughness: 0.15,
        envMapIntensity: 1.2
      }),
    []
  );
  const tireMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0a0a0a",
        roughness: 0.95,
        metalness: 0
      }),
    []
  );
  const rimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d4d4d8",
        metalness: 0.95,
        roughness: 0.2
      }),
    []
  );
  const grillMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#18181b",
        metalness: 0.9,
        roughness: 0.3
      }),
    []
  );
  const sideMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: logoTexture,
        metalness: 0.05,
        roughness: 0.4
      }),
    [logoTexture]
  );

  return (
    <group position={[0, -0.25, 0]} castShadow>
      {/* Châssis bas */}
      <RoundedBox args={[2.65, 0.12, 1.15]} radius={0.03} smoothness={3} position={[-0.1, -0.42, 0]}>
        <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.4} />
      </RoundedBox>

      {/* Caisse cargo blanche (arrondie) */}
      <RoundedBox
        args={[2.0, 1.15, 1.15]}
        radius={0.045}
        smoothness={4}
        position={[0.15, 0.45, 0]}
        material={bodyMat}
        castShadow
        receiveShadow
      />

      {/* Panneau latéral lettrage (face spectateur) */}
      <mesh position={[0.15, 0.45, 0.577]} material={sideMat}>
        <planeGeometry args={[1.86, 0.98]} />
      </mesh>
      {/* Panneau latéral lettrage (autre côté) */}
      <mesh position={[0.15, 0.45, -0.577]} rotation={[0, Math.PI, 0]} material={sideMat}>
        <planeGeometry args={[1.86, 0.98]} />
      </mesh>

      {/* Portes arrière (verticale au bout de la caisse) */}
      <mesh position={[1.151, 0.45, 0]}>
        <planeGeometry args={[1.12, 1.1]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Poignée de porte arrière */}
      <mesh position={[1.153, 0.45, 0]}>
        <boxGeometry args={[0.01, 0.4, 0.03]} />
        <meshStandardMaterial color="#52525b" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* Toit : bande verte accent */}
      <mesh position={[0.15, 1.03, 0]}>
        <boxGeometry args={[1.98, 0.025, 1.14]} />
        <meshStandardMaterial color="#16a34a" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Cabine */}
      <RoundedBox
        args={[0.85, 0.9, 1.1]}
        radius={0.08}
        smoothness={4}
        position={[-1.3, 0.32, 0]}
        material={bodyMat}
        castShadow
      />

      {/* Capot avant */}
      <RoundedBox
        args={[0.3, 0.55, 1.0]}
        radius={0.06}
        smoothness={4}
        position={[-1.78, 0.12, 0]}
        material={bodyMat}
      />

      {/* Pare-brise incliné */}
      <mesh position={[-1.52, 0.55, 0]} rotation={[0, 0, 0.42]} material={windowMat}>
        <boxGeometry args={[0.1, 0.5, 0.98]} />
      </mesh>

      {/* Vitres latérales cabine */}
      <mesh position={[-1.3, 0.5, 0.554]} material={windowMat}>
        <boxGeometry args={[0.6, 0.35, 0.015]} />
      </mesh>
      <mesh position={[-1.3, 0.5, -0.554]} material={windowMat}>
        <boxGeometry args={[0.6, 0.35, 0.015]} />
      </mesh>

      {/* Rétroviseurs */}
      <mesh position={[-1.52, 0.5, 0.65]}>
        <boxGeometry args={[0.08, 0.14, 0.06]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.3} roughness={0.35} />
      </mesh>
      <mesh position={[-1.52, 0.5, -0.65]}>
        <boxGeometry args={[0.08, 0.14, 0.06]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.3} roughness={0.35} />
      </mesh>

      {/* Grille avant */}
      <mesh position={[-1.925, 0.0, 0]} material={grillMat}>
        <boxGeometry args={[0.02, 0.25, 0.7]} />
      </mesh>

      {/* Phares avant */}
      <mesh position={[-1.928, 0.18, 0.38]}>
        <boxGeometry args={[0.015, 0.1, 0.17]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-1.928, 0.18, -0.38]}>
        <boxGeometry args={[0.015, 0.1, 0.17]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={0.6} roughness={0.3} />
      </mesh>

      {/* Feux arrière (rouge/vert) */}
      <mesh position={[1.158, 0.75, 0.45]}>
        <boxGeometry args={[0.015, 0.08, 0.14]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[1.158, 0.75, -0.45]}>
        <boxGeometry args={[0.015, 0.08, 0.14]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
      </mesh>

      {/* Pare-choc avant */}
      <RoundedBox args={[0.1, 0.18, 1.08]} radius={0.025} smoothness={3} position={[-1.95, -0.18, 0]}>
        <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.4} />
      </RoundedBox>
      {/* Pare-choc arrière */}
      <RoundedBox args={[0.1, 0.15, 1.1]} radius={0.025} smoothness={3} position={[1.2, -0.15, 0]}>
        <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.4} />
      </RoundedBox>

      {/* Roues (4) */}
      <Wheel position={[-1.25, -0.55, 0.6]} tireMat={tireMat} rimMat={rimMat} />
      <Wheel position={[-1.25, -0.55, -0.6]} tireMat={tireMat} rimMat={rimMat} />
      <Wheel position={[0.75, -0.55, 0.6]} tireMat={tireMat} rimMat={rimMat} />
      <Wheel position={[0.75, -0.55, -0.6]} tireMat={tireMat} rimMat={rimMat} />
    </group>
  );
}

function Wheel({
  position,
  tireMat,
  rimMat
}: {
  position: [number, number, number];
  tireMat: THREE.Material;
  rimMat: THREE.Material;
}) {
  const ref = useRef<THREE.Group>(null);
  const reduce = useReducedMotion();
  useFrame((state) => {
    if (!ref.current || reduce) return;
    ref.current.rotation.x = state.clock.getElapsedTime() * 1.2;
  });
  return (
    <group ref={ref} position={position} rotation={[0, 0, Math.PI / 2]}>
      {/* Pneu */}
      <mesh material={tireMat} castShadow>
        <torusGeometry args={[0.28, 0.1, 24, 48]} />
      </mesh>
      {/* Flanc arrière */}
      <mesh position={[0, -0.03, 0]} material={tireMat}>
        <cylinderGeometry args={[0.28, 0.28, 0.18, 32]} />
      </mesh>
      {/* Jante */}
      <mesh position={[0, 0.095, 0]} material={rimMat} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.025, 24]} />
      </mesh>
      {/* Centre de jante */}
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
        <meshStandardMaterial color="#71717a" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Rayons */}
      {Array.from({ length: 5 }, (_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.09, 0.105, Math.sin(angle) * 0.09]}
            rotation={[0, -angle, 0]}
            material={rimMat}
          >
            <boxGeometry args={[0.03, 0.015, 0.14]} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Boîtes de matériel qui flottent                                     */
/* ------------------------------------------------------------------ */

function FloatingBox({
  position,
  rotation,
  delay = 0,
  size = 0.5
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  delay?: number;
  size?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const reduce = useReducedMotion();

  const startX = position[0];
  const startY = position[1];
  const startZ = position[2];

  useFrame((state) => {
    if (!ref.current || reduce) return;
    const t = (state.clock.getElapsedTime() + delay) % 4;
    const progress = t / 4;
    ref.current.position.x = startX + (0.5 - startX) * progress;
    ref.current.position.y = startY + (0.5 - startY) * progress;
    ref.current.position.z = startZ + (0 - startZ) * progress;
    const scale = (1 - progress * 0.85) * size * 2;
    ref.current.scale.setScalar(scale);
    ref.current.rotation.y += 0.012;
    ref.current.rotation.x += 0.006;
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={size * 2} castShadow>
      <RoundedBox args={[0.35, 0.3, 0.3]} radius={0.015} smoothness={2}>
        <meshStandardMaterial color="#c89368" roughness={0.9} metalness={0} />
      </RoundedBox>
      {/* Ruban vert sur le dessus */}
      <mesh position={[0, 0.152, 0]}>
        <boxGeometry args={[0.36, 0.004, 0.08]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      <mesh position={[0, 0.152, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.36, 0.004, 0.08]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Mini-planète                                                        */
/* ------------------------------------------------------------------ */

function Planet() {
  const ref = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const reduce = useReducedMotion();

  useFrame((state) => {
    if (reduce) return;
    const t = state.clock.getElapsedTime();
    if (ref.current) ref.current.rotation.y = t * 0.4;
    if (ringRef.current) ringRef.current.rotation.z = t * 0.25;
  });

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={0.4}>
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshPhysicalMaterial
          color="#1e40af"
          metalness={0.2}
          roughness={0.55}
          clearcoat={0.4}
        />
      </mesh>
      {/* Continents verts par-dessus */}
      <mesh scale={1.002}>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshStandardMaterial
          color="#16a34a"
          roughness={0.6}
          transparent
          opacity={0.75}
          alphaMap={undefined}
        />
      </mesh>
      {/* Nuages wireframe très subtils */}
      <mesh scale={1.015}>
        <sphereGeometry args={[0.42, 36, 36]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.1} />
      </mesh>
      {/* Anneau */}
      <mesh ref={ringRef} rotation={[0.4, 0, 0]}>
        <torusGeometry args={[0.68, 0.006, 16, 128]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
      </mesh>
      <OrbitDot />
    </Float>
  );
}

function OrbitDot() {
  const ref = useRef<THREE.Mesh>(null);
  const reduce = useReducedMotion();
  useFrame((state) => {
    if (!ref.current || reduce) return;
    const t = state.clock.getElapsedTime() * 1;
    ref.current.position.x = Math.cos(t) * 0.68;
    ref.current.position.z = Math.sin(t) * 0.68;
  });
  return (
    <mesh ref={ref} position={[0.68, 0, 0]}>
      <sphereGeometry args={[0.04, 16, 16]} />
      <meshStandardMaterial color="#86efac" emissive="#86efac" emissiveIntensity={0.5} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Texture lettrage « INFO LIQUIDATION RECYCLE » sur le camion         */
/* ------------------------------------------------------------------ */

function buildLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 540;
  const ctx = canvas.getContext("2d")!;

  // Fond blanc légèrement crème
  ctx.fillStyle = "#fbfbfb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bandes vertes haut/bas
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(0, 0, canvas.width, 26);
  ctx.fillRect(0, canvas.height - 26, canvas.width, 26);

  // Icône recyclage (3 flèches en triangle)
  ctx.save();
  ctx.translate(140, canvas.height / 2);
  ctx.strokeStyle = "#16a34a";
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const r = 78;
  for (let i = 0; i < 3; i++) {
    const a1 = (i * 2 * Math.PI) / 3 - Math.PI / 2;
    const a2 = ((i + 1) * 2 * Math.PI) / 3 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, a1 + 0.2, a2 - 0.55);
    ctx.stroke();
    const headAngle = a2 - 0.55;
    const ex = Math.cos(headAngle) * r;
    const ey = Math.sin(headAngle) * r;
    const ax = Math.cos(headAngle + 0.18) * (r + 18);
    const ay = Math.sin(headAngle + 0.18) * (r + 18);
    const bx = Math.cos(headAngle - 0.18) * (r - 18);
    const by = Math.sin(headAngle - 0.18) * (r - 18);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.closePath();
    ctx.fillStyle = "#16a34a";
    ctx.fill();
  }
  ctx.restore();

  // Texte principal
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.font = "900 118px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = "#0a0a0a";
  ctx.fillText("INFO", 290, canvas.height / 2 - 78);

  ctx.font = "900 118px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = "#16a34a";
  ctx.fillText("LIQUIDATION", 290, canvas.height / 2 + 42);

  ctx.font = "700 44px Arial, sans-serif";
  ctx.fillStyle = "#52525b";
  ctx.fillText("· RECYCLE", 290, canvas.height / 2 + 128);

  // Numéro de téléphone en bas à droite
  ctx.font = "800 44px Arial, sans-serif";
  ctx.fillStyle = "#0a0a0a";
  ctx.textAlign = "right";
  ctx.fillText("(450) 473-4636", canvas.width - 36, canvas.height - 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
