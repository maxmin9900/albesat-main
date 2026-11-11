"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function makeStarSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function Starfield({
  count = 2200,
  progressRef,
}: {
  count?: number;
  progressRef?: MutableRefObject<number>;
}) {
  const ref = useRef<THREE.Points>(null);
  const sprite = useMemo(() => makeStarSprite(), []);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = 22 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  const time = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.008;
    time.current += delta;
    const p = progressRef?.current ?? 0;
    const mat = ref.current.material as THREE.PointsMaterial;
    // a slow collective twinkle so the dust feels alive, like drifting sparks
    const twinkle = 0.86 + 0.14 * Math.sin(time.current * 0.9);
    mat.opacity = 0.8 * twinkle * (1 - smoothstep(0.32, 0.5, p));
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        alphaMap={sprite}
        size={0.09}
        sizeAttenuation
        color="#ecd9a0"
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
