"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import IranHighlight from "./IranHighlight";

const DEG = Math.PI / 180;

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function geoDir(lon: number, lat: number) {
  const phi = (lon + 180) * DEG;
  const theta = (90 - lat) * DEG;
  return new THREE.Vector3(
    -Math.cos(phi) * Math.sin(theta),
    Math.cos(theta),
    Math.sin(phi) * Math.sin(theta)
  ).normalize();
}

export default function Earth({
  progressRef,
  radius = 1.35,
}: {
  progressRef: MutableRefObject<number>;
  radius?: number;
}) {
  const userGroup = useRef<THREE.Group>(null); // holds mouse-drag rotation
  const earth = useRef<THREE.Mesh>(null); // scroll spin / settle to Iran

  const drag = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    yaw: 0,
    pitch: 0,
    engaged: false, // true once the user has grabbed the globe
  });

  const [map, bump] = useTexture([
    "/textures/earth.jpg",
    "/textures/earth-bump.png",
  ]);
  map.colorSpace = THREE.SRGBColorSpace;

  const iranQuat = useMemo(() => {
    // Orient the globe so the centre of Iran faces the camera (+Z) AND the
    // North pole points straight up (+Y) — built from an explicit basis so
    // there is no roll ambiguity: Iran reads as a proper, upright map.
    const f = geoDir(53.5, 32.5); // Iran → toward camera
    const localNorth = new THREE.Vector3(0, 1, 0); // globe's north pole
    const right = new THREE.Vector3().crossVectors(localNorth, f).normalize();
    const up = new THREE.Vector3().crossVectors(f, right).normalize();
    const basis = new THREE.Matrix4().makeBasis(right, up, f);
    // basis maps local→world; we want the inverse so (right,up,f) → (X,Y,Z)
    return new THREE.Quaternion().setFromRotationMatrix(basis).invert();
  }, []);

  // global listeners so a drag keeps working even off the globe
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.active) return;
      const dx = e.clientX - d.lastX;
      const dy = e.clientY - d.lastY;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      d.yaw += dx * 0.006;
      d.pitch = Math.max(-0.7, Math.min(0.7, d.pitch + dy * 0.006));
    };
    const onUp = () => {
      drag.current.active = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    d.active = true;
    d.engaged = true;
    d.lastX = e.nativeEvent.clientX;
    d.lastY = e.nativeEvent.clientY;
    document.body.style.cursor = "grabbing";
  };

  useFrame((_, dt) => {
    if (!earth.current || !userGroup.current) return;
    const p = progressRef.current;

    // Cinematic entrance: Earth is invisible on first load. As the user
    // scrolls and the camera flies deeper through the galaxy, the globe
    // emerges from the far distance and grows smoothly to full size.
    const reveal = smoothstep(0.08, 0.4, p);
    userGroup.current.visible = reveal > 0.001;
    userGroup.current.scale.setScalar(0.02 + 0.98 * reveal);

    // Buttery-smooth handoff: the free spin gently dies away while the
    // lock onto Iran gently takes over — the two overlap, so there is no
    // visible jump anywhere in the scroll.
    const spinFade = 1 - smoothstep(0.2, 0.45, p); // 1 → 0
    const lockIn = smoothstep(0.3, 0.7, p); //   0 → 1

    if (!drag.current.engaged && spinFade > 0) {
      earth.current.rotateY(dt * 0.16 * spinFade);
    }
    if (lockIn > 0 || drag.current.engaged) {
      // frame-rate independent damping, eased in gradually
      const k = 1 - Math.exp(-dt * 3.2 * Math.max(lockIn, drag.current.engaged ? 1 : 0));
      earth.current.quaternion.slerp(iranQuat, k);
    }

    // outer group: user's mouse-drag orientation
    userGroup.current.rotation.y = drag.current.yaw;
    userGroup.current.rotation.x = drag.current.pitch;
  });

  return (
    <group ref={userGroup}>
      <mesh
        ref={earth}
        onPointerDown={onPointerDown}
        onPointerOver={() => (document.body.style.cursor = "grab")}
        onPointerOut={() => {
          if (!drag.current.active) document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[radius, 96, 96]} />
        <meshStandardMaterial
          map={map}
          bumpMap={bump}
          bumpScale={0.05}
          roughness={0.82}
          metalness={0.05}
          emissive={new THREE.Color("#0a1a2a")}
          emissiveIntensity={0.12}
        />

        {/* gold overlay of Iran, locked to the globe surface */}
        <IranHighlight radius={radius} progressRef={progressRef} />
      </mesh>

      {/* atmosphere rim */}
      <mesh scale={1.05}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshBasicMaterial
          color="#5fa9d0"
          transparent
          opacity={0.13}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh scale={1.13}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshBasicMaterial
          color="#c9a24b"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
