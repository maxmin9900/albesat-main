"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const DEG = Math.PI / 180;

// Approximate linear fit from geographic lon/lat to the illustrated map's
// pixel position (in %), calibrated from the six city medallion anchors.
// Used to UV-map the artwork onto Iran's shape on the globe.
function artworkUV(lon: number, lat: number): [number, number] {
  const x = 22 + (lon - 46.29) * 3.96; // % across
  const y = 15.5 - (lat - 38.08) * 5.61; // % down
  return [x / 100, y / 100];
}

// Same lon/lat → sphere-direction mapping the Earth texture uses, so the
// highlight sits exactly on top of Iran on the globe.
function geoDir(lon: number, lat: number) {
  const phi = (lon + 180) * DEG;
  const theta = (90 - lat) * DEG;
  return new THREE.Vector3(
    -Math.cos(phi) * Math.sin(theta),
    Math.cos(theta),
    Math.sin(phi) * Math.sin(theta)
  ).normalize();
}

// A simplified but recognisable outline of Iran, [lon, lat], clockwise from
// the NW. (Caspian indent at the top; the Gulf, Hormuz & Oman at the bottom.)
const IRAN_BORDER: [number, number][] = [
  [44.0, 39.4], // NW — near Mount Ararat (Turkey/Armenia)
  [45.0, 39.3],
  [46.5, 38.9], // Azerbaijan
  [47.8, 39.6], // NW bulge
  [48.4, 38.4], // Astara — Caspian SW corner
  [49.9, 37.5], // Caspian coast (Gilan)
  [50.9, 36.9],
  [52.0, 36.7],
  [53.9, 36.9], // Caspian SE (Gorgan)
  [54.4, 37.5], // Turkmenistan border begins
  [55.8, 38.1],
  [57.4, 38.3],
  [58.6, 37.7],
  [59.6, 37.3],
  [60.4, 36.9],
  [61.2, 36.6], // NE corner (Turkmenistan/Afghanistan)
  [61.0, 35.3], // Afghanistan border, heading south
  [60.5, 34.1],
  [60.9, 33.5],
  [60.5, 31.4], // Sistan
  [61.8, 31.4],
  [61.9, 30.0], // Afghanistan/Pakistan
  [62.4, 28.3], // Pakistan (Balochistan)
  [63.3, 27.2], // SE corner — near Gwadar
  [61.7, 25.7], // Gulf of Oman coast
  [59.5, 25.4],
  [57.8, 25.6],
  [57.0, 26.0], // Makran
  [56.4, 26.5], // Bandar Abbas / Strait of Hormuz
  [55.0, 26.6],
  [53.5, 26.8], // Persian Gulf coast
  [52.0, 27.7],
  [51.0, 28.8], // Bushehr
  [50.2, 29.6],
  [49.5, 30.0],
  [48.9, 30.1], // Abadan
  [48.0, 30.5], // Iraq border (Shatt al-Arab)
  [47.4, 31.0],
  [47.7, 32.1],
  [47.3, 32.9], // Iraq
  [46.1, 33.0],
  [45.5, 33.9],
  [45.4, 34.6],
  [46.2, 35.8], // Iraqi-Kurdistan border
  [45.3, 36.5],
  [44.8, 37.2], // Iraq/Turkey junction
  [44.2, 37.9], // Turkey
  [44.0, 38.7],
];

/**
 * The illustrated Persian-carpet map of Iran, glued onto the globe surface
 * over the real country. It fades in as the camera descends onto Iran — the
 * satellite Iran dissolves into the woven artwork map, a cinematic "you have
 * arrived" flourish, framed by a soft gold border.
 *
 * Rendered as a child of the Earth mesh, so it inherits the globe's rotation
 * and stays locked onto Iran.
 */
export default function IranHighlight({
  radius,
  progressRef,
}: {
  radius: number;
  progressRef: MutableRefObject<number>;
}) {
  const fillRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.LineLoop>(null);
  const glowRef = useRef<THREE.LineLoop>(null);

  // the decluttered artwork (no city medallions) used only on the globe
  const mapTex = useTexture("/textures/iran-map-globe.jpg");
  mapTex.colorSpace = THREE.SRGBColorSpace;
  mapTex.flipY = false; // so UV (0,0) samples the image's top-left pixel

  const { fillGeo, borderGeo } = useMemo(() => {
    const dirs = IRAN_BORDER.map(([lon, lat]) => geoDir(lon, lat));

    // centroid direction (apex of the triangle-fan fill)
    const c = new THREE.Vector3();
    dirs.forEach((d) => c.add(d));
    c.normalize();
    const cLon =
      IRAN_BORDER.reduce((s, [lon]) => s + lon, 0) / IRAN_BORDER.length;
    const cLat =
      IRAN_BORDER.reduce((s, [, lat]) => s + lat, 0) / IRAN_BORDER.length;
    const [cu, cv] = artworkUV(cLon, cLat);

    // border ring, lifted just above the surface to avoid z-fighting
    const borderPts = dirs.map((d) => d.clone().multiplyScalar(radius * 1.004));
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);

    // triangle-fan fill from the centroid, UV-mapped so each geographic vertex
    // samples the matching spot on the artwork.
    const cFill = c.clone().multiplyScalar(radius * 1.0022);
    const ring = dirs.map((d) => d.clone().multiplyScalar(radius * 1.0022));
    const uvs = IRAN_BORDER.map(([lon, lat]) => artworkUV(lon, lat));
    const verts: number[] = [];
    const uv: number[] = [];
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      verts.push(
        cFill.x, cFill.y, cFill.z,
        ring[i].x, ring[i].y, ring[i].z,
        ring[j].x, ring[j].y, ring[j].z
      );
      uv.push(cu, cv, uvs[i][0], uvs[i][1], uvs[j][0], uvs[j][1]);
    }
    const fillGeo = new THREE.BufferGeometry();
    fillGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    fillGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));

    return { fillGeo, borderGeo };
  }, [radius]);

  useFrame(() => {
    const p = progressRef.current;
    // reveal as the camera lands on Iran (p ~0.6 → 0.95)
    const reveal = THREE.MathUtils.clamp((p - 0.6) / 0.32, 0, 1);

    if (fillRef.current) {
      const m = fillRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = reveal;
    }
    if (lineRef.current) {
      const m = lineRef.current.material as THREE.LineBasicMaterial;
      m.opacity = 0.9 * reveal;
    }
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.LineBasicMaterial;
      m.opacity = 0.3 * reveal;
    }
  });

  return (
    <group>
      {/* the illustrated carpet map, clipped to Iran's shape */}
      <mesh ref={fillRef} geometry={fillGeo}>
        <meshBasicMaterial
          map={mapTex}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* soft wide gold glow under the border */}
      <lineLoop ref={glowRef} geometry={borderGeo}>
        <lineBasicMaterial
          color="#ffe9a8"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineLoop>

      {/* crisp gold border framing the country */}
      <lineLoop ref={lineRef} geometry={borderGeo}>
        <lineBasicMaterial
          color="#fff4d0"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineLoop>
    </group>
  );
}
