"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, ShieldCheck, Lock, Timer, Users, Wallet, ChevronRight, X,
  Activity, LogIn, TrendingDown, Clock, Hammer, Trophy, CreditCard,
  Unlock, Ban, Play, CalendarClock, CircleSlash,
} from "lucide-react";
import type { RoomSnapshot, RoomActivity } from "@/lib/auction/snapshot";
import { joinAuctionAction, placeBidAction, payBalanceAction } from "@/app/auctions/[id]/actions";
import { CONTACT } from "@/lib/contact";
import { signOutUser } from "@/app/(site-auth)/actions";
import AuctionFloor from "./AuctionFloor";
import { Zoomable } from "@/components/ui/Lightbox";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

type StreamEvent = {
  id: number;
  type: string;
  userId: string | null;
  payload: Record<string, unknown> | null;
  at: string;
};

const money = (v: string | number, cur: string) =>
  `${cur} ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  REGISTRATION_OPEN: "REGISTRATION OPEN",
  LIVE: "LIVE",
  ENDED: "HAMMER DOWN",
  PAYMENT_PENDING: "AWAITING PAYMENT",
  COMPLETED: "SOLD",
  CANCELLED: "CANCELLED",
  SETTLEMENT_FAILED: "UNSOLD",
};

/** countdown to an ISO time, corrected by the server clock offset */
function useCountdown(targetIso: string | null, offsetMs: number) {
  const calc = useCallback(
    () => (targetIso ? new Date(targetIso).getTime() - (Date.now() + offsetMs) : 0),
    [targetIso, offsetMs]
  );
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    const t = setInterval(() => setLeft(calc()), 250);
    return () => clearInterval(t);
  }, [calc]);
  const s = Math.max(0, Math.floor(left / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    ms: left,
    over: left <= 0,
    hh: pad(Math.floor(s / 3600)),
    mm: pad(Math.floor((s % 3600) / 60)),
    ss: pad(s % 60),
    seconds: s,
  };
}

function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 5) return "JUST NOW";
  if (sec < 60) return `${sec}S AGO`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} MIN AGO`;
  return `${Math.floor(m / 60)}H AGO`;
}

/**
 * Why a member cannot take a seat right now. "Not accepting new participants"
 * reads like the room is full; it never is — the auction has simply not opened
 * yet, or it is over. Say which.
 */
function closedReason(snap: RoomSnapshot): string {
  switch (snap.status) {
    case "DRAFT":
      return "This auction has not been published yet.";
    case "SCHEDULED":
      return "Registration has not opened yet — come back when the room opens.";
    case "ENDED":
      return "Bidding has closed. The winning bid is being settled.";
    case "PAYMENT_PENDING":
      return "Bidding has closed — the winner is settling the balance.";
    case "COMPLETED":
      return "This auction is over. The lot has been sold.";
    case "CANCELLED":
      return "This auction was cancelled. Every deposit has been released.";
    case "SETTLEMENT_FAILED":
      return "This auction is over. The lot went unsold — the balance was never paid.";
    default:
      // LIVE but past its end: the sweeper is about to close it
      return "Bidding has closed on this lot.";
  }
}

/**
 * One activity line, rendered from the event the server recorded. Every rule
 * and number comes from the payload the service wrote — the room only phrases
 * it. `me` lets a member see themselves as "You".
 */
function describe(
  e: RoomActivity,
  cur: string
): { icon: typeof Gavel; text: string; tone: "gold" | "green" | "red" | "muted" } | null {
  const p = e.payload ?? {};
  const who = e.mine ? "You" : e.alias ?? "A member";
  const amt = (k = "amount") => (p[k] != null ? money(String(p[k]), cur) : "");

  switch (e.type) {
    case "AUCTION_CREATED":
      return { icon: CalendarClock, text: `Auction created — opening at ${amt("startingPrice")}`, tone: "muted" };
    case "AUCTION_SCHEDULED":
      return { icon: CalendarClock, text: "Scheduled", tone: "muted" };
    case "REGISTRATION_OPENED":
      return { icon: LogIn, text: "Registration opened — members may lock their deposit", tone: "gold" };
    case "AUCTION_STARTED":
      return { icon: Play, text: "Bidding opened", tone: "green" };
    case "USER_JOINED":
      return { icon: LogIn, text: `${who} joined the room`, tone: e.mine ? "green" : "gold" };
    case "DEPOSIT_LOCKED":
      return { icon: Lock, text: `${who} locked a deposit of ${amt()}`, tone: "muted" };
    case "BID_PLACED":
      return { icon: Gavel, text: `${who} bid ${amt()}${p.sequence ? ` · #${p.sequence}` : ""}`, tone: e.mine ? "green" : "gold" };
    case "BID_REJECTED":
      return { icon: CircleSlash, text: `Your bid of ${amt()} was rejected — ${String(p.reason ?? "")}`, tone: "red" };
    case "BID_OUTBID":
      return { icon: TrendingDown, text: `${who} ${e.mine ? "were" : "was"} outbid${p.by ? ` at ${money(String(p.by), cur)}` : ""}`, tone: e.mine ? "red" : "muted" };
    case "AUCTION_EXTENDED":
      return { icon: Clock, text: `Extended by ${p.bySec ?? "?"}s — a bid landed in the closing seconds`, tone: "red" };
    case "AUCTION_ENDED":
      return { icon: Hammer, text: `Hammer down at ${amt("finalPrice")}`, tone: "gold" };
    case "WINNER_SELECTED":
      return { icon: Trophy, text: `${who} won at ${amt()}`, tone: e.mine ? "green" : "gold" };
    case "PAYMENT_STARTED":
      return { icon: CreditCard, text: "Payment window opened for the winner", tone: "muted" };
    case "PAYMENT_COMPLETED":
      return { icon: CreditCard, text: `Balance paid${p.paid ? ` — ${money(String(p.paid), cur)}` : ""}`, tone: "green" };
    case "PAYMENT_FAILED":
      return { icon: CircleSlash, text: "The payment window closed with no balance received", tone: "red" };
    case "DEPOSIT_RELEASED":
      return { icon: Unlock, text: `${who} had ${e.mine ? "your" : "their"} deposit of ${amt()} released`, tone: "muted" };
    case "DEPOSIT_APPLIED":
      return { icon: ShieldCheck, text: `${who} had ${amt()} applied to the purchase`, tone: "green" };
    case "DEPOSIT_FORFEITED":
      return { icon: Ban, text: `${who} forfeited a deposit of ${amt()}`, tone: "red" };
    case "AUCTION_COMPLETED":
      return { icon: Trophy, text: "Sold — the lot is settled", tone: "green" };
    case "AUCTION_CANCELLED":
      return { icon: Ban, text: `Auction cancelled${p.reason ? ` — ${String(p.reason)}` : ""} · every deposit released`, tone: "red" };
    case "SETTLEMENT_FAILED":
      return { icon: Ban, text: "Unsold — the balance was never received", tone: "red" };
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  the room                                                           */
/* ------------------------------------------------------------------ */

export default function AuctionRoom({
  initial,
  viewerName,
}: {
  initial: RoomSnapshot;
  viewerName: string | null;
}) {
  const [snap, setSnap] = useState<RoomSnapshot>(initial);
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: "gold" | "green" | "red" }[]>([]);
  const [live, setLive] = useState<"connecting" | "live" | "polling">("connecting");
  const viewerIdRef = useRef<string | null>(null);

  // server clock offset so the countdown does not depend on the visitor's clock
  const offsetMs = useMemo(
    () => new Date(snap.serverNow).getTime() - Date.now(),
    [snap.serverNow]
  );

  const toast = useCallback((text: string, tone: "gold" | "green" | "red" = "gold") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  // in-room notifications derived from the event feed
  const notify = useCallback(
    (events: StreamEvent[], next: RoomSnapshot) => {
      const mine = (e: StreamEvent) => next.viewer.signedIn && e.userId !== null && e.userId === viewerIdRef.current;
      for (const e of events) {
        switch (e.type) {
          case "USER_JOINED":
            if (mine(e)) toast("You joined the auction. Your deposit is locked.", "green");
            break;
          case "BID_OUTBID":
            if (mine(e)) toast(`You have been outbid — new price ${money(String(e.payload?.by ?? next.currentPrice), next.currency)}.`, "red");
            break;
          case "AUCTION_EXTENDED":
            toast(`Auction extended by ${e.payload?.bySec ?? next.rules.extensionSec}s due to a late bid.`);
            break;
          case "AUCTION_STARTED":
            toast("Bidding is now open.", "green");
            break;
          case "AUCTION_ENDED":
            toast("The hammer has fallen.");
            break;
          case "WINNER_SELECTED":
            if (mine(e)) toast("Congratulations — you won the auction!", "green");
            break;
          case "DEPOSIT_RELEASED":
            if (mine(e)) toast("Auction ended. Your deposit has been released.");
            break;
          case "PAYMENT_COMPLETED":
            if (mine(e)) toast("Payment received. The piece is yours.", "green");
            break;
          case "SETTLEMENT_FAILED":
            if (mine(e)) toast("The payment window closed before the balance was paid.", "red");
            break;
        }
      }
    },
    [toast]
  );

  // ---- live feed: SSE with a polling fallback ------------------------------
  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let failures = 0;
    let stopped = false;

    const startPolling = () => {
      if (poll) return;
      setLive("polling");
      poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/auctions/${initial.id}/state`, { cache: "no-store" });
          if (r.ok) setSnap(await r.json());
        } catch {
          /* next tick */
        }
      }, 3000);
    };

    const connect = () => {
      if (stopped) return;
      es = new EventSource(`/api/auctions/${initial.id}/stream?since=${initial.lastEventId}`);
      es.addEventListener("hello", (ev) => {
        failures = 0;
        setLive("live");
        const d = JSON.parse((ev as MessageEvent).data);
        if (d.snapshot) setSnap(d.snapshot);
      });
      es.addEventListener("auction", (ev) => {
        const d = JSON.parse((ev as MessageEvent).data) as { events: StreamEvent[]; snapshot: RoomSnapshot };
        if (d.snapshot) {
          setSnap(d.snapshot);
          notify(d.events, d.snapshot);
        }
      });
      es.onerror = () => {
        failures += 1;
        // the browser retries on its own; after a few misses fall back to polling
        if (failures >= 3) {
          es?.close();
          es = null;
          startPolling();
        }
      };
    };
    connect();

    return () => {
      stopped = true;
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [initial.id, initial.lastEventId, notify]);

  useEffect(() => {
    viewerIdRef.current = snap.viewer.uid;
  }, [snap.viewer.uid]);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/auctions/${initial.id}/state`, { cache: "no-store" });
    if (r.ok) setSnap(await r.json());
  }, [initial.id]);

  const end = useCountdown(snap.endAt, offsetMs);
  const start = useCountdown(snap.startAt, offsetMs);
  const pay = useCountdown(snap.paymentDueAt, offsetMs);
  const isLive = snap.status === "LIVE" && !end.over;
  const closingSoon = isLive && end.seconds <= snap.rules.antiSnipingWindowSec;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-28">
      {/* breadcrumb + who this window is signed in as */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-muted">
          <a href="/auctions" className="transition-colors hover:text-gold-light">ROYAL AUCTION</a>
          <ChevronRight className="h-3 w-3" />
          <span className="text-cream/70">{snap.artwork.title.toUpperCase()}</span>
        </nav>

        {/* Two windows on the same host share one cookie, so it is easy to
            think you are two people when you are one. Say plainly who this
            window is. */}
        {snap.viewer.signedIn ? (
          <div className="flex items-center gap-3 rounded-full border border-gold/25 bg-surface/60 py-1 pl-3 pr-1 text-[10px] tracking-[0.2em]">
            <span className="text-muted">SIGNED IN AS</span>
            <span className="text-gold-light">{(viewerName ?? "MEMBER").toUpperCase()}</span>
            {snap.viewer.alias && (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-gold-light">{snap.viewer.alias}</span>
            )}
            <form action={signOutUser}>
              <input type="hidden" name="next" value={`/login?next=/auctions/${snap.id}`} />
              <button
                type="submit"
                className="rounded-full border border-cream/20 px-3 py-1 text-muted transition-colors hover:border-gold hover:text-gold-light"
              >
                SWITCH
              </button>
            </form>
          </div>
        ) : (
          <span className="rounded-full border border-cream/20 px-3 py-1 text-[10px] tracking-[0.2em] text-muted">
            NOT SIGNED IN
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* ------------------------------------------------ left: the lot */}
        <div>
          <Zoomable src={snap.artwork.image} alt={snap.artwork.title} caption={snap.artwork.title} className="relative aspect-[4/5] overflow-hidden rounded-xl border border-gold/15 bg-void shadow-glow-gold">
            <div
              className="absolute inset-0 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${snap.artwork.image})` }}
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
              <StatusPill status={snap.status} pulse={isLive} />
              <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-void/60 px-3 py-1 text-[10px] tracking-[0.25em] text-cream/80 backdrop-blur">
                <Users className="h-3 w-3 text-gold" /> {snap.participantCount} IN ROOM
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void via-void/70 to-transparent p-6">
              <p className="text-[10px] tracking-[0.35em] text-gold">{snap.title.toUpperCase()}</p>
              <h1 className="mt-2 font-display text-3xl text-silk sm:text-4xl">{snap.artwork.title}</h1>
              <p className="mt-1 text-xs tracking-[0.25em] text-cream/60">
                {snap.artwork.city.toUpperCase()} · {snap.artwork.category.toUpperCase()}
              </p>
            </div>
          </Zoomable>

          {/* rules of this lot — the server's numbers, shown as-is */}
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-gold/15 bg-surface/40 p-6 text-xs sm:grid-cols-4">
            <Rule label="STARTING PRICE" value={money(snap.rules.startingPrice, snap.currency)} />
            <Rule label={`DEPOSIT · ${snap.rules.depositPercent}%`} value={money(snap.rules.depositAmount, snap.currency)} />
            <Rule label="MIN INCREMENT" value={`+${snap.rules.bidIncrementPercent}% of current`} />
            <Rule label="MAXIMUM BID" value="Unlimited" />
            <Rule label="LATE-BID EXTENSION" value={`+${snap.rules.extensionSec}s in last ${snap.rules.antiSnipingWindowSec}s`} />
            <Rule label="PAYMENT WINDOW" value={`${snap.rules.paymentDeadlineMin} min`} />
            <Rule label="EXTENDED" value={`${snap.extensionCount}×`} />
            <Rule label="FEED" value={live === "live" ? "LIVE" : live === "polling" ? "POLLING" : "…"} tone={live === "live" ? "green" : undefined} />
          </div>
        </div>

        {/* ------------------------------------------------ right: the action */}
        <div className="space-y-6">
          {/* price + timer */}
          <div className={`rounded-xl border p-7 backdrop-blur transition-colors ${closingSoon ? "border-crimson/60 bg-crimson/10" : "border-gold/25 bg-surface/60"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] tracking-[0.35em] text-muted">
                  {snap.hasBids ? "CURRENT BID" : "OPENING AT"}
                </p>
                <p className="mt-1 font-display text-4xl text-gradient-gold sm:text-5xl">
                  {money(snap.currentPrice, snap.currency)}
                </p>
                {snap.hasBids && (
                  <p className="mt-1 text-[10px] tracking-[0.25em] text-cream/60">
                    {snap.bids.length} BID{snap.bids.length === 1 ? "" : "S"} · LEADING: {snap.bids.find((b) => b.leading)?.alias ?? "—"}
                    {snap.viewer.leading && <span className="ml-2 text-green-300">(YOU)</span>}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-[10px] tracking-[0.35em] text-muted">
                  <Timer className="h-3 w-3" />
                  {snap.status === "LIVE" ? "ENDS IN" : snap.status === "PAYMENT_PENDING" ? "PAY WITHIN" : ["SCHEDULED", "REGISTRATION_OPEN"].includes(snap.status) ? "OPENS IN" : "STATUS"}
                </p>
                <p className={`mt-1 font-mono text-2xl tabular-nums ${closingSoon ? "text-crimson-light" : "text-silk"}`}>
                  {snap.status === "LIVE"
                    ? end.over ? "00:00:00" : `${end.hh}:${end.mm}:${end.ss}`
                    : snap.status === "PAYMENT_PENDING"
                      ? `${pay.hh}:${pay.mm}:${pay.ss}`
                      : ["SCHEDULED", "REGISTRATION_OPEN"].includes(snap.status)
                        ? `${start.hh}:${start.mm}:${start.ss}`
                        : STATUS_LABEL[snap.status]}
                </p>
              </div>
            </div>
          </div>

          {/* the viewer's panel — depends on who they are and where the auction is */}
          {!snap.viewer.signedIn ? (
            <SignInCard snap={snap} />
          ) : snap.viewer.isWinner ? (
            <WinnerCard snap={snap} onDone={refresh} toast={toast} />
          ) : !snap.viewer.joined ? (
            <JoinCard snap={snap} onJoined={refresh} toast={toast} />
          ) : (
            <BidCard snap={snap} isLive={isLive} onBid={refresh} toast={toast} viewerName={viewerName} />
          )}

          {/* wallet */}
          {snap.viewer.signedIn && snap.viewer.wallet && (
            <div className="flex items-center justify-between rounded-xl border border-gold/15 bg-surface/40 px-6 py-4 text-xs">
              <p className="flex items-center gap-2 text-cream/80"><Wallet className="h-4 w-4 text-gold" /> YOUR BALANCE</p>
              <p className="text-right">
                <span className="text-silk">{money(snap.viewer.wallet.available, snap.currency)}</span>
                <span className="ml-3 text-muted">· locked {money(snap.viewer.wallet.locked, snap.currency)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ the floor */}
      <AuctionFloor snap={snap} closingSoon={closingSoon} />

      {/* ------------------------------------------------ live bids + activity */}
      <section className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1fr]">
        {/* ---- the price history ---- */}
        <div>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm text-silk">
              <Gavel className="h-4 w-4 text-gold" /> Live Bids
            </p>
            <p className="text-[9px] tracking-[0.3em] text-muted">
              {snap.bids.length} ACCEPTED
            </p>
          </div>
          <div className="mt-5 space-y-2">
            {snap.bids.length === 0 && (
              <p className="rounded border border-gold/10 bg-surface/40 px-5 py-8 text-center text-sm text-muted">
                No bids yet — the first bid opens at {money(snap.minNextBid, snap.currency)}.
              </p>
            )}
            <AnimatePresence initial={false}>
              {snap.bids.map((b) => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center justify-between rounded border px-5 py-3 ${b.leading ? "border-gold/50 bg-gold/5" : "border-gold/10 bg-surface/40"} ${b.mine ? "ring-1 ring-inset ring-gold/30" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 text-[10px] tabular-nums text-muted">#{b.sequence}</span>
                    <div>
                      <p className="text-sm text-cream/90">
                        {b.alias}
                        {b.mine && <span className="ml-2 text-[9px] tracking-[0.2em] text-gold">YOU</span>}
                      </p>
                      <p className="mt-0.5 text-[9px] tracking-[0.25em] text-muted">{timeAgo(b.at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg text-gold-light">{money(b.amount, snap.currency)}</p>
                    {b.leading && (
                      <span className="rounded bg-green-700/70 px-2 py-0.5 text-[8px] tracking-[0.2em] text-green-100">LEADING</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ---- everything that has happened in this room ---- */}
        <div>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm text-silk">
              <Activity className="h-4 w-4 text-gold" /> What&apos;s happening
            </p>
            <p className="flex items-center gap-2 text-[9px] tracking-[0.3em] text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${live === "live" ? "animate-pulse-glow bg-green-400" : "bg-amber-400"}`} />
              {live === "live" ? "REAL-TIME" : live === "polling" ? "REFRESHING" : "CONNECTING"}
            </p>
          </div>

          <div className="mt-5 max-h-[26rem] overflow-y-auto rounded border border-gold/10 bg-surface/30 p-4">
            <ol className="relative space-y-0">
              <AnimatePresence initial={false}>
                {snap.activity.map((e, i) => {
                  const d = describe(e, snap.currency);
                  if (!d) return null;
                  const Icon = d.icon;
                  const colour =
                    d.tone === "green" ? "text-green-300 border-green-600/40"
                    : d.tone === "red" ? "text-crimson-light border-crimson/40"
                    : d.tone === "gold" ? "text-gold-light border-gold/40"
                    : "text-cream/60 border-gold/15";
                  return (
                    <motion.li
                      key={e.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative flex gap-3 pb-4 pl-1"
                    >
                      {/* the thread joining the beads */}
                      {i < snap.activity.length - 1 && (
                        <span aria-hidden className="absolute left-[15px] top-7 h-[calc(100%-1rem)] w-px bg-gold/15" />
                      )}
                      <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-void ${colour}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 pt-1">
                        <span className={`block text-xs leading-relaxed ${e.mine ? "text-silk" : "text-cream/80"}`}>
                          {d.text}
                        </span>
                        <span className="mt-0.5 block text-[9px] tracking-[0.25em] text-muted">
                          {timeAgo(e.at)}
                        </span>
                      </span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
            {snap.activity.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">Nothing has happened yet.</p>
            )}
          </div>
          <p className="mt-2 text-[9px] leading-relaxed tracking-[0.15em] text-muted">
            EVERY LINE IS A RECORDED EVENT · MEMBERS APPEAR UNDER THEIR ROOM ALIAS
          </p>
        </div>
      </section>

      {/* toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`pointer-events-auto flex items-center gap-3 rounded-full border px-5 py-2.5 text-xs backdrop-blur ${
                t.tone === "green"
                  ? "border-green-600/50 bg-green-900/60 text-green-100"
                  : t.tone === "red"
                    ? "border-crimson/50 bg-crimson/30 text-crimson-light"
                    : "border-gold/40 bg-void/80 text-gold-light"
              }`}
            >
              {t.text}
              <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss">
                <X className="h-3 w-3 opacity-60" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  cards                                                              */
/* ------------------------------------------------------------------ */

function StatusPill({ status, pulse }: { status: string; pulse: boolean }) {
  const tone =
    status === "LIVE" ? "border-green-500/60 bg-green-900/50 text-green-200"
    : status === "REGISTRATION_OPEN" ? "border-gold/60 bg-gold/15 text-gold-light"
    : status === "PAYMENT_PENDING" ? "border-amber-400/60 bg-amber-900/40 text-amber-200"
    : status === "COMPLETED" ? "border-gold bg-gold text-void"
    : "border-cream/30 bg-void/60 text-cream/80";
  return (
    <span className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] tracking-[0.3em] backdrop-blur ${tone}`}>
      {pulse && <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-green-300" />}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Rule({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <div>
      <p className="text-[9px] tracking-[0.3em] text-muted">{label}</p>
      <p className={`mt-1 ${tone === "green" ? "text-green-300" : "text-cream/90"}`}>{value}</p>
    </div>
  );
}

function SignInCard({ snap }: { snap: RoomSnapshot }) {
  const next = encodeURIComponent(`/auctions/${snap.id}`);
  // don't invite a visitor to bid on a lot that is already over
  if (!snap.joinable) {
    return (
      <div className="rounded-xl border border-gold/25 bg-surface/60 p-7">
        <p className="text-[10px] tracking-[0.4em] text-gold">THE ROOM IS CLOSED</p>
        <p className="mt-3 text-sm leading-relaxed text-cream/70">{closedReason(snap)}</p>
        <a href="/auctions" className="mt-5 flex w-full items-center justify-center gap-2 rounded border border-gold py-3.5 text-xs font-semibold tracking-[0.3em] text-gold transition-colors hover:bg-gold hover:text-void">
          SEE THE OPEN ROOMS
        </a>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-gold/25 bg-surface/60 p-7">
      <p className="text-[10px] tracking-[0.4em] text-gold">ENTER THE ROOM</p>
      <p className="mt-3 text-sm text-cream/70">Sign in to lock your deposit and bid on this piece.</p>
      <a href={`/login?next=${next}`} className="mt-5 flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3.5 text-xs font-semibold tracking-[0.3em] text-void hover:brightness-110">
        <Gavel className="h-4 w-4" /> SIGN IN TO PARTICIPATE
      </a>
    </div>
  );
}

function JoinCard({ snap, onJoined, toast }: { snap: RoomSnapshot; onJoined: () => void; toast: (t: string, tone?: "gold" | "green" | "red") => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shortfall, setShortfall] = useState<string | null>(null);
  const available = Number(snap.viewer.wallet?.available ?? 0);
  const enough = available >= Number(snap.rules.depositAmount);

  const join = () =>
    start(async () => {
      setError(null);
      const r = await joinAuctionAction(snap.id);
      if (!r.ok) {
        if (r.needLogin) window.location.href = `/login?next=${encodeURIComponent(`/auctions/${snap.id}`)}`;
        setError(r.error);
        setShortfall(r.details?.shortfall ? String(r.details.shortfall) : null);
        return;
      }
      toast(r.data.alreadyJoined ? `You are in as ${r.data.alias}.` : `Welcome, ${r.data.alias}. Deposit locked.`, "green");
      onJoined();
    });

  return (
    <div className="rounded-xl border border-gold/25 bg-surface/60 p-7">
      <p className="text-[10px] tracking-[0.4em] text-gold">JOIN THE AUCTION</p>
      <div className="mt-4 flex items-baseline justify-between">
        <p className="text-xs text-cream/70">Participation deposit ({snap.rules.depositPercent}% of value)</p>
        <p className="font-display text-2xl text-silk">{money(snap.rules.depositAmount, snap.currency)}</p>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        <Lock className="mr-1 inline h-3 w-3 text-gold" />
        Held until the auction settles. Fully returned if you do not win; counted toward the price if you do.
      </p>
      {!snap.joinable ? (
        <div className="mt-5 rounded border border-gold/20 px-4 py-4 text-center">
          <p className="text-xs leading-relaxed text-cream/70">{closedReason(snap)}</p>
          <a href="/auctions" className="mt-3 inline-block text-[10px] tracking-[0.3em] text-gold hover:text-gold-light">
            SEE THE OPEN ROOMS →
          </a>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={join}
            disabled={pending || !enough}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3.5 text-xs font-semibold tracking-[0.3em] text-void hover:brightness-110 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {pending ? "LOCKING DEPOSIT…" : "LOCK DEPOSIT & JOIN"}
          </button>
          {!enough && (
            <p className="mt-3 text-[11px] leading-relaxed text-amber-200/90">
              Your available balance ({money(available, snap.currency)}) does not cover the deposit. Funds are added to your account by our concierge on receipt of a bank transfer or certified cheque — contact{" "}
              <a href={CONTACT.emailHref} className="text-gold-light underline">{CONTACT.email}</a> or {CONTACT.phone}.
            </p>
          )}
        </>
      )}
      {error && (
        <p className="mt-3 rounded border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson-light">
          {error}{shortfall ? ` Shortfall: ${money(shortfall, snap.currency)}.` : ""}
        </p>
      )}
    </div>
  );
}

function BidCard({
  snap, isLive, onBid, toast, viewerName,
}: {
  snap: RoomSnapshot; isLive: boolean; onBid: () => void;
  toast: (t: string, tone?: "gold" | "green" | "red") => void; viewerName: string | null;
}) {
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState(snap.minNextBid);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  // a fresh key per attempt; a retry of the SAME attempt reuses it
  const keyRef = useRef<string>(crypto.randomUUID());

  // follow the minimum as the price moves — unless the member typed their own number
  useEffect(() => {
    if (!touched) setAmount(snap.minNextBid);
  }, [snap.minNextBid, touched]);

  const tooLow = Number(amount) < Number(snap.minNextBid);
  const bid = () =>
    start(async () => {
      setError(null);
      const r = await placeBidAction({ auctionId: snap.id, amount: Number(amount).toFixed(2), idempotencyKey: keyRef.current });
      if (!r.ok) {
        if (r.needLogin) window.location.href = `/login?next=${encodeURIComponent(`/auctions/${snap.id}`)}`;
        setError(r.error);
        return;
      }
      keyRef.current = crypto.randomUUID(); // this attempt is settled; next one gets its own key
      if (r.data.accepted) {
        toast(`Your bid of ${money(r.data.amount, snap.currency)} is leading.${r.data.extendedTo ? " The auction was extended." : ""}`, "green");
        setTouched(false);
      } else {
        setError(r.data.reason);
      }
      onBid();
    });

  return (
    <div className="rounded-xl border border-gold/25 bg-surface/60 p-7">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.4em] text-gold">PLACE YOUR BID</p>
        <p className="text-[9px] tracking-[0.25em] text-muted">
          AS <span className="text-gold-light">{snap.viewer.alias}</span>
        </p>
      </div>

      {!isLive ? (
        <p className="mt-5 rounded border border-gold/20 px-4 py-3 text-center text-xs leading-relaxed text-cream/70">
          {snap.status === "REGISTRATION_OPEN" || snap.status === "SCHEDULED"
            ? "You are in. Bidding opens when the auction goes live."
            : snap.viewer.depositStatus === "RELEASED"
              ? `${closedReason(snap)} Your deposit has been released.`
              : closedReason(snap)}
        </p>
      ) : (
        <>
          <p className="mt-5 text-[9px] tracking-[0.3em] text-muted">MINIMUM NEXT BID</p>
          <p className="mt-1 font-display text-3xl text-silk">{money(snap.minNextBid, snap.currency)}</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {snap.ladder.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { setAmount(v); setTouched(true); }}
                className={`rounded border py-2 text-[10px] tracking-[0.1em] transition-colors ${amount === v ? "border-gold bg-gold/15 text-gold-light" : "border-gold/30 text-cream/80 hover:bg-gold/10"}`}
              >
                {money(v, snap.currency)}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded border border-gold/30 bg-void px-3">
            <span className="text-xs text-muted">{snap.currency}</span>
            <input
              value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^\d.]/g, "")); setTouched(true); }}
              inputMode="decimal"
              className="w-full bg-transparent py-2.5 text-right font-display text-xl text-silk outline-none"
              aria-label="Bid amount"
            />
          </div>

          <button
            type="button"
            onClick={bid}
            disabled={pending || tooLow || !amount}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3.5 text-xs font-semibold tracking-[0.3em] text-void transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Gavel className="h-4 w-4" />
            {pending ? "PLACING…" : `BID ${money(amount || 0, snap.currency)}`}
          </button>
          {tooLow && touched && (
            <p className="mt-2 text-center text-[10px] tracking-[0.2em] text-amber-200/90">BELOW THE MINIMUM</p>
          )}
          <p className="mt-3 text-center text-[9px] leading-relaxed tracking-[0.15em] text-muted">
            BIDS ARE BINDING · A LATE BID EXTENDS THE CLOCK BY {snap.rules.extensionSec}s
            {viewerName ? ` · ${viewerName.toUpperCase()}` : ""}
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 rounded border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson-light">{error}</p>
      )}
    </div>
  );
}

function WinnerCard({ snap, onDone, toast }: { snap: RoomSnapshot; onDone: () => void; toast: (t: string, tone?: "gold" | "green" | "red") => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const due = Number(snap.viewer.remainingDue ?? 0);
  const available = Number(snap.viewer.wallet?.available ?? 0);
  const canPay = snap.status === "PAYMENT_PENDING" && available >= due;

  const payNow = () =>
    start(async () => {
      setError(null);
      const r = await payBalanceAction(snap.id);
      if (!r.ok) { setError(r.error); return; }
      toast("Payment complete. Our concierge will be in touch about delivery.", "green");
      onDone();
    });

  return (
    <div className="rounded-xl border border-gold bg-gold/5 p-7">
      <p className="text-[10px] tracking-[0.4em] text-gold">
        {snap.status === "COMPLETED" ? "YOURS" : snap.status === "SETTLEMENT_FAILED" ? "SETTLEMENT FAILED" : "YOU WON"}
      </p>
      <p className="mt-2 font-display text-2xl text-silk">
        {snap.status === "COMPLETED" ? "Congratulations — the piece is yours." : "Congratulations!"}
      </p>
      {snap.status === "PAYMENT_PENDING" && (
        <>
          <div className="mt-4 space-y-1.5 text-xs text-cream/80">
            <p className="flex justify-between"><span>Final price</span><span>{money(snap.currentPrice, snap.currency)}</span></p>
            <p className="flex justify-between"><span>Deposit applied</span><span>− {money(snap.viewer.depositAmount ?? 0, snap.currency)}</span></p>
            <p className="flex justify-between border-t border-gold/20 pt-1.5 text-silk"><span>Balance due</span><span className="font-display text-lg">{money(due, snap.currency)}</span></p>
          </div>
          <button
            type="button"
            onClick={payNow}
            disabled={pending || !canPay}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3.5 text-xs font-semibold tracking-[0.3em] text-void hover:brightness-110 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {pending ? "PAYING…" : "PAY BALANCE FROM ACCOUNT"}
          </button>
          {!canPay && (
            <p className="mt-3 text-[11px] leading-relaxed text-amber-200/90">
              Your available balance ({money(available, snap.currency)}) does not cover the amount due. Settle by bank transfer with our concierge before the deadline — {CONTACT.phone} · <a href={CONTACT.emailHref} className="text-gold-light underline">{CONTACT.email}</a>. Once received, the piece is marked yours.
            </p>
          )}
        </>
      )}
      {snap.status === "SETTLEMENT_FAILED" && (
        <p className="mt-3 text-xs text-cream/70">The payment window closed before the balance was received.</p>
      )}
      {error && <p className="mt-3 rounded border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson-light">{error}</p>}
    </div>
  );
}
