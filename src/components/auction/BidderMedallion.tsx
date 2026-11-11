"use client";

import { useMemo } from "react";

/**
 * A member's face at the auction table.
 *
 * There are no profile photographs in this product, and the room is
 * deliberately anonymous — everyone appears as "Bidder #G17". So instead of a
 * photo each member gets a woven medallion generated from their alias: the
 * same alias always produces the same motif, a different alias never does, and
 * nothing about the real person is revealed. It is drawn in the house palette
 * so the table looks like a rug, not a chat app.
 */

// deterministic 32-bit hash of the alias — the seed for everything below
function seedOf(alias: string) {
  let h = 2166136261;
  for (let i = 0; i < alias.length; i++) {
    h ^= alias.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** small deterministic PRNG so one alias always yields one motif */
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// the house palette — deep grounds, gold and madder, as in the carpets
const GROUNDS = ["#5c1220", "#1d3a4a", "#2b1d10", "#123028", "#3a1830", "#14213d"];
const FIGURES = ["#e6c67a", "#c9a24b", "#f0e6d2", "#d9a86c", "#cfd8dd", "#b7893c"];
const ACCENTS = ["#8b1e2d", "#3fa8a0", "#a34a24", "#4a7043", "#1d5c78"];

export default function BidderMedallion({
  alias,
  size = 64,
  leading = false,
  mine = false,
  className = "",
}: {
  alias: string;
  size?: number;
  leading?: boolean;
  mine?: boolean;
  className?: string;
}) {
  const art = useMemo(() => {
    const r = rng(seedOf(alias));
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const ground = pick(GROUNDS);
    const figure = pick(FIGURES);
    const accent = pick(ACCENTS);
    const petals = 6 + Math.floor(r() * 5); // 6–10 rays around the centre
    const rotate = r() * 60;
    const innerR = 8 + r() * 4;
    const hasRing = r() > 0.35;
    const cornerDots = r() > 0.5;
    return { ground, figure, accent, petals, rotate, innerR, hasRing, cornerDots };
  }, [alias]);

  // the initials the alias ends in — "Bidder #G17" → "G17"
  const tag = alias.replace(/^.*#/, "");

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size }}
      title={alias}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="rounded-full" aria-label={alias}>
        <defs>
          <clipPath id={`clip-${tag}`}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${tag})`}>
          <rect width="100" height="100" fill={art.ground} />
          {/* woven ground: fine diagonal weft lines */}
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              x1={-20 + i * 12}
              y1={-10}
              x2={10 + i * 12}
              y2={110}
              stroke={art.figure}
              strokeWidth="0.5"
              opacity="0.12"
            />
          ))}
          <g transform={`rotate(${art.rotate} 50 50)`}>
            {/* the medallion's rays */}
            {Array.from({ length: art.petals }).map((_, i) => {
              const a = (i / art.petals) * 360;
              return (
                <g key={i} transform={`rotate(${a} 50 50)`}>
                  <path
                    d="M50 20 Q56 33 50 42 Q44 33 50 20 Z"
                    fill={art.figure}
                    opacity="0.9"
                  />
                  <circle cx="50" cy="17" r="2.4" fill={art.accent} />
                </g>
              );
            })}
            {/* the centre */}
            <circle cx="50" cy="50" r={art.innerR + 5} fill={art.accent} opacity="0.55" />
            <circle cx="50" cy="50" r={art.innerR} fill={art.figure} />
            <circle cx="50" cy="50" r={art.innerR / 2.4} fill={art.ground} />
          </g>
          {art.hasRing && (
            <circle cx="50" cy="50" r="42" fill="none" stroke={art.figure} strokeWidth="1.4" opacity="0.5" />
          )}
          {art.cornerDots &&
            [
              [14, 14], [86, 14], [14, 86], [86, 86],
            ].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill={art.figure} opacity="0.7" />)}
        </g>
      </svg>

      {/* the frame: gold for the leader, brighter for you */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-full ring-2 transition-all duration-500 ${
          leading
            ? "ring-gold shadow-[0_0_22px_rgba(230,198,122,0.75)]"
            : mine
              ? "ring-gold-light/70"
              : "ring-gold/25"
        }`}
      />
    </span>
  );
}
