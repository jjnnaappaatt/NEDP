"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Icosahedron } from "@react-three/drei";
import * as THREE from "three";

/**
 * A calm, low-opacity ambient scene meant to sit BEHIND a hero band (not be the focal point):
 * a drifting mint particle field + a few soft floating shapes, in the NEDP brand mint. Tasteful and
 * slow — text layered on top stays fully readable. Reuses the Hero3D palette/idiom.
 */
function Field({ count, color }: { count: number; color: string }) {
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    // deterministic-ish spread (Math.random is fine at module runtime in the browser)
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 15;
      a[i * 3 + 1] = (Math.random() - 0.5) * 8;
      a[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return a;
  }, [count]);
  const ref = useRef<THREE.Points>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.02;
    ref.current.position.y = Math.sin(s.clock.elapsedTime * 0.15) * 0.25;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color={color} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function SoftShapes({ color }: { color: string }) {
  return (
    <>
      <Float speed={1.1} rotationIntensity={0.4} floatIntensity={0.8} position={[-3.4, 1.2, -1]}>
        <Icosahedron args={[0.95, 0]}>
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} flatShading transparent opacity={0.5} />
        </Icosahedron>
      </Float>
      <Float speed={0.85} rotationIntensity={0.6} floatIntensity={1.1} position={[3.7, -0.9, -1.6]}>
        <Icosahedron args={[1.3, 1]}>
          <meshBasicMaterial color={color} wireframe transparent opacity={0.18} />
        </Icosahedron>
      </Float>
      <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.7} position={[1.9, 1.7, -2.2]}>
        <Icosahedron args={[0.55, 0]}>
          <meshStandardMaterial color={color} roughness={0.5} flatShading transparent opacity={0.42} />
        </Icosahedron>
      </Float>
    </>
  );
}

export default function AmbientHero({
  color = "#00d4a4",
  particle = "#00b48a",
  density = 200,
}: {
  color?: string;
  particle?: string;
  density?: number;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={0.9} />
      <SoftShapes color={color} />
      <Field count={density} color={particle} />
    </Canvas>
  );
}
