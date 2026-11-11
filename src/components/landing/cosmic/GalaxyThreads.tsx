"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * The woven silk threads — fine circles beneath each rosette ring, a vine
 * meandering between the flowers, and the border's guard stripes with their
 * zigzag. Deliberately NO radial lines: spokes are what make concentric
 * geometry read as a spiderweb instead of a carpet.
 */
export default function GalaxyThreads({
  innerRadius = 1.9,
  radius = 7,
  segments = 220,
  progressRef,
}: {
  innerRadius?: number;
  radius?: number;
  segments?: number;
  progressRef?: MutableRefObject<number>;
}) {
  const ref = useRef<THREE.LineSegments>(null);

  const { positions, colors } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];

    const gold = new THREE.Color("#e6c67a");
    const silk = new THREE.Color("#f6ecd6");
    const crimson = new THREE.Color("#8b1e2d");

    const colorAt = (r: number) => {
      const t = Math.max(
        0,
        Math.min(1, (r - innerRadius) / (radius - innerRadius))
      );
      const c = gold.clone();
      if (t < 0.5) c.lerpColors(silk, gold, t * 2);
      else c.lerpColors(gold, crimson, (t - 0.5) * 2);
      return c;
    };

    const pushPolyline = (pts: THREE.Vector3[]) => {
      for (let s = 0; s < pts.length - 1; s++) {
        const p0 = pts[s];
        const p1 = pts[s + 1];
        const c = colorAt(Math.hypot(p0.x, p0.z));
        pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    };

    // ① fine circles under each rosette ring + a vine weaving between guls
    const rings = [
      { r: 2.7, guls: 8 },
      { r: 3.7, guls: 12 },
      { r: 4.8, guls: 16 },
      { r: 5.6, guls: 20 },
    ];
    rings.forEach((ring, k) => {
      // the plain circle the flowers sit on
      const circle: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        const y = Math.sin(a * 3 + k) * 0.02;
        circle.push(new THREE.Vector3(Math.cos(a) * ring.r, y, Math.sin(a) * ring.r));
      }
      pushPolyline(circle);
      // the vine: bulges gently between the rosettes, like a floral runner
      const vine: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        const r = ring.r + Math.sin(a * ring.guls + Math.PI / ring.guls) * 0.14;
        const y = Math.cos(a * ring.guls) * 0.025;
        vine.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      pushPolyline(vine);
    });

    // ② the border: twin guard circles + the zigzag stripe between them
    const borderIn = radius - 0.85;
    const borderOut = radius - 0.15;
    const tri = (x: number) => (Math.asin(Math.sin(x)) * 2) / Math.PI;
    [borderIn, borderOut].forEach((band) => {
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * band, 0, Math.sin(a) * band));
      }
      pushPolyline(pts);
    });
    const zig: THREE.Vector3[] = [];
    const zigSegs = 36 * 8; // enough samples to keep every zig crisp
    for (let s = 0; s <= zigSegs; s++) {
      const a = (s / zigSegs) * Math.PI * 2;
      const r = (borderIn + borderOut) / 2 + tri(a * 36) * 0.16;
      zig.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    pushPolyline(zig);

    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(col),
    };
  }, [innerRadius, radius, segments]);

  const wovenIn = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.04;
    // threads fade in slowly, as if being woven while the dust settles
    wovenIn.current = Math.min(wovenIn.current + delta / 6, 1);
    const p = progressRef?.current ?? 0;
    const mat = ref.current.material as THREE.LineBasicMaterial;
    mat.opacity =
      0.5 * smoothstep(0, 1, wovenIn.current) * (1 - smoothstep(0.32, 0.5, p));
  });

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}
