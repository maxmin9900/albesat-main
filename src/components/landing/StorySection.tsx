"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause } from "lucide-react";

const STORY = `This is Kashan — where the hands of Fatemeh, a woman of sixty who gave her eyes to this warp and weft, tied each knot to the whisper of an ancient poem. The rhythm of the loom is the rhythm of her breath; and every colour, a memory of a garden that never fades.`;

export default function StorySection({
  audioSrc,
  weaverImage = "/carpets/kashan.jpg",
}: {
  audioSrc?: string;
  weaverImage?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(Boolean(audioSrc));

  useEffect(() => {
    setAvailable(Boolean(audioSrc));
  }, [audioSrc]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el || !audioSrc) {
      setPlaying((p) => !p);
      return;
    }
    try {
      if (el.paused) {
        await el.play();
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
    } catch {
      setAvailable(false);
      setPlaying((p) => !p);
    }
  };

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-space">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        {/* Cinemagraph — the loom */}
        <div className="relative h-[50vh] overflow-hidden md:h-auto">
          <motion.div
            initial={{ scale: 1.15 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 12, ease: "easeOut" }}
            viewport={{ once: false }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${weaverImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-space via-space/30 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(5,5,10,0.7)_100%)]" />
          {/* animated loom threads */}
          <div className="pointer-events-none absolute inset-0 opacity-30">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="absolute top-0 h-full w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent"
                style={{ left: `${(i / 14) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Story text + audio */}
        <div className="flex flex-col justify-center px-8 py-16 md:px-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            viewport={{ once: true }}
          >
            <p className="text-sm tracking-[0.4em] text-gold/60 ornament">
              THE WEAVER&apos;S TALE
            </p>
            <h2 className="mt-4 font-display text-4xl text-silk sm:text-5xl">
              Hands That Weave the Stars
            </h2>

            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={toggle}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-gold bg-gold/10 text-gold transition-all hover:bg-gold hover:text-void"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 translate-x-0.5" />
                )}
              </button>

              <div className="flex h-10 items-center gap-1">
                {Array.from({ length: 28 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-gold/60"
                    style={{
                      height: playing
                        ? `${20 + Math.abs(Math.sin(i * 0.9)) * 80}%`
                        : "20%",
                      transition: "height .3s ease",
                      animation: playing
                        ? `pulse-glow ${0.8 + (i % 5) * 0.12}s ease-in-out infinite`
                        : "none",
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted">
                {available
                  ? playing
                    ? "Narrating…"
                    : "Play the story"
                  : "Audio narration (demo)"}
              </span>
            </div>

            <p className="mt-8 max-w-lg text-lg leading-loose text-cream/85">
              {STORY}
            </p>

            {audioSrc && (
              <audio
                ref={audioRef}
                src={audioSrc}
                onEnded={() => setPlaying(false)}
                preload="none"
              />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
