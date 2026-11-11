"use client";

import { useEffect, useState } from "react";

export type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** total milliseconds left; negative once the moment has passed */
  ms: number;
  /** the moment is in the past */
  over: boolean;
  /** false until the first client tick — nothing should render before that */
  ready: boolean;
};

const ZERO: Remaining = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  ms: 0,
  over: false,
  ready: false,
};

function split(ms: number): Remaining {
  const t = Math.max(0, ms);
  const s = Math.floor(t / 1000);
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    ms,
    over: ms <= 0,
    ready: true,
  };
}

/**
 * Seconds remaining until an instant, recomputed every second.
 *
 * Timestamps are absolute, so this needs no timezone — two machines counting
 * down to the same instant agree however their clocks are labelled.
 *
 * It deliberately reports nothing until the first tick after mount: the
 * server and the browser would otherwise render different numbers for the
 * same second and React would flag a hydration mismatch.
 */
export function useCountdown(targetIso: string | null): Remaining {
  const [left, setLeft] = useState<Remaining>(ZERO);

  useEffect(() => {
    if (!targetIso) {
      setLeft(ZERO);
      return;
    }
    const target = new Date(targetIso).getTime();
    if (Number.isNaN(target)) {
      setLeft(ZERO);
      return;
    }

    const tick = () => setLeft(split(target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return left;
}
