"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import { scrollToTarget } from "@/lib/lenis-instance";

const CosmicScene = dynamic(() => import("./cosmic/CosmicScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-void" />,
});

export default function CosmicHero() {
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
  });

  const titleOpacity = useTransform(scrollYProgress, [0, 0.16, 0.3], [1, 1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.3], [0, -48]);

  const phraseOpacity = useTransform(
    scrollYProgress,
    [0.34, 0.48, 0.62, 0.72],
    [0, 1, 1, 0]
  );
  const cueOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  // "IRAN" caption fades in once the globe has turned to face Iran, then
  // slips away as the satellite view dissolves into the illustrated atlas.
  const labelOpacity = useTransform(
    scrollYProgress,
    [0.8, 0.9, 0.96, 1],
    [0, 1, 1, 0]
  );
  const labelY = useTransform(scrollYProgress, [0.82, 1], [20, 0]);

  // One continuous shot: as Iran fills the frame, the whole 3D scene
  // cross-dissolves into the illustrated atlas map already pinned beneath
  // this section (IranMap overlaps us via a negative margin) — no black
  // frame, no gap, the camera simply keeps flying in.
  const sceneOpacity = useTransform(scrollYProgress, [0.86, 0.985], [1, 0]);

  // once the scene has dissolved, let clicks fall through to the map below
  const stickyPointerEvents = useTransform(scrollYProgress, (v) =>
    v > 0.9 ? ("none" as const) : ("auto" as const)
  );

  // the woven backdrop drifts closer as the journey begins — a slow push-in
  // on top of the carpet's own continuous sway
  const backdropScale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);

  const explore = () => {
    const el = trackRef.current;
    if (!el) return;
    // land exactly where the dissolve completes and the atlas map is revealed
    const to = el.offsetTop + el.offsetHeight - window.innerHeight;
    scrollToTarget(to, { duration: 2.4 });
  };

  return (
    <section ref={trackRef} className="relative z-10 h-[420vh]">
      <motion.div
        style={{ pointerEvents: stickyPointerEvents }}
        className="sticky top-0 h-screen w-full overflow-hidden"
      >
        {/* the whole hero dissolves in place, revealing the atlas map pinned
            beneath — the hand-off reads as one camera shot */}
        <motion.div style={{ opacity: sceneOpacity }} className="absolute inset-0">
          {/* the loom & carpet the globe now floats over */}
          <motion.div
            style={{ scale: backdropScale }}
            className="absolute inset-0 overflow-hidden"
          >
            <img
              src="/landing-hero.jpg"
              alt=""
              aria-hidden
              draggable={false}
              /* phones crop to a tall, narrow slice — aim it at the lit part
                 of the weave so the carpet still reads richly */
              className="hero-carpet h-full w-full object-cover object-[62%_62%] md:object-center"
            />
          </motion.div>

          {/* candle-warm light breathing across the silk */}
          <div className="hero-carpet-glow pointer-events-none absolute inset-0" />

          {/* light scrim — only enough to keep the headline legible; the
              carpet itself stays clearly visible */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,10,0.7)_0%,rgba(5,5,10,0.34)_30%,rgba(5,5,10,0.1)_58%,rgba(5,5,10,0.3)_100%)]" />

          <CosmicScene progressRef={progressRef} />
        </motion.div>

        {/* Hero title — kept in the upper third so it never sits on Earth */}
        <motion.div
          style={{ opacity: titleOpacity, y: titleY }}
          className="absolute inset-x-0 top-0 flex flex-col items-center px-6 pt-[13vh] text-center"
        >
          {/* soft readability pool behind the text — light enough that the
              woven backdrop still reads through it */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] bg-[radial-gradient(ellipse_55%_45%_at_50%_28%,rgba(5,5,10,0.55),transparent_72%)]" />

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="relative mb-5 text-xs tracking-[0.5em] text-gold-light/80 ornament sm:text-sm"
          >
            ALBESAT
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
            className="relative font-display text-5xl leading-[1.05] text-silk drop-shadow-[0_2px_30px_rgba(0,0,0,0.9)] sm:text-7xl md:text-8xl"
          >
            Fine Persian Carpets.
            <br />
            <span className="text-gradient-gold-animated drop-shadow-[0_0_25px_rgba(201,162,75,0.35)]">
              Expertly Chosen. Carefully Preserved.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.7 }}
            className="relative mt-7 max-w-2xl text-base text-cream/85 sm:text-lg"
          >
            At Albesat Carpet, we help you choose, care for, restore, and
            preserve fine Persian and handmade carpets — guided by decades of
            carpet experience in Oman and beyond.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 1 }}
            className="relative mt-9 flex flex-wrap items-center justify-center gap-4"
          >
            <button
              type="button"
              onClick={explore}
              className="btn-gold-shimmer rounded-full border border-gold/60 bg-gold/5 px-9 py-3 text-sm tracking-widest text-gold-light backdrop-blur-sm hover:bg-gold hover:text-void"
            >
              EXPLORE OUR CARPETS
            </button>
            <a
              href="/services"
              className="rounded-full border border-gold/35 px-9 py-3 text-sm tracking-widest text-cream/85 backdrop-blur-sm transition-colors hover:border-gold hover:text-gold-light"
            >
              OUR SERVICES
            </a>
          </motion.div>
        </motion.div>

        {/* mid-dive phrase */}
        <motion.div
          style={{ opacity: phraseOpacity }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center"
        >
          <p className="font-display text-3xl text-gold-light drop-shadow-[0_2px_20px_rgba(0,0,0,0.9)] sm:text-5xl">
            Descending through the cosmos…
            <br />
            <span className="text-silk/85">toward the looms of Persia.</span>
          </p>
        </motion.div>

        {/* Arrival caption — the real globe has turned to show Iran */}
        <motion.div
          style={{ opacity: labelOpacity, y: labelY }}
          className="pointer-events-none absolute inset-x-0 bottom-[16vh] flex flex-col items-center px-6 text-center"
        >
          <p className="text-xs tracking-[0.5em] text-gold/70">ARRIVING AT</p>
          <p className="mt-2 font-display text-5xl tracking-[0.35em] text-gold-light drop-shadow-[0_2px_20px_rgba(0,0,0,0.9)]">
            IRAN
          </p>
        </motion.div>

        {/* scroll cue */}
        <motion.div
          style={{ opacity: cueOpacity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs tracking-[0.35em] text-gold/60">SCROLL</span>
          <span className="block h-10 w-px animate-pulse-glow bg-gradient-to-b from-gold to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}
