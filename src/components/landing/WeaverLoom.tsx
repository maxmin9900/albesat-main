"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause } from "lucide-react";

type Weaver = {
  key: string;
  city: string;
  category: string;
  /** photo of a local weaver at her loom */
  photo: string;
  /** cinematic, per-city narration read aloud */
  narration: string;
};

const WEAVERS: Weaver[] = [
  {
    key: "kashan",
    city: "Kashan",
    category: "Floral Garden",
    photo: "/weavers/kashan.jpg",
    narration:
      "Here is Kashan. Here, the hands of Lila — a twenty-five-year-old girl whose dreams are still softer than silk — tie every knot like a promise to a future she has just begun to imagine.",
  },
  {
    key: "tabriz",
    city: "Tabriz",
    category: "Lacquer Medallion",
    photo: "/weavers/loom.jpg",
    narration:
      "Here is Tabriz. Here, the hands of Soraya — shaped by Azeri melodies — tie every knot like echoes of ancient caravans.",
  },
  {
    key: "mashhad",
    city: "Mashhad",
    category: "Khorasan Floral",
    photo: "/weavers/mashhad.jpg",
    narration:
      "Here is Mashhad. Here, the hands of Maryam and her daughter Hana — bound together by faith and love — weave every knot like a shared prayer under the golden dome.",
  },
  {
    key: "shiraz",
    city: "Shiraz",
    category: "Qashqai Tribal",
    photo: "/weavers/shiraz.jpg",
    narration:
      "Here is Shiraz. Here, the hands of Shirin and Neda — among roses and poetry — weave every knot like verses of Hafez.",
  },
  {
    key: "qom",
    city: "Qom",
    category: "Pure Silk",
    photo: "/weavers/loom2.jpg",
    narration:
      "Here is Qom. Here, the hands of Hassan — an eighty-year-old man whose life has become one long prayer — tie every knot as if each thread were a verse of silence.",
  },
  {
    key: "sistan",
    city: "Sistan",
    category: "Baluch Geometric",
    photo: "/weavers/sistan.jpg",
    narration:
      "Here is Sistan. Here, the hands of Aylin — a twenty-year-old girl whose gaze is as endless as the desert — tie every knot like fragile hope for tomorrow.",
  },
];

export default function WeaverLoom({
  images = {},
}: {
  images?: Record<string, string | undefined>;
}) {
  const [idx, setIdx] = useState(0);
  const active = WEAVERS[idx];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  // per-city weaving clips: /weavers/<key>.mp4 — falls back to the photo
  const [videoFailed, setVideoFailed] = useState<Record<string, boolean>>({});
  const vidRef = useRef<HTMLVideoElement>(null);
  const narrationRef = useRef<HTMLAudioElement>(null);

  // per-city local folk-music bed: /music/<key>.mp3
  const track = `/music/${active.key}.mp3`;

  // cinematic per-city narration — spoken live by the browser's speech engine
  const narration = active.narration;

  useEffect(() => {
    setPlaying(false);
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    narrationRef.current?.pause();
    audioRef.current?.pause();
  }, [idx]);

  // loop the weaving cinemagraph behind the photo (one shared clip)
  useEffect(() => {
    const v = vidRef.current;
    if (!v) return;
    v.play().catch(() => setVideoFailed((s) => ({ ...s, cinemagraph: true })));
  }, []);

  // fallback: speak the tale live with the most human voice available
  const speakTTS = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(narration);
    u.lang = "en-US";
    u.rate = 0.92;
    u.pitch = 0.92;
    const voices = synth.getVoices();
    // prefer neural / natural / online voices — they sound human
    const pick =
      voices.find((v) => /^en/i.test(v.lang) && /(natural|neural)/i.test(v.name)) ||
      voices.find((v) => /^en/i.test(v.lang) && /online/i.test(v.name)) ||
      voices.find((v) => /^en/i.test(v.lang) && /google/i.test(v.name)) ||
      voices.find((v) => /^en[-_]?(US|GB)/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang));
    if (pick) u.voice = pick;
    u.onend = () => setPlaying(false);
    synth.speak(u);
  };

  const stopAll = () => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    narrationRef.current?.pause();
    audioRef.current?.pause();
  };

  const toggle = async () => {
    if (playing) {
      stopAll();
      setPlaying(false);
      return;
    }
    setPlaying(true);

    // 1) prefer a professionally recorded narration file, if present
    const nar = narrationRef.current;
    let recorded = false;
    if (nar) {
      try {
        nar.currentTime = 0;
        await nar.play();
        recorded = true;
      } catch {
        recorded = false;
      }
    }
    // 2) otherwise speak it live with the best voice available
    if (!recorded) speakTTS();

    // 3) soft local-folk-music bed underneath (if a track file exists)
    const music = audioRef.current;
    if (music) {
      music.volume = 0.3;
      music.currentTime = 0;
      music.play().catch(() => {});
    }
  };

  const carpet = images[active.key] ?? `/carpets/${active.key}.jpg`;

  return (
    <section
      id="weaver"
      className="relative min-h-screen w-full overflow-hidden bg-space"
    >
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        {/* ---------- Weaver photo + animated layers ---------- */}
        <div className="relative h-[55vh] overflow-hidden md:h-auto">
          {/* per-city weaver photo with slow Ken-Burns on each switch */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={active.key}
              initial={{ scale: 1.16, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.8 },
                scale: { duration: 16, ease: "easeOut" },
              }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${active.photo})` }}
            />
          </AnimatePresence>

          {/* looping weaving cinemagraph, blended subtly over the photo */}
          {!videoFailed.cinemagraph && (
            <video
              ref={vidRef}
              className="absolute inset-0 h-full w-full object-cover opacity-40"
              src="/weavers/cinemagraph.mp4"
              muted
              loop
              playsInline
              onError={() =>
                setVideoFailed((v) => ({ ...v, cinemagraph: true }))
              }
            />
          )}


          {/* animated warp threads */}
          <div className="pointer-events-none absolute inset-0 opacity-25">
            {Array.from({ length: 22 }).map((_, i) => (
              <span
                key={i}
                className="absolute top-0 h-full w-px bg-gradient-to-b from-transparent via-gold/50 to-transparent"
                style={{ left: `${(i / 22) * 100}%` }}
              />
            ))}
          </div>

          {/* drifting gold dust */}
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-gold/70 animate-float-slow"
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 53) % 100}%`,
                  animationDelay: `${(i % 6) * 0.7}s`,
                }}
              />
            ))}
          </div>

          {/* vignette + bottom caption */}
          <div className="absolute inset-0 bg-gradient-to-t from-space via-transparent to-space/30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(5,5,10,0.65)_100%)]" />

          <AnimatePresence mode="wait">
            <motion.div
              key={active.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="absolute bottom-6 left-6 flex items-center gap-3"
            >
              <span className="h-2 w-2 animate-pulse-glow rounded-full bg-gold" />
              <p className="text-sm tracking-[0.3em] text-gold-light">
                NOW WEAVING · {active.city.toUpperCase()}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---------- Content ---------- */}
        <div className="flex flex-col justify-center px-8 py-16 md:px-16">
          <p className="text-sm tracking-[0.4em] text-gold/60 ornament">
            THE WEAVER&apos;S TALE
          </p>
          <h2 className="mt-4 font-display text-4xl text-silk sm:text-5xl">
            Hands That Weave the Stars
          </h2>
          <p className="mt-3 max-w-md text-sm text-cream/60">
            Choose a city — watch the weaver take on its traditional palette and
            the masterpiece rising on her loom.
          </p>

          {/* city selector */}
          <div className="mt-6 flex flex-wrap gap-2">
            {WEAVERS.map((w, i) => (
              <button
                key={w.key}
                onClick={() => setIdx(i)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-all ${
                  i === idx
                    ? "border-gold bg-gold text-void"
                    : "border-gold/30 text-cream/80 hover:border-gold hover:text-gold-light"
                }`}
              >
                {w.city}
              </button>
            ))}
          </div>

          {/* audio + narration + on-the-loom carpet */}
          <div className="mt-8 flex items-start gap-5">
            {/* the rug rising on the loom */}
            <div className="shrink-0">
              <div className="relative h-40 w-28 overflow-hidden rounded-md border border-gold/25 shadow-glow-gold">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${carpet})` }}
                  />
                </AnimatePresence>
                {/* unwoven warp at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-space to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-10 opacity-60">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <span
                      key={i}
                      className="absolute bottom-0 h-10 w-px bg-cream/40"
                      style={{ left: `${(i / 14) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted">
                On the loom
                <br />
                {active.city} · {active.category}
              </p>
            </div>

            <div className="flex-1">
              {/* audio player */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggle}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-gold bg-gold/10 text-gold transition-all hover:bg-gold hover:text-void"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 translate-x-0.5" />
                  )}
                </button>
                <div className="flex h-8 items-center gap-1">
                  {Array.from({ length: 22 }).map((_, i) => (
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
                  {playing ? "Narrating…" : "Play the story"}
                </span>
              </div>

              {/* narration */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={active.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5 }}
                  className="mt-5 font-display text-2xl italic leading-relaxed text-cream/90"
                >
                  “{narration}”
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* professionally-recorded narration (preferred over live TTS) */}
          <audio
            key={`nar-${active.key}`}
            ref={narrationRef}
            src={`/narration/${active.key}.mp3`}
            onEnded={() => {
              audioRef.current?.pause();
              setPlaying(false);
            }}
            preload="none"
          />
          {/* local folk-music bed */}
          <audio
            key={active.key}
            ref={audioRef}
            src={track}
            loop
            preload="none"
          />
          <p className="mt-4 text-[11px] text-muted">
            ◈ A documentary-style voice narrates the tale · {active.city} folk
            music beneath
          </p>
        </div>
      </div>
    </section>
  );
}
