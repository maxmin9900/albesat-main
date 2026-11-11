"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Soft round sprite so particles read as glowing dust, not hard squares. */
function makeSoftSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type GalaxyProps = {
  count?: number;
  innerRadius?: number;
  radius?: number;
  progressRef?: MutableRefObject<number>;
};

/** How long (seconds) the loose dust takes to settle into the carpet pattern. */
const FORM_DURATION = 6;

/**
 * Carpet dust — the shimmering silk/gold/crimson particles, laid out like a
 * Persian carpet seen from above: rings of discrete petal rosettes (guls) on
 * an even field, framed by twin guard bands with a zigzag stripe between.
 * No radial lines anywhere — that is what made it read as a spiderweb.
 * Leaves a hole in the centre for planet Earth; particles start as loose
 * golden dust and slowly settle into the pattern.
 */
export default function Galaxy({
  count = 16000,
  innerRadius = 1.9,
  radius = 7,
  progressRef,
}: GalaxyProps) {
  const localRef = useRef<THREE.Points>(null);
  const sprite = useMemo(() => makeSoftSprite(), []);
  const formT = useRef(0);

  const { positions, starts, targets, colors } = useMemo(() => {
    const targets = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const inside = new THREE.Color("#f5e2ad"); // bright gold-silk core
    const mid = new THREE.Color("#c9a24b"); // gold
    const outside = new THREE.Color("#8b1e2d"); // crimson rim
    const silk = new THREE.Color("#f0e6d2"); // silk sparkle

    // soft gaussian-ish jitter so motifs read hand-knotted, not machine-drawn
    const gauss = () => (Math.random() + Math.random() - 1) * 0.5;

    // discrete flower rosettes (guls) arranged on concentric rings
    const rings = [
      { r: 2.7, guls: 8, size: 0.36 },
      { r: 3.7, guls: 12, size: 0.38 },
      { r: 4.8, guls: 16, size: 0.4 },
      { r: 5.6, guls: 20, size: 0.3 },
    ];
    const totalGuls = rings.reduce((s, g) => s + g.guls, 0);

    const borderIn = radius - 0.85;
    const borderOut = radius - 0.15;
    const borderMid = (borderIn + borderOut) / 2;
    // triangle wave in [-1, 1] — the zigzag guard stripe between the bands
    const tri = (x: number) => (Math.asin(Math.sin(x)) * 2) / Math.PI;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const pick = Math.random();
      let tx: number;
      let tz: number;

      if (pick < 0.42) {
        // a woven rosette: dense golden heart + a ring of petals around it
        let sel = Math.floor(Math.random() * totalGuls);
        let ring = rings[0];
        for (const g of rings) {
          if (sel < g.guls) {
            ring = g;
            break;
          }
          sel -= g.guls;
        }
        const a0 = (sel / ring.guls) * Math.PI * 2 + ring.guls * 0.2;
        const cx = Math.cos(a0) * ring.r;
        const cz = Math.sin(a0) * ring.r;
        if (Math.random() < 0.5) {
          tx = cx + gauss() * ring.size * 0.4;
          tz = cz + gauss() * ring.size * 0.4;
        } else {
          const pa = Math.random() * Math.PI * 2;
          const pr = ring.size * (0.8 + Math.random() * 0.25);
          tx = cx + Math.cos(pa) * pr + gauss() * 0.03;
          tz = cz + Math.sin(pa) * pr + gauss() * 0.03;
        }
      } else if (pick < 0.62) {
        // the carpet's field — an even wash of dust between the motifs
        const a = Math.random() * Math.PI * 2;
        const r =
          innerRadius + 0.3 + Math.random() * (borderIn - innerRadius - 0.55);
        tx = Math.cos(a) * r;
        tz = Math.sin(a) * r;
      } else if (pick < 0.88) {
        // the border: two solid guard bands + a zigzag stripe between them
        const a = Math.random() * Math.PI * 2;
        const which = Math.random();
        const r =
          which < 0.4
            ? borderIn + gauss() * 0.07
            : which < 0.8
            ? borderOut + gauss() * 0.07
            : borderMid + tri(a * 36) * 0.16 + gauss() * 0.03;
        tx = Math.cos(a) * r;
        tz = Math.sin(a) * r;
      } else {
        // stray golden dust — hand-thrown sparkle
        const a = Math.random() * Math.PI * 2;
        const r = innerRadius + Math.pow(Math.random(), 0.8) * (radius - innerRadius);
        tx = Math.cos(a) * r;
        tz = Math.sin(a) * r;
      }

      const r = Math.hypot(tx, tz);
      const a = Math.atan2(tz, tx);

      targets[i3] = tx;
      targets[i3 + 1] = gauss() * 0.16;
      targets[i3 + 2] = tz;

      // birth position: same bearing but loose — dust before the loom draws it in
      const rStart = innerRadius + Math.random() * (radius - innerRadius) * 1.12;
      starts[i3] = Math.cos(a) * rStart;
      starts[i3 + 1] = gauss() * 1.1;
      starts[i3 + 2] = Math.sin(a) * rStart;

      const t = Math.max(0, Math.min(1, (r - innerRadius) / (radius - innerRadius)));
      const mixed = inside.clone();
      if (t < 0.5) mixed.lerpColors(inside, mid, t * 2);
      else mixed.lerpColors(mid, outside, (t - 0.5) * 2);
      if (Math.random() > 0.9) mixed.copy(silk);

      colors[i3] = mixed.r;
      colors[i3 + 1] = mixed.g;
      colors[i3 + 2] = mixed.b;
    }
    return { positions: starts.slice(), starts, targets, colors };
  }, [count, innerRadius, radius]);

  useFrame((_, delta) => {
    if (!localRef.current) return;
    localRef.current.rotation.y += delta * 0.04;

    // ease the loose dust into the medallion pattern, then stop touching the
    // buffer entirely so steady-state cost is identical to before.
    if (formT.current < 1) {
      formT.current = Math.min(formT.current + delta / FORM_DURATION, 1);
      const e = smoothstep(0, 1, formT.current);
      const attr = localRef.current.geometry.attributes
        .position as THREE.BufferAttribute;
      const live = attr.array as Float32Array;
      for (let i = 0; i < live.length; i++) {
        live[i] = starts[i] + (targets[i] - starts[i]) * e;
      }
      attr.needsUpdate = true;
    }

    // fade the dust out well before the camera dives onto Earth, so no stray
    // particles ever land on top of the close-up globe.
    const p = progressRef?.current ?? 0;
    const mat = localRef.current.material as THREE.PointsMaterial;
    mat.opacity = 0.95 * (1 - smoothstep(0.32, 0.5, p));
  });

  return (
    <points ref={localRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        alphaMap={sprite}
        size={0.045}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        transparent
        opacity={0.95}
      />
    </points>
  );
}
