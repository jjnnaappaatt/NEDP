"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Icosahedron } from "@react-three/drei";
import * as THREE from "three";

/** A faceted mint crystal, faint mint wireframe shell, and a drifting particle field — the NEDP brand
 *  colours in a slow, tasteful hero. Auto-rotates and parallaxes gently toward the pointer. */
function Crystal() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.16;
    ref.current.rotation.x = s.clock.elapsedTime * 0.09;
  });
  return (
    <Float speed={1.3} rotationIntensity={0.5} floatIntensity={0.9}>
      <Icosahedron ref={ref} args={[1.5, 1]}>
        <meshStandardMaterial color="#00d4a4" roughness={0.35} metalness={0.15} flatShading />
      </Icosahedron>
      <Icosahedron args={[1.78, 1]}>
        <meshBasicMaterial color="#00d4a4" wireframe transparent opacity={0.22} />
      </Icosahedron>
    </Float>
  );
}

function Particles({ count = 130 }: { count?: number }) {
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 9;
      a[i * 3 + 1] = (Math.random() - 0.5) * 9;
      a[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return a;
  }, [count]);
  const ref = useRef<THREE.Points>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.03;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#00b48a" transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

function Rig({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, s.pointer.x * 0.3, 0.05);
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, -s.pointer.y * 0.2, 0.05);
  });
  return <group ref={ref}>{children}</group>;
}

export default function Hero3D() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <Rig>
        <Crystal />
        <Particles />
      </Rig>
    </Canvas>
  );
}
