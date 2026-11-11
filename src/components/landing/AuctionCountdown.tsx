"use client";

import { motion } from "framer-motion";
import { useCountdown } from "@/lib/use-countdown";

const pad = (n: number) => String(n).padStart(2, "0");

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="min-w-[3.2rem] rounded-lg border border-gold/25 bg-surface/60 px-3 py-2.5 font-display text-2xl tabular-nums text-gold-light sm:min-w-[4rem] sm:text-3xl">
        {value}
      </span>
      <span className="mt-2 text-[9px] tracking-[0.25em] text-muted">
        {label}
      </span>
    </div>
  );
}

/**
 * How long until the hammer — live, ticking every second.
 *
 * Renders nothing until the countdown has had its first client tick, so the
 * server never ships a number that is already stale by the time it is read.
 */
export default function AuctionCountdown({
  startAt,
  className = "",
}: {
  startAt: string | null;
  className?: string;
}) {
  const left = useCountdown(startAt);

  if (!startAt || !left.ready) return null;

  if (left.over) {
    return (
      <p
        className={`text-xs tracking-[0.3em] text-crimson-light ornament ${className}`}
      >
        THE SALE HAS BEGUN
      </p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      aria-label={`${left.days} days, ${left.hours} hours, ${left.minutes} minutes until the auction`}
    >
      <p className="text-[10px] tracking-[0.3em] text-gold/60">
        THE HAMMER FALLS IN
      </p>
      <div className="mt-4 flex items-start justify-center gap-3 sm:gap-4">
        <Cell value={String(left.days)} label="DAYS" />
        <Cell value={pad(left.hours)} label="HOURS" />
        <Cell value={pad(left.minutes)} label="MINUTES" />
        <Cell value={pad(left.seconds)} label="SECONDS" />
      </div>
    </motion.div>
  );
}
