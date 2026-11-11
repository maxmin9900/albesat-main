"use client";

import { motion } from "framer-motion";
import AuctionCountdown from "./AuctionCountdown";
import type { Invitation } from "@/lib/auction/invitation";
import {
  sessionDateLong,
  sessionTime,
  viewingWindow,
} from "@/lib/auction/invitation";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 px-6 py-4">
      <span className="min-w-[7.5rem] whitespace-nowrap pt-0.5 text-[10px] tracking-[0.15em] text-gold">
        {label}:
      </span>
      <span className="text-sm text-cream/85">{value}</span>
    </div>
  );
}

/**
 * The invitation, over the gavel.
 *
 * Follows the client's approved design: the photograph is dimmed and pushed
 * behind a radial vignette so the centre of the frame stays readable, and
 * the sale's particulars sit in a bordered card rather than loose on the
 * page. Everything below the title is optional — a session with nothing
 * recorded shows just its name and date.
 */
export default function AuctionInvitation({
  invitation,
  onReserve,
  onBrowse,
}: {
  invitation: Invitation;
  onReserve: () => void;
  onBrowse?: () => void;
}) {
  const date = sessionDateLong(invitation.startAt);
  const begins = sessionTime(invitation.startAt);
  const viewing = viewingWindow(invitation.viewingFrom, invitation.viewingTo);

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease: EASE, delay },
  });

  return (
    <div className="relative overflow-hidden px-6 pb-20 pt-36 sm:pb-24">
      {/* ——— the gavel ——— */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/auction/gavel.jpg"
          alt=""
          className="h-full w-full object-cover object-center brightness-[0.38]"
          draggable={false}
        />
        {/* a vignette pulls the eye into the middle of the frame */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,transparent_0%,rgba(0,0,0,0.55)_70%,rgba(0,0,0,0.85)_100%)]" />
        {/* and the bottom fades into the page it sits on */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-void" />
      </div>

      <div className="relative text-center">
        <motion.p
          {...fade(0)}
          className="text-sm tracking-[0.4em] text-gold/70 ornament"
        >
          ROYAL AUCTION
        </motion.p>

        <motion.h1
          {...fade(0.1)}
          className="mx-auto mt-6 max-w-3xl font-display text-3xl font-light leading-[1.15] text-silk drop-shadow-[0_2px_24px_rgba(0,0,0,0.9)] sm:text-5xl"
        >
          {invitation.title}
        </motion.h1>

        {date && (
          <motion.p
            {...fade(0.2)}
            className="mt-6 text-[11px] font-medium tracking-[0.3em] text-gold-light sm:text-xs"
          >
            {date.toUpperCase()}
          </motion.p>
        )}

        {invitation.venueAddress && (
          <motion.p {...fade(0.28)} className="mt-2 text-sm text-cream/70">
            {invitation.venueAddress}
          </motion.p>
        )}

        <AuctionCountdown startAt={invitation.startAt} className="mt-10" />

        {invitation.intro && (
          <motion.p
            {...fade(0.36)}
            className="mx-auto mt-10 max-w-xl text-sm leading-relaxed text-cream/70"
          >
            {invitation.intro} Seating is limited — you are welcome to reserve
            a seat in advance, and one accompanying guest may be added.
          </motion.p>
        )}

        {(viewing || begins || invitation.venueHall) && (
          <motion.div
            {...fade(0.44)}
            className="mx-auto mt-10 w-full max-w-md divide-y divide-gold/10 rounded border border-gold/15 bg-black/45 text-left backdrop-blur-sm"
          >
            <Row label="Viewing" value={viewing} />
            <Row label="Auction Begins" value={begins} />
            <Row label="Venue" value={invitation.venueHall} />
          </motion.div>
        )}

        <motion.div
          {...fade(0.52)}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <button
            type="button"
            onClick={onReserve}
            className="btn-gold-shimmer w-full rounded-full border border-gold bg-gold px-9 py-3.5 text-[11px] font-medium tracking-[0.25em] text-void transition-all hover:brightness-110 active:scale-95 sm:w-auto"
          >
            RESERVE A SEAT
          </button>
          {onBrowse && (
            <button
              type="button"
              onClick={onBrowse}
              className="w-full rounded-full border border-gold/40 px-9 py-3.5 text-[11px] font-medium tracking-[0.25em] text-gold-light transition-colors hover:bg-white/5 active:scale-95 sm:w-auto"
            >
              VIEW CATALOGUE
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
