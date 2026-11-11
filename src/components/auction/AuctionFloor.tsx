"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Lock, Users } from "lucide-react";
import type { RoomSnapshot, RoomActivity } from "@/lib/auction/snapshot";
import BidderMedallion from "./BidderMedallion";

/**
 * The auction floor: a table seen in perspective, the auctioneer at its head
 * behind a lit announcement board, and every member who locked a deposit
 * seated around it under their room alias.
 *
 * It is a view of the same snapshot the rest of the room uses — nothing here
 * decides anything. When a bid lands, the seat lights up and a token travels
 * from that chair to the rostrum, so a glance tells you who is in, who is
 * leading, and what just happened.
 */

const money = (v: string | number, cur: string) =>
  `${cur} ${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/** headline for the board, from the newest event the room knows about */
function headline(e: RoomActivity | undefined, snap: RoomSnapshot): { line: string; tone: "gold" | "green" | "red" } {
  const cur = snap.currency;
  const p = e?.payload ?? {};
  const who = e?.mine ? "You" : e?.alias ?? "A member";
  switch (e?.type) {
    case "BID_PLACED":
      return { line: `${who} ${e.mine ? "bid" : "bids"} ${money(String(p.amount ?? snap.currentPrice), cur)}`, tone: e.mine ? "green" : "gold" };
    case "BID_OUTBID":
      return { line: `${who} ${e.mine ? "are" : "is"} outbid`, tone: "red" };
    case "USER_JOINED":
      return { line: `${who} ${e.mine ? "take" : "takes"} a seat`, tone: "gold" };
    case "DEPOSIT_LOCKED":
      return { line: `Deposit of ${money(String(p.amount ?? snap.rules.depositAmount), cur)} lodged`, tone: "gold" };
    case "AUCTION_EXTENDED":
      return { line: `A late bid — ${p.bySec ?? snap.rules.extensionSec} seconds added`, tone: "red" };
    case "AUCTION_STARTED":
      return { line: "Bidding is open", tone: "green" };
    case "AUCTION_ENDED":
      return { line: `Hammer down at ${money(String(p.finalPrice ?? snap.currentPrice), cur)}`, tone: "gold" };
    case "WINNER_SELECTED":
      return { line: `${who} ${e.mine ? "win" : "wins"} the lot`, tone: "green" };
    case "PAYMENT_COMPLETED":
    case "AUCTION_COMPLETED":
      return { line: "Sold — the lot is settled", tone: "green" };
    case "AUCTION_CANCELLED":
      return { line: "The auction is cancelled", tone: "red" };
    case "SETTLEMENT_FAILED":
      return { line: "Unsold — the balance was never received", tone: "red" };
    default:
      break;
  }
  // nothing has happened yet — say where we stand
  if (snap.status === "LIVE") {
    return snap.hasBids
      ? { line: `The bid stands at ${money(snap.currentPrice, cur)}`, tone: "gold" }
      : { line: `Opening at ${money(snap.rules.startingPrice, cur)} — who will start?`, tone: "gold" };
  }
  if (snap.status === "REGISTRATION_OPEN") return { line: "Take your seat — bidding opens shortly", tone: "gold" };
  if (snap.status === "SCHEDULED") return { line: "The room is being prepared", tone: "gold" };
  return { line: "The room is closed", tone: "red" };
}

export default function AuctionFloor({
  snap,
  closingSoon,
}: {
  snap: RoomSnapshot;
  closingSoon: boolean;
}) {
  const seats = snap.seats;
  /**
   * The board announces the loudest thing that just happened. A bid emits
   * BID_PLACED and BID_OUTBID in the same transaction, so the raw newest event
   * is usually the outbid — but "Bidder #G38 bids OMR 1,200" is the
   * announcement, and "You are outbid" only matters to the person it happened
   * to. Deposit lines are covered by the seat appearing, so they are skipped.
   */
  const announced =
    snap.activity.find(
      (e) =>
        !(e.type === "BID_OUTBID" && !e.mine) &&
        e.type !== "DEPOSIT_LOCKED" &&
        e.type !== "AUCTION_SCHEDULED"
    ) ?? snap.activity[0];
  const newest = snap.activity[0];
  const board = headline(announced, snap);

  // a token flies from the bidder's chair to the rostrum on each new bid
  const [fly, setFly] = useState<{ key: number; seat: number; amount: string } | null>(null);
  const lastEventRef = useRef<number>(newest?.id ?? 0);
  useEffect(() => {
    if (!newest || newest.id <= lastEventRef.current) return;
    lastEventRef.current = newest.id;
    const bid = snap.activity.find((e) => e.type === "BID_PLACED");
    if (!bid || bid.id <= newest.id - 3) return; // only for the bid that just landed
    const seat = seats.find((s) => s.alias === bid.alias);
    if (!seat) return;
    setFly({ key: bid.id, seat: seat.seat, amount: String(bid.payload?.amount ?? snap.currentPrice) });
    const t = setTimeout(() => setFly(null), 1400);
    return () => clearTimeout(t);
  }, [newest, seats, snap.activity, snap.currentPrice]);

  /**
   * Chairs sit on the NEAR arc of the table — the far side is the rostrum, so
   * nobody sits with their back to the viewer and nobody lands on the
   * auctioneer. Screen y grows downward, so the near arc is 0°–180° with 90°
   * dead centre at the front. The arc widens as the table fills.
   */
  const seatPos = (i: number, total: number) => {
    const spread = Math.min(140, 30 + total * 20);
    const start = 90 - spread / 2;
    const a = total === 1 ? 90 : start + (i / (total - 1)) * spread;
    const rad = (a * Math.PI) / 180;
    return {
      // percentages of the stage — an ellipse just outside the table's edge
      left: 50 + Math.cos(rad) * 38,
      top: 62 + Math.sin(rad) * 19,
      angle: a,
    };
  };

  return (
    <section className="mt-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.4em] text-gold">THE FLOOR</p>
          <h2 className="mt-1 font-display text-2xl text-silk">The Auction Table</h2>
        </div>
        <p className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-muted">
          <Users className="h-3.5 w-3.5 text-gold" />
          {seats.length} SEATED · DEPOSIT {money(snap.rules.depositAmount, snap.currency)}
        </p>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border bg-[radial-gradient(ellipse_70%_60%_at_50%_20%,rgba(139,30,45,0.28),transparent_70%)] transition-colors duration-500 ${
          closingSoon ? "border-crimson/50" : "border-gold/20"
        }`}
      >
        {/* the hall: a dim vault with a chandelier over the table */}
        <div className="absolute inset-0 bg-[#08060b]" />
        <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_40%_100%_at_50%_0%,rgba(230,198,122,0.16),transparent_70%)]" />

        <div className="relative aspect-[16/10] min-h-[420px] w-full sm:aspect-[16/8]">
          {/* ---------------- announcement board ---------------- */}
          <div className="absolute inset-x-0 top-5 z-20 flex justify-center px-4">
            <div
              className={`w-full max-w-2xl rounded-lg border px-6 py-4 text-center backdrop-blur transition-colors duration-500 ${
                board.tone === "green"
                  ? "border-green-500/50 bg-green-950/50"
                  : board.tone === "red"
                    ? "border-crimson/60 bg-crimson/15"
                    : "border-gold/40 bg-void/70"
              }`}
            >
              <p className="text-[9px] tracking-[0.45em] text-gold/70">ANNOUNCEMENTS</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={announced?.id ?? "idle"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className={`mt-1.5 font-display text-xl sm:text-2xl ${
                    board.tone === "green" ? "text-green-200" : board.tone === "red" ? "text-crimson-light" : "text-gradient-gold"
                  }`}
                >
                  {board.line}
                </motion.p>
              </AnimatePresence>
              <p className="mt-1 text-[9px] tracking-[0.3em] text-muted">
                {snap.hasBids ? `CURRENT ${money(snap.currentPrice, snap.currency)} · NEXT ${money(snap.minNextBid, snap.currency)}` : `OPENS AT ${money(snap.rules.startingPrice, snap.currency)}`}
              </p>
            </div>
          </div>

          {/* ---------------- the auctioneer at the head ---------------- */}
          <div className="absolute left-1/2 top-[34%] z-10 -translate-x-1/2 -translate-y-1/2 text-center">
            <motion.div
              animate={fly ? { rotate: [0, -18, 6, 0] } : {}}
              transition={{ duration: 0.6 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-gradient-to-b from-gold/25 to-void shadow-[0_0_30px_rgba(230,198,122,0.35)]"
            >
              <Gavel className="h-7 w-7 text-gold-light" />
            </motion.div>
            <p className="mt-2 text-[9px] tracking-[0.35em] text-gold/80">AUCTIONEER</p>
            {/* the rostrum */}
            <div className="mx-auto mt-1 h-8 w-24 rounded-t-md border-x border-t border-gold/25 bg-gradient-to-b from-[#2a1c10] to-transparent" />
          </div>

          {/* ---------------- the table ---------------- */}
          <div
            className="absolute left-1/2 top-[62%] h-[32%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-gold/30 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.95)]"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, #6b2231 0%, #4a1622 45%, #2a0d14 100%)",
            }}
          >
            {/* the carpet running down the middle of the table */}
            <div className="absolute inset-[18%] rounded-[50%] border border-gold/25 opacity-70" />
            <div className="absolute inset-[30%] rounded-[50%] border border-gold/15" />
            <div className="absolute inset-x-0 top-[26%] flex justify-center">
              <div className="text-center">
                <p className="text-[9px] tracking-[0.4em] text-gold/60">THE LOT</p>
                <p className="mt-0.5 max-w-[14rem] truncate px-2 font-display text-sm text-cream/80">
                  {snap.artwork.title}
                </p>
              </div>
            </div>
          </div>

          {/* ---------------- the token flying to the rostrum ---------------- */}
          <AnimatePresence>
            {fly && (
              <motion.div
                key={fly.key}
                initial={{
                  left: `${seatPos(fly.seat, seats.length).left}%`,
                  top: `${seatPos(fly.seat, seats.length).top}%`,
                  opacity: 0,
                  scale: 0.6,
                }}
                animate={{ left: "50%", top: "34%", opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 1, 0.9] }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold bg-void/90 px-3 py-1 text-[11px] font-semibold text-gold-light shadow-[0_0_18px_rgba(230,198,122,0.6)]"
              >
                {money(fly.amount, snap.currency)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---------------- the seats ---------------- */}
          {seats.length === 0 && (
            <div className="absolute inset-x-0 bottom-8 text-center">
              <p className="text-sm text-muted">
                No one is seated yet. Lock your deposit to take the first chair.
              </p>
            </div>
          )}
          {seats.map((s) => {
            const pos = seatPos(s.seat, seats.length);
            const released = s.depositStatus !== "LOCKED";
            return (
              <motion.div
                key={s.alias}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: released ? 0.45 : 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
                style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              >
                <div className="relative">
                  <BidderMedallion alias={s.alias} size={56} leading={s.leading} mine={s.mine} />
                  {s.leading && (
                    <motion.span
                      aria-hidden
                      className="absolute -inset-1.5 rounded-full border border-gold"
                      animate={{ opacity: [0.9, 0.2, 0.9], scale: [1, 1.12, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  {released && (
                    <span className="absolute -right-1 -top-1 rounded-full border border-cream/30 bg-void p-0.5" title="deposit released">
                      <Lock className="h-3 w-3 text-muted" />
                    </span>
                  )}
                </div>
                <p className={`mt-1.5 whitespace-nowrap text-[10px] tracking-wider ${s.mine ? "text-gold-light" : "text-cream/70"}`}>
                  {s.mine ? "YOU" : s.alias.replace("Bidder ", "")}
                </p>
                {s.lastBid ? (
                  <p className={`whitespace-nowrap text-[10px] ${s.leading ? "text-gold-light" : "text-muted"}`}>
                    {money(s.lastBid, snap.currency)}
                  </p>
                ) : (
                  <p className="text-[9px] tracking-[0.2em] text-muted">SEATED</p>
                )}
              </motion.div>
            );
          })}

          {/* floor shadow so the chairs feel grounded */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
      </div>
    </section>
  );
}
