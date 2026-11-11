"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import { X } from "lucide-react";
import CarpetWeave, { WEAVE_CAPTIONS } from "./CarpetWeave";

// The illustrated "Cities of Persian Carpets" artwork. The source PNG is
// 3.3 MB, so a progressive JPEG (~650 KB) is what ships to the browser —
// regenerate it from the PNG if the artwork is ever replaced.
const MAP_SRC = "/textures/iran-map-hero1.jpg";
const MAP_W = 1501;
const MAP_H = 1048;
const MAP_RATIO = MAP_W / MAP_H;

type CityStory = {
  key: string;
  city: string;
  category: string;
  /** the city's true spot on the map, % of the artwork */
  x: number;
  y: number;
  /** photo of the local weaver at her loom */
  photo: string;
  /** cinematic narration, read aloud */
  narration: string;
  /**
   * Six origins are painted into the artwork itself — medallion, red pin,
   * name and province, all baked into the JPEG. Those carry no `province`
   * and no `medallion`: the code only lays an invisible hotspot over them.
   *
   * The five added later have to be drawn, so they carry both. `medallion`
   * is where the disc is placed when the true spot is too crowded to hold
   * one; a leader line then joins the disc back to the real location.
   */
  province?: string;
  medallion?: { x: number; y: number };
  /**
   * Nudges the name block off its default spot under the disc, in artwork
   * pixels. Used where a drawn label would otherwise run into a neighbour —
   * the painted labels are part of the JPEG and cannot move, so the drawn
   * ones give way.
   */
  labelDx?: number;
  labelDy?: number;
};

// The eleven weaving origins of the archive, in north-to-south journey order.
// `key` must match the lowercased city name used by REGIONS in
// src/app/collection/page.tsx — clicking a marker navigates to ?city=<key>.
//
// x/y are percentages of the artwork. The artwork is a hand-painted
// perspective map, not a geographic projection, so the six original pins were
// placed by eye. The five later cities were derived from those six by an
// affine fit of (lon,lat)→(x,y) with the residuals rubber-sheeted in, which
// reproduces all six originals exactly and keeps the new pins consistent with
// the painting rather than with a globe.
const CITIES: CityStory[] = [
  {
    key: "tabriz",
    city: "Tabriz",
    category: "Lacquer Medallion",
    x: 22,
    y: 15.5,
    photo: "/weavers/loom.jpg",
    narration:
      "Here is Tabriz. Here, the hands of Soraya — shaped by Azeri melodies — tie every knot like echoes of ancient caravans.",
  },
  {
    key: "turkaman",
    city: "Turkaman",
    category: "Göl Medallion",
    x: 50.4,
    y: 20.7,
    province: "Golestan Province",
    // pushed east into open ground so Tehran has room between Qom and here
    medallion: { x: 56.1, y: 20.7 },
    labelDx: 40,
    photo: "/carpets/turkaman-1.jpg",
    narration:
      "Here are the Turkaman looms of the Caspian steppe, where the same göl medallion has been repeated for centuries in madder red.",
  },
  {
    key: "tehran",
    city: "Tehran",
    category: "Court Medallion",
    x: 37.4,
    y: 23.7,
    province: "Tehran Province",
    // lifted north — the painted Qom medallion sits on Tehran's own spot, and
    // its painted label sits directly below that
    medallion: { x: 42.7, y: 20.4 },
    labelDx: 40,
    photo: "/carpets/tehran-1.jpg",
    narration:
      "Here is Tehran, where the workshops of the capital gathered the finest weavers of every province under one roof.",
  },
  {
    key: "mashhad",
    city: "Mashhad",
    category: "Khorasan Floral",
    x: 74.8,
    y: 25.5,
    photo: "/weavers/mashhad.jpg",
    narration:
      "Here is Mashhad. Here, the hands of Maryam and her daughter Hana — bound together by faith and love — weave every knot like a shared prayer under the golden dome.",
  },
  {
    key: "qom",
    city: "Qom",
    category: "Pure Silk",
    x: 34.2,
    y: 27.5,
    photo: "/weavers/loom2.jpg",
    narration:
      "Here is Qom. Here, the hands of Hassan — an eighty-year-old man whose life has become one long prayer — tie every knot as if each thread were a verse of silence.",
  },
  {
    key: "kashan",
    city: "Kashan",
    category: "Floral Garden",
    x: 39.3,
    y: 42.5,
    photo: "/weavers/kashan.jpg",
    narration:
      "Here is Kashan. Here, the hands of Lila — a twenty-five-year-old girl whose dreams are still softer than silk — tie every knot like a promise to a future she has just begun to imagine.",
  },
  {
    key: "nain",
    city: "Nain",
    category: "Ivory Silk",
    x: 45.2,
    y: 46.3,
    province: "Isfahan Province",
    // Out into the open desert. Isfahan Province only has room for one drawn
    // disc beside Kashan's painted one, and Esfahan needs it more — so Nain
    // gives way and its leader line reaches back to the real Nain.
    medallion: { x: 60.4, y: 39.8 },
    labelDx: 80,
    photo: "/carpets/nain-1.jpg",
    narration:
      "Here is Nain, where ivory wool and lapis silk meet in a weave so fine the pattern seems drawn rather than knotted.",
  },
  {
    key: "esfahan",
    city: "Esfahan",
    category: "Eslimi",
    x: 39.3,
    y: 48.3,
    province: "Isfahan Province",
    // Inside Isfahan Province, in its eastern lobe. That is the only spot the
    // province offers: its western tip ends exactly where Kashan's painted
    // medallion begins, so nothing fits on Esfahan's own side of it.
    medallion: { x: 47.7, y: 43.2 },
    labelDx: 70,
    photo: "/carpets/esfahan-1.jpg",
    narration:
      "Here is Esfahan, where the arabesques of the royal square were carried from tile into silk without losing a single curve.",
  },
  {
    key: "kerman",
    city: "Kerman",
    category: "Lavar Garden",
    x: 61.2,
    y: 58.3,
    province: "Kerman Province",
    medallion: { x: 62.9, y: 58.3 },
    photo: "/carpets/kerman-1.jpg",
    narration:
      "Here is Kerman, where the weavers of Lavar filled the desert's edge with gardens that never wither.",
  },
  {
    key: "baluch",
    city: "Baluch",
    category: "Tribal Geometric",
    x: 76,
    y: 62,
    photo: "/weavers/sistan.jpg",
    narration:
      "Here are the Baluch looms. Here, the hands of Aylin — a twenty-year-old girl whose gaze is as endless as the desert — tie every knot like fragile hope for tomorrow.",
  },
  {
    key: "shiraz",
    city: "Shiraz",
    category: "Qashqai Tribal",
    x: 43.3,
    y: 63,
    photo: "/weavers/shiraz.jpg",
    narration:
      "Here is Shiraz. Here, the hands of Shirin and Neda — among roses and poetry — weave every knot like verses of Hafez.",
  },
];

/* ------------------------------------------------------------------ */
/*  Province regions — glowing, clickable borders on the artwork       */
/* ------------------------------------------------------------------ */

// OFFICIAL province borders (geoBoundaries ADM1, simplified) — exactly the
// shapes of the provincial atlas. The artwork is a hand-painted 3D-perspective
// map, so no single global projection fits it: each province is anchored to
// its own city medallion on the painting and drawn with a local °→% scale,
// which keeps the medallion inside its glowing province.
import { PROVINCE_POLY } from "@/lib/iran-provinces";

type Province = {
  name: string;
  /** the anchor city's real position */
  anchor: [number, number]; // lon, lat
  /** where that city's medallion sits on the artwork, in % */
  pin: { x: number; y: number };
  /** local scale, % per degree */
  sx: number;
  sy: number;
};

const PROVINCES: Record<string, Province> = {
  tabriz: {
    name: "East Azerbaijan",
    anchor: [46.29, 38.08], // Tabriz
    pin: { x: 22.0, y: 15.5 },
    sx: 3.6,
    sy: 4.4,
  },
  qom: {
    name: "Qom Province",
    anchor: [50.88, 34.64], // Qom — small province, scaled up to hold the medallion
    pin: { x: 34.2, y: 27.5 },
    sx: 6.5,
    sy: 7.0,
  },
  kashan: {
    name: "Isfahan Province",
    anchor: [51.41, 33.99], // Kashan (north of the province)
    pin: { x: 39.3, y: 42.5 },
    sx: 3.9,
    sy: 4.4,
  },
  shiraz: {
    name: "Fars Province",
    anchor: [52.53, 29.61], // Shiraz
    pin: { x: 43.3, y: 63.0 },
    sx: 4.0,
    sy: 4.4,
  },
  mashhad: {
    name: "Razavi Khorasan",
    anchor: [59.61, 36.3], // Mashhad
    pin: { x: 74.8, y: 25.5 },
    sx: 4.1,
    sy: 4.2,
  },
  baluch: {
    name: "Sistan & Baluchestan",
    anchor: [60.86, 29.5], // Zahedan
    pin: { x: 76.0, y: 62.0 },
    sx: 4.2,
    sy: 4.0,
  },
};

// Only six of the eleven origins have a province outline, and Kashan, Nain and
// Esfahan share one (Isfahan). So the provinces are decoration only — the
// city markers are what respond to hover and clicks.

// anchor-relative projection: the province is drawn around its city medallion
const provPath = (key: string, p: Province) => {
  const poly = PROVINCE_POLY[key];
  if (!poly) return "";
  return (
    poly
      .map(([lon, lat], i) => {
        const x = p.pin.x + (lon - p.anchor[0]) * p.sx;
        const y = p.pin.y - (lat - p.anchor[1]) * p.sy;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ") + " Z"
  );
};

/* ------------------------------------------------------------------ */
/*  Drawn medallions, matched to the ones painted into the artwork     */
/* ------------------------------------------------------------------ */

// The painted discs measure ~130px across on the 1501×1048 artwork. The drawn
// ones are a touch smaller so eleven origins sit together without crowding.
const DISC_R = 55;

/** where a city's disc is drawn, in artwork pixels */
const medallionAt = (c: CityStory) => ({
  cx: ((c.medallion?.x ?? c.x) / 100) * MAP_W,
  cy: ((c.medallion?.y ?? c.y) / 100) * MAP_H,
});

/** the city's true spot, in artwork pixels */
const trueAt = (c: CityStory) => ({
  tx: (c.x / 100) * MAP_W,
  ty: (c.y / 100) * MAP_H,
});

function CityMedallion({ c, on }: { c: CityStory; on: boolean }) {
  const { cx, cy } = medallionAt(c);
  const { tx, ty } = trueAt(c);
  const displaced = !!c.medallion;

  return (
    <g>
      {/* leader line back to the real location, when the disc had to move */}
      {displaced && (
        <>
          <line
            x1={cx}
            y1={cy}
            x2={tx}
            y2={ty}
            stroke="#e6c67a"
            strokeWidth={1.6}
            strokeDasharray="5 5"
            opacity={on ? 0.95 : 0.55}
          />
          <circle cx={tx} cy={ty} r={5} fill="#e6c67a" stroke="#05050a" strokeWidth={1.5} />
        </>
      )}

      {/* the disc: dark backing, gold rim, photo */}
      <circle cx={cx} cy={cy} r={DISC_R + 7} fill="#0b0906" opacity={0.55} />
      <image
        href={c.photo}
        x={cx - DISC_R}
        y={cy - DISC_R}
        width={DISC_R * 2}
        height={DISC_R * 2}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#disc-${c.key})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={DISC_R + 3}
        fill="none"
        stroke="#0b0906"
        strokeWidth={7}
        opacity={0.8}
      />
      <circle
        cx={cx}
        cy={cy}
        r={DISC_R + 2}
        fill="none"
        stroke={on ? "#fff4d0" : "#c9a24b"}
        strokeWidth={4}
      />
      <circle cx={cx} cy={cy} r={DISC_R - 2} fill="none" stroke="#e6c67a" strokeWidth={1.5} opacity={0.8} />

      {/* red pin + name + province, laid out like the painted ones */}
      <foreignObject
        x={cx - 170 + (c.labelDx ?? 0)}
        y={cy + DISC_R + 2 + (c.labelDy ?? 0)}
        width={340}
        height={92}
        style={{ overflow: "visible" }}
      >
        <div
          className="flex flex-col items-center leading-none"
          style={{ textShadow: "0 2px 5px #05050a, 0 0 12px #05050a" }}
        >
          {/* sized to the painted labels: ~32px name, ~18px province, on the
              artwork's own 1501×1048 grid */}
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width={28} height={28} aria-hidden>
              <path
                d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"
                fill="#e03131"
                stroke="#5c0f14"
                strokeWidth="1"
              />
              <circle cx="12" cy="9" r="2.6" fill="#fff" />
            </svg>
            <span
              className="font-display tracking-[0.05em] text-white"
              style={{ fontSize: 32 }}
            >
              {c.city.toUpperCase()}
            </span>
          </div>
          <span
            className="font-display text-white"
            style={{ fontSize: 18, marginTop: 8 }}
          >
            {c.province}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

export type CityImages = Record<string, string | undefined>;

export default function IranMap({ images = {} }: { images?: CityImages }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // The narrated weaver's-tale overlay is DISABLED: `active` is never set,
  // so the StoryOverlay below never opens. Clicking a city now navigates
  // straight to that city's page in the collection archive instead.
  const [active, setActive] = useState<CityStory | null>(null);
  const [hoveredProv, setHoveredProv] = useState<string | null>(null);
  // an expanding golden ring plays where the visitor clicked a province
  const [pulse, setPulse] = useState<{ key: string; ts: number } | null>(null);

  // the city currently in focus — hover selects it, and it is the city
  // whose carpet gets woven at the journey's end (Kashan by default)
  const [focusCity, setFocusCity] = useState("kashan");

  const hoverProv = (key: string | null) => {
    setHoveredProv(key);
    if (key) setFocusCity(key);
  };

  const openCity = (c: CityStory) => {
    setFocusCity(c.key);
    setPulse({ key: c.key, ts: Date.now() });
    // let the golden pulse breathe, then travel to the city's archive page
    window.setTimeout(() => router.push(`/collection?city=${c.key}`), 450);
  };

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  // Cinematic hand-off: this track starts 200vh BEFORE the cosmic hero ends
  // (-mt below), so the map is already pinned full-screen beneath the globe
  // while the hero's 3D scene cross-dissolves away above it — zero gap, no
  // black frame, one continuous flight into Iran.
  //
  // The one sticky viewport then carries the whole journey:
  //   grow-in → cities light up one by one → explore → dive into the chosen
  //   city → the loom weaves that city's carpet → the camera lands on it →
  //   the collection rises straight off the carpet (it overlaps our tail).
  const mapScale = useTransform(scrollYProgress, [0, 0.14, 0.52, 0.62], [0.93, 1, 1, 2.7]);
  const mapOpacity = useTransform(scrollYProgress, [0, 0.56, 0.625], [1, 1, 0]);
  const hintOpacity = useTransform(scrollYProgress, [0.4, 0.45, 0.5, 0.54], [0, 1, 1, 0]);
  // hovers must not re-aim the dive once the camera is already falling
  const mapPointerEvents = useTransform(scrollYProgress, (v) =>
    v > 0.56 ? ("none" as const) : ("auto" as const)
  );
  const weaveOpacity = useTransform(scrollYProgress, [0.57, 0.63], [0, 1]);
  const weaveProgress = useTransform(scrollYProgress, [0.62, 0.9], [0, 1]);
  // the "camera lands": the finished carpet settles from 1.045 → 1
  const weaveScale = useTransform(scrollYProgress, [0.9, 1], [1.045, 1]);
  const captionOpacity = useTransform(
    scrollYProgress,
    [0.64, 0.69, 0.82, 0.86],
    [0, 1, 1, 0]
  );

  // the dive zooms toward the chosen city's disc on the artwork
  const focus = CITIES.find((c) => c.key === focusCity) ?? CITIES[0];
  const divePin = focus.medallion ?? { x: focus.x, y: focus.y };

  return (
    <section id="cities" ref={trackRef} className="relative -mt-[200vh] h-[800vh] bg-void">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* blurred copy of the artwork fills the whole viewport (full-bleed) */}
        <motion.div style={{ opacity: mapOpacity }} className="absolute inset-0">
          <img
            src={MAP_SRC}
            alt=""
            aria-hidden
            className="h-full w-full scale-110 object-cover blur-2xl brightness-[0.45]"
            draggable={false}
          />
        </motion.div>

        {/* the sharp artwork, as large as the screen allows */}
        <motion.div
          style={{
            x: "-50%",
            y: "-50%",
            scale: mapScale,
            opacity: mapOpacity,
            pointerEvents: mapPointerEvents,
            // the end-of-journey zoom dives into the chosen city itself
            transformOrigin: `${divePin.x}% ${divePin.y}%`,
            height: `min(100vh, calc(100vw / ${MAP_RATIO}))`,
            aspectRatio: `${MAP_W} / ${MAP_H}`,
          }}
          className="absolute left-1/2 top-1/2"
        >
          <img
            src={MAP_SRC}
            alt="The Cities of Persian Carpets — illustrated map of Iran"
            className="absolute inset-0 h-full w-full object-cover shadow-[0_0_80px_-10px_rgba(0,0,0,0.9)]"
            draggable={false}
          />

          {/* glowing, clickable province borders of the six carpet cities */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <defs>
              <linearGradient id="provFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e6c67a" />
                <stop offset="100%" stopColor="#8b1e2d" />
              </linearGradient>
              <filter id="provGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="0.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* cut a clean hole around each carpet medallion so it stays
                  bright INSIDE its glowing province (fill only, not border) */}
              {CITIES.map((c) => {
                const prov = PROVINCES[c.key];
                if (!prov) return null;
                return (
                  <mask id={`prov-hole-${c.key}`} key={c.key}>
                    <rect x="-10" y="-10" width="120" height="120" fill="white" />
                    <ellipse
                      cx={prov.pin.x}
                      cy={prov.pin.y}
                      rx="5.4"
                      ry="7.6"
                      fill="black"
                    />
                  </mask>
                );
              })}
            </defs>

            {CITIES.map((c, i) => {
              const prov = PROVINCES[c.key];
              if (!prov) return null;
              const d = provPath(c.key, prov);
              const on = hoveredProv === c.key;
              return (
                <ProvinceReveal key={c.key} index={i} progress={scrollYProgress}>
                <motion.g
                  animate={{
                    x: on ? -0.35 : 0,
                    y: on ? -0.7 : 0,
                  }}
                  transition={{ duration: 0.35 }}
                >
                  {/* dark drop shadow beneath — lifts the province off the map */}
                  <motion.path
                    d={d}
                    fill="rgba(0,0,0,0.6)"
                    stroke="none"
                    style={{ filter: "blur(1.2px)" }}
                    animate={{
                      x: on ? 1.1 : 0.4,
                      y: on ? 2.0 : 0.8,
                      opacity: on ? 0.75 : 0.5,
                    }}
                    transition={{ duration: 0.35 }}
                  />
                  {/* the province body — masked so the carpet medallion
                      stays bright inside its region */}
                  <motion.path
                    d={d}
                    fill="url(#provFill)"
                    stroke={on ? "#fff4d0" : "#e6c67a"}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    filter="url(#provGlow)"
                    mask={`url(#prov-hole-${c.key})`}
                    style={{ pointerEvents: "none" }}
                    animate={{
                      fillOpacity: on ? 0.42 : 0.16,
                      strokeWidth: on ? 3 : 1.8,
                    }}
                    transition={{ duration: 0.35 }}
                  />
                  {/* golden energy travelling around the border */}
                  <path
                    d={d}
                    fill="none"
                    stroke="#fff4d0"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    className="prov-flow"
                    style={{ pointerEvents: "none" }}
                  />
                  {/* click pulse: an expanding golden echo of the border */}
                  {pulse?.key === c.key && (
                    <motion.path
                      key={pulse.ts}
                      d={d}
                      fill="none"
                      stroke="#ffe9a8"
                      vectorEffect="non-scaling-stroke"
                      initial={{ opacity: 0.95, strokeWidth: 2 }}
                      animate={{ opacity: 0, strokeWidth: 10 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  )}
                  {/* province name appears on hover, above the city pin */}
                  {on && (
                    <text
                      x={prov.pin.x}
                      y={prov.pin.y + 5}
                      fontSize="2.1"
                      fontWeight="700"
                      textAnchor="middle"
                      fill="#fff4d0"
                      stroke="#05050a"
                      strokeWidth="0.4"
                      paintOrder="stroke"
                      style={{ pointerEvents: "none" }}
                    >
                      {prov.name}
                    </text>
                  )}
                </motion.g>
                </ProvinceReveal>
              );
            })}
          </svg>

          {/* Medallions for the five origins the artwork does not paint,
              drawn to match the six it does. The viewBox is the artwork's own
              pixel grid, so every radius and type size below is in the same
              units the painter worked in and scales with the map. */}
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <defs>
              {CITIES.filter((c) => c.province).map((c) => {
                const d = medallionAt(c);
                return (
                  <clipPath id={`disc-${c.key}`} key={c.key}>
                    <circle cx={d.cx} cy={d.cy} r={DISC_R} />
                  </clipPath>
                );
              })}
            </defs>
            {CITIES.map((c, i) =>
              c.province ? (
                <ProvinceReveal key={c.key} index={i} progress={scrollYProgress}>
                  <CityMedallion c={c} on={hoveredProv === c.key} />
                </ProvinceReveal>
              ) : null
            )}
          </svg>

          {/* clickable hotspots over each city medallion — they light up one
              by one as the camera flies deeper into the map */}
          {CITIES.map((c, i) => (
            <CityMarker
              key={c.key}
              c={c}
              index={i}
              progress={scrollYProgress}
              onOpen={openCity}
              onHover={hoverProv}
            />
          ))}

        </motion.div>

        {/* ——— the loom: the chosen city's carpet is woven in front of the
            visitor as the map dissolves beneath the diving camera ——— */}
        <motion.div
          style={{ opacity: weaveOpacity, scale: weaveScale }}
          className="pointer-events-none absolute inset-0"
        >
          <CarpetWeave
            progress={weaveProgress}
            cityKey={focusCity}
            image={images[focusCity] ?? `/carpets/${focusCity}-1.jpg`}
          />
        </motion.div>
        <motion.p
          style={{ opacity: captionOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-[7vh] z-10 text-center text-xs tracking-[0.45em] text-gold-light/90 ornament"
        >
          {WEAVE_CAPTIONS[focusCity] ?? WEAVE_CAPTIONS.kashan}
        </motion.p>

        {/* scroll hint */}
        <motion.p
          style={{ opacity: hintOpacity }}
          className="absolute inset-x-0 bottom-[3.5vh] z-20 text-center text-xs tracking-[0.35em] text-gold/60"
        >
          CLICK A CITY · SCROLL TO CONTINUE
        </motion.p>
      </div>

      {/* ——— the weaver's tale (narrated overlay) — DISABLED: `active` is
          never set anymore, so this never opens; city clicks go to the
          collection archive instead. Kept here to re-enable easily. ——— */}
      <AnimatePresence>
        {active && (
          <StoryOverlay
            story={active}
            carpet={images[active.key] ?? `/carpets/${active.key}.jpg`}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene 4 — cities awaken one by one along the scroll                */
/* ------------------------------------------------------------------ */

// Each city's reveal window on the section timeline, in journey order. The
// step is sized so the last of the eleven has fully awakened well before the
// camera starts its dive at 0.56.
const cityRevealStart = (i: number) => 0.15 + i * 0.022;

/** Scroll-staggered opacity for a province's glowing border group. */
function ProvinceReveal({
  index,
  progress,
  children,
}: {
  index: number;
  progress: MotionValue<number>;
  children: ReactNode;
}) {
  const start = cityRevealStart(index);
  const opacity = useTransform(progress, [start, start + 0.05], [0, 1]);
  return <motion.g style={{ opacity }}>{children}</motion.g>;
}

/** A city medallion hotspot that awakens with glow, scale and a burst. */
function CityMarker({
  c,
  index,
  progress,
  onOpen,
  onHover,
}: {
  c: CityStory;
  index: number;
  progress: MotionValue<number>;
  onOpen: (c: CityStory) => void;
  onHover: (key: string | null) => void;
}) {
  const start = cityRevealStart(index);
  const opacity = useTransform(progress, [start, start + 0.05], [0, 1]);
  const scale = useTransform(progress, [start, start + 0.08], [0.35, 1]);
  const [burst, setBurst] = useState(false);
  useMotionValueEvent(opacity, "change", (v) => {
    if (v > 0.55) setBurst(true);
  });

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(c)}
      onMouseEnter={() => onHover(c.key)}
      onMouseLeave={() => onHover(null)}
      aria-label={`${c.city} — view in the collection archive`}
      className="group absolute cursor-pointer"
      style={{
        // sits over whichever disc represents this city — the painted one, or
        // the drawn one where that had to be displaced for room
        left: `${c.medallion?.x ?? c.x}%`,
        top: `${c.medallion?.y ?? c.y}%`,
        width: "9%",
        aspectRatio: "1",
        x: "-50%",
        y: "-50%",
        opacity,
        scale,
      }}
    >
      {/* soft pulse so users know the medallions are alive */}
      <span className="absolute inset-[12%] animate-pulse-glow rounded-full border border-gold-light/50" />
      <span className="absolute inset-0 rounded-full ring-2 ring-transparent transition-all duration-300 group-hover:ring-gold-light/90 group-hover:shadow-[0_0_35px_rgba(230,198,122,0.65)]" />

      {/* one-shot golden awakening: an expanding ring + a particle burst */}
      {burst && (
        <span aria-hidden className="pointer-events-none absolute inset-0">
          <span className="city-ring absolute inset-[8%] rounded-full border border-gold-light/80" />
          {Array.from({ length: 8 }).map((_, k) => (
            <span
              key={k}
              className="city-spark"
              style={{
                ["--a" as string]: `${k * 45}deg`,
                animationDelay: `${k * 0.03}s`,
              }}
            />
          ))}
        </span>
      )}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Cinematic per-city story: weaver photo/film + narrated tale        */
/* ------------------------------------------------------------------ */

// (The golden bird / Simorgh that used to fly between the provinces has
//  been removed at the client's request.)

function StoryOverlay({
  story,
  carpet,
  onClose,
}: {
  story: CityStory;
  carpet: string;
  onClose: () => void;
}) {
  const [videoOk, setVideoOk] = useState(true);
  const narrationRef = useRef<HTMLAudioElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);

  // The tale begins on its own the moment the city opens — recorded
  // narration first, the most human live voice as fallback, folk music under.
  useEffect(() => {
    vidRef.current?.play().catch(() => setVideoOk(false));

    const speakTTS = () => {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(story.narration);
      u.lang = "en-US";
      u.rate = 0.92;
      u.pitch = 0.92;
      const voices = synth.getVoices();
      const pick =
        voices.find((v) => /^en/i.test(v.lang) && /(natural|neural)/i.test(v.name)) ||
        voices.find((v) => /^en/i.test(v.lang) && /online/i.test(v.name)) ||
        voices.find((v) => /^en/i.test(v.lang) && /google/i.test(v.name)) ||
        voices.find((v) => /^en[-_]?(US|GB)/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang));
      if (pick) u.voice = pick;
      synth.speak(u);
    };

    const nar = narrationRef.current;
    if (nar) {
      nar.currentTime = 0;
      nar.play().catch(() => speakTTS());
    } else {
      speakTTS();
    }

    const music = musicRef.current;
    if (music) {
      music.volume = 0.3;
      music.currentTime = 0;
      music.play().catch(() => {});
    }

    return () => {
      window.speechSynthesis?.cancel();
      narrationRef.current?.pause();
      musicRef.current?.pause();
    };
  }, [story.key, story.narration]);

  // Esc closes; any scroll gesture gently dissolves the tale and
  // lets the journey continue to the collections below.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("touchmove", onScroll);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 1.1, ease: "easeInOut" } }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-50 bg-void/97 backdrop-blur-xl"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-20 rounded-full border border-gold/30 p-2.5 text-gold transition-colors hover:bg-gold/10"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="grid h-full grid-cols-1 md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------- the weaver, alive ---------- */}
        <motion.div
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative h-[44vh] overflow-hidden md:h-full"
        >
          {/* weaver photo, slow Ken-Burns */}
          <motion.div
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 16, ease: "easeOut" }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${story.photo})` }}
          />
          {/* the real weaving film, breathing over the photo */}
          {videoOk && (
            <video
              ref={vidRef}
              className="absolute inset-0 h-full w-full object-cover opacity-40"
              src="/weavers/cinemagraph.mp4"
              muted
              loop
              playsInline
              onError={() => setVideoOk(false)}
            />
          )}
          {/* warp threads */}
          <div className="pointer-events-none absolute inset-0 opacity-20">
            {Array.from({ length: 22 }).map((_, i) => (
              <span
                key={i}
                className="absolute top-0 h-full w-px bg-gradient-to-b from-transparent via-gold/50 to-transparent"
                style={{ left: `${(i / 22) * 100}%` }}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(5,5,10,0.7)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-void/80 max-md:bg-gradient-to-b" />

          <div className="absolute bottom-6 left-6 flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-gold" />
            <p className="text-sm tracking-[0.3em] text-gold-light">
              NOW WEAVING · {story.city.toUpperCase()}
            </p>
          </div>
        </motion.div>

        {/* ---------- the tale ---------- */}
        <div className="relative flex flex-col justify-center overflow-y-auto px-7 py-10 md:px-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <p className="text-xs tracking-[0.4em] text-gold/60 ornament sm:text-sm">
              THE WEAVER&apos;S TALE
            </p>
            <h3 className="mt-3 font-display text-5xl text-gradient-gold sm:text-6xl">
              {story.city}
            </h3>
            <p className="mt-1 text-sm tracking-[0.25em] text-cream/50">
              {story.category.toUpperCase()}
            </p>

            {/* the tale plays on its own — a living equalizer shows it */}
            <div className="mt-7 flex items-center gap-3">
              <div className="flex h-8 items-center gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-gold/60"
                    style={{
                      height: `${20 + Math.abs(Math.sin(i * 0.9)) * 80}%`,
                      animation: `pulse-glow ${0.8 + (i % 5) * 0.12}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs tracking-[0.25em] text-muted">
                NARRATING…
              </span>
            </div>

            {/* narration text */}
            <p className="mt-6 max-w-xl font-display text-2xl italic leading-relaxed text-cream/90 sm:text-[1.7rem]">
              “{story.narration}”
            </p>

            {/* the masterpiece on the loom */}
            <div className="mt-8 flex items-center gap-5">
              <div className="relative h-36 w-26 shrink-0 overflow-hidden rounded-md border border-gold/25 shadow-glow-gold">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${carpet})` }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-space to-transparent" />
              </div>
              <div>
                <p className="text-[11px] tracking-[0.2em] text-muted">
                  ON THE LOOM
                </p>
                <p className="mt-1 text-sm text-cream/80">
                  {story.city} · {story.category}
                </p>
                <a
                  href={`/collection?city=${story.key}`}
                  className="mt-3 inline-block rounded-full border border-gold px-5 py-1.5 text-sm text-gold transition-colors hover:bg-gold hover:text-void"
                >
                  View {story.city} rugs
                </a>
              </div>
            </div>
          </motion.div>

          {/* recorded narration (preferred) + folk-music bed */}
          <audio
            ref={narrationRef}
            src={`/narration/${story.key}.mp3`}
            onEnded={() => musicRef.current?.pause()}
            preload="none"
          />
          <audio ref={musicRef} src={`/music/${story.key}.mp3`} loop preload="none" />
        </div>
      </div>
    </motion.div>
  );
}
