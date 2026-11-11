"use client";

import { Suspense, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Earth from "./Earth";

// NOTE: the starfield / woven-galaxy particle layers (Galaxy, GalaxyThreads,
// Starfield) are retired — the hero now sits on the photographed loom-and-
// carpet backdrop rendered behind this canvas by CosmicHero. Those files are
// kept in place should the cosmic look ever be revived.

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Cinematic "Google-Earth" dive, in two stages:
 *   ① approach — the camera pulls in from the wide shot to the spinning globe
 *   ② descent  — once the globe has turned to face Iran, the camera drops
 *                right onto it until Iran fills the frame.
 */
function CameraRig({ progressRef }: { progressRef: MutableRefObject<number> }) {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    const raw = progressRef.current;

    // ① first 60% of the scroll: fly in from the galaxy toward the globe
    const approach = easeInOut(THREE.MathUtils.clamp(raw / 0.6, 0, 1));
    // ② last 40%: descend onto the surface over Iran
    const descent = easeInOut(THREE.MathUtils.clamp((raw - 0.6) / 0.4, 0, 1));

    // z: 12 (whole galaxy) → 2.7 (globe) → 1.72 (dive right into Iran)
    const z = THREE.MathUtils.lerp(12, 2.7, approach) - descent * (2.7 - 1.72);
    // y: 5.2 (tilted, above) → 0.3 → 0 (level with the equator)
    const y = THREE.MathUtils.lerp(5.2, 0.3, approach) - descent * 0.3;

    // ease off the parallax sway as we lock onto Iran for a steady final frame
    const steady = 1 - descent;
    const px = pointer.x * 0.45 * steady;
    const py = pointer.y * 0.3 * steady;

    camera.position.x += (px - camera.position.x) * 0.04;
    camera.position.y += (y + py - camera.position.y) * 0.05;
    camera.position.z += (z - camera.position.z) * 0.06;
    camera.lookAt(target.current);
  });

  return null;
}

export default function CosmicScene({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  return (
    <Canvas
      camera={{ position: [0, 5.2, 12], fov: 55 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      {/* no background colour: the canvas stays transparent so the woven
          carpet backdrop behind it shows through */}
      <ambientLight intensity={0.55} />
      {/* warm key light so Earth is lit like a sunrise */}
      <directionalLight position={[5, 3, 5]} intensity={1.6} color="#fff4e0" />

      <Suspense fallback={null}>
        <Earth progressRef={progressRef} />
      </Suspense>
      <CameraRig progressRef={progressRef} />
    </Canvas>
  );
}
