"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Gavel } from "lucide-react";
import { placeBid, type BidState } from "@/app/auctions/actions";
import { Zoomable, ZoomButton } from "@/components/ui/Lightbox";

export type HallBid = {
  id: string;
  amount: number;
  country: string | null;
  when: string; // ISO
  winning: boolean;
};

export type HallAuction = {
  id: string;
  title: string;
  artworkTitle: string;
  category: string;
  image: string;
  endAt: string; // ISO
  basePrice: number;
  minIncrement: number;
  currentBid: number;
  bidCount: number;
  leaderCountry: string | null;
  bids: HallBid[];
  status?: string;
};

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

const STEPS = [
  ["Register", "SECURE YOUR ROYAL MEMBERSHIP"],
  ["Verify Identity", "MANDATORY FOR HIGH-VALUE BIDS"],
  ["Join Room", "ENTER THE LIVE VIRTUAL CHAMBER"],
  ["Place Bid", "SECURE YOUR INHERITANCE"],
  ["Confirm Win", "FINALIZE OWNERSHIP TRANSFER"],
];

const FAQS: [string, string][] = [
  [
    "How to participate in the Royal Auction?",
    "Create your membership, complete identity verification, and enter the live chamber. Once verified you may bid on any active offering.",
  ],
  [
    "What are the accepted payment methods?",
    "Bank transfer, certified cheque, and major cards. High-value settlements are arranged privately with our concierge within 72 hours of winning.",
  ],
  [
    "How does identity verification work?",
    "Our staff review your submitted documents and verify your profile. Verification is mandatory for all bids exceeding OMR 5,000.",
  ],
  [
    "What are the auction bidding rules?",
    "Each bid must exceed the current highest bid by at least the stated minimum increment. Bids are binding and cannot be withdrawn.",
  ],
  [
    "Is international shipping available?",
    "Yes — complimentary climate-controlled, fully insured white-glove delivery is included worldwide on every winning lot.",
  ],
];

function useCountdown(endIso: string) {
  const [left, setLeft] = useState(() => new Date(endIso).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(
      () => setLeft(new Date(endIso).getTime() - Date.now()),
      1000
    );
    return () => clearInterval(t);
  }, [endIso]);
  const s = Math.max(0, Math.floor(left / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { hh: pad(hh), mm: pad(mm), ss: pad(ss), over: s <= 0 };
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "JUST NOW";
  if (mins < 60) return `${mins} MIN AGO`;
  const h = Math.floor(mins / 60);
  return `${h}H AGO`;
}

const omr = (n: number) => `OMR ${n.toLocaleString("en-US")}`;

export type Viewer = { name: string } | null;

export default function AuctionHall({
  flagship,
  offerings,
  viewer = null,
  roomsEnabled = false,
}: {
  flagship: HallAuction;
  offerings: HallAuction[];
  viewer?: Viewer;
  /** live rooms are a local-only feature; off = classic inline bidding */
  roomsEnabled?: boolean;
}) {
  const bidPanelRef = useRef<HTMLDivElement>(null);
  const scrollToBid = () =>
    bidPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="bg-void">
      {/* ---------------- hero: the live lot ---------------- */}
      <section className="relative overflow-hidden">
        {/* deep crimson ambience */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_42%,rgba(139,30,45,0.35),transparent_75%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-28 text-center">
          {/* corner brackets */}
          <div className="relative w-full max-w-md p-6">
            <Corner className="left-0 top-0 border-l-2 border-t-2" />
            <Corner className="right-0 top-0 border-r-2 border-t-2" />
            <Corner className="bottom-0 left-0 border-b-2 border-l-2" />
            <Corner className="bottom-0 right-0 border-b-2 border-r-2" />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] tracking-[0.5em] text-crimson-light"
            >
              LIVE AUCTION
            </motion.p>

            <Zoomable src={flagship.image} alt={flagship.artworkTitle} caption={flagship.artworkTitle} className="mx-auto mt-6 w-full max-w-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="aspect-[3/4] w-full overflow-hidden rounded border-2 border-crimson/60 shadow-[0_0_80px_-10px_rgba(139,30,45,0.7)]"
              >
                <div
                  className="h-full w-full bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${flagship.image})` }}
                />
              </motion.div>
            </Zoomable>

            <HeroTimer endAt={flagship.endAt} />

            <p className="mt-8 text-[10px] tracking-[0.4em] text-muted">
              CURRENT BID
            </p>
            <p className="mt-1 font-display text-4xl italic text-gradient-gold sm:text-5xl">
              {omr(flagship.currentBid)}
            </p>
            <p className="mt-2 text-[10px] tracking-[0.25em] text-muted">
              COLLECTOR FROM {(flagship.leaderCountry ?? "DOHA").toUpperCase()} ·{" "}
              {flagship.bidCount} BIDS
            </p>

            <button
              type="button"
              onClick={scrollToBid}
              className="mt-8 rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim px-10 py-3 text-xs font-semibold tracking-[0.3em] text-void transition-all hover:brightness-110"
            >
              PLACE YOUR BID
            </button>
          </div>

          <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.4em] text-muted">
            SCROLL
            <ChevronDown className="mx-auto mt-1 h-3 w-3 animate-bounce" />
          </p>
        </div>
      </section>

      {/* ---------------- the five steps ---------------- */}
      <motion.section {...fadeUp} transition={{ duration: 0.8 }} className="border-y border-gold/10 bg-[#08080e]">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-10 px-6 py-14 sm:grid-cols-5">
          {STEPS.map(([title, sub], i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="text-center"
            >
              <span
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-sm ${
                  i === 1
                    ? "border-gold bg-gold/15 text-gold-light"
                    : "border-gold/40 text-gold/80"
                }`}
              >
                {i + 1}
              </span>
              <p className="mt-3 text-sm text-silk">{title}</p>
              <p className="mt-1 text-[8px] leading-relaxed tracking-[0.2em] text-muted">
                {sub}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ---------------- bidding history + bid panel ---------------- */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-20 lg:grid-cols-[1.2fr_1fr]">
        <motion.div {...fadeUp} transition={{ duration: 0.7 }}>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm text-silk">
              <Gavel className="h-4 w-4 text-gold" /> Live Bidding History
            </p>
            <p className="flex items-center gap-2 text-[9px] tracking-[0.3em] text-muted">
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-crimson-light" />
              LIVE UPDATES
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {flagship.bids.length === 0 && (
              <p className="rounded border border-gold/10 bg-surface/40 px-5 py-8 text-center text-sm text-muted">
                No bids yet — be the first to claim this masterpiece.
              </p>
            )}
            {flagship.bids.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="flex items-center justify-between rounded border border-gold/10 bg-surface/50 px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 text-xs text-gold">
                    C
                  </span>
                  <div>
                    <p className="text-sm text-cream/90">
                      Collector from {b.country ?? "Doha"}
                    </p>
                    <p className="mt-0.5 text-[9px] tracking-[0.25em] text-muted">
                      {timeAgo(b.when)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg text-gold-light">
                    {omr(b.amount)}
                  </p>
                  {b.winning && (
                    <span className="rounded bg-green-700/70 px-2 py-0.5 text-[8px] tracking-[0.2em] text-green-100">
                      LEADING
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <BidPanel ref={bidPanelRef} auction={flagship} viewer={viewer} roomsEnabled={roomsEnabled} />
      </section>

      {/* ---------------- current offerings ---------------- */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <motion.div {...fadeUp} transition={{ duration: 0.7 }} className="flex items-end justify-between">
          <div>
            <p className="text-[10px] tracking-[0.4em] text-gold">
              ACTIVE COLLECTIONS
            </p>
            <h2 className="mt-2 font-display text-3xl text-silk">
              Current Offerings
            </h2>
          </div>
          <p className="hidden text-[10px] tracking-[0.3em] text-gold sm:block">
            {offerings.length} ACTIVE AUCTIONS
          </p>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {offerings.map((a, i) => (
            <OfferingCard key={a.id} auction={a} delay={i * 0.12} roomsEnabled={roomsEnabled} />
          ))}
        </div>
      </section>

      {/* ---------------- quote + stats ---------------- */}
      <motion.section
        {...fadeUp}
        transition={{ duration: 0.9 }}
        className="relative overflow-hidden border-y border-gold/10 bg-[#0a0710]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(139,30,45,0.15),transparent_75%)]" />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="font-display text-3xl italic text-gradient-gold sm:text-4xl">
            &ldquo;More than a transaction — a cultural inheritance.&rdquo;
          </p>
          <p className="mx-auto mt-8 max-w-xl text-xs leading-loose text-cream/60">
            At ALBESAT, the gavel signifies more than the closure of a sale. It
            is the moment a centuries-old masterpiece finds its next custodian.
            Each thread in our royal collection carries the breath of Isfahan,
            the patience of Tabriz, and the heritage of the Persian plateau.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-xs leading-loose text-cream/60">
            Ownership of an ALBESAT masterpiece is a privilege reserved for
            those who understand that true luxury is measured in knots, not
            currency. Our auctions are carefully curated to ensure that the
            provenance of every piece is preserved, honoring the artisans who
            spent lifetimes weaving what we now behold.
          </p>

          <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 divide-x divide-gold/15">
            {(
              [
                ["450+", "ARTISANS CURATED"],
                ["100%", "CERTIFIED PROVENANCE"],
                ["24k", "SILK THREADS AVG"],
              ] as [string, string][]
            ).map(([n, label]) => (
              <div key={label} className="px-4">
                <p className="font-display text-2xl text-gold-light">{n}</p>
                <p className="mt-1 text-[8px] tracking-[0.25em] text-muted">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ---------------- FAQ ---------------- */}
      <motion.section {...fadeUp} transition={{ duration: 0.8 }} className="mx-auto max-w-2xl px-6 py-20">
        <h2 className="text-center font-display text-2xl text-silk">
          Inquiry &amp; Procedures
        </h2>
        <div className="mt-8 space-y-3">
          {FAQS.map(([q, a]) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </motion.section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Corner({ className }: { className: string }) {
  return (
    <span className={`pointer-events-none absolute h-8 w-8 border-gold/70 ${className}`} />
  );
}

function HeroTimer({ endAt }: { endAt: string }) {
  const { hh, mm, ss, over } = useCountdown(endAt);
  return (
    <div className="mt-8">
      <p className="font-display text-5xl tracking-wider text-silk sm:text-6xl">
        {over ? "ENDED" : (
          <>
            {hh}
            <span className="text-gold/60">:</span>
            {mm}
            <span className="text-gold/60">:</span>
            {ss}
          </>
        )}
      </p>
      <p className="mt-2 flex items-center justify-center gap-2 text-[9px] tracking-[0.4em] text-muted">
        <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-crimson-light" />
        TIME REMAINING
      </p>
    </div>
  );
}

const BidPanel = ({
  auction,
  viewer,
  roomsEnabled,
  ref,
}: {
  auction: HallAuction;
  viewer: Viewer;
  roomsEnabled: boolean;
  ref: React.Ref<HTMLDivElement>;
}) => {
  // ---- classic inline bidding (rooms off) — the pre-module behaviour ------
  const minNext =
    auction.bidCount === 0
      ? auction.basePrice
      : auction.currentBid + auction.minIncrement;
  const [amount, setAmount] = useState(minNext);
  const [state, formAction, pending] = useActionState<BidState, FormData>(
    placeBid,
    {}
  );
  // keep the chosen amount valid when a new bid lands (page revalidates)
  useEffect(() => setAmount(minNext), [minNext]);
  // session expired mid-visit → continue at the login page and come back
  useEffect(() => {
    if (state.needLogin) window.location.href = "/login?next=/auctions";
  }, [state.needLogin]);

  const room = `/auctions/${auction.id}`;
  const registration = auction.status === "REGISTRATION_OPEN";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="h-fit rounded border border-gold/25 bg-surface/60 p-7 backdrop-blur"
    >
      {roomsEnabled ? (
        /* ---- door to the live room (local-only feature) ---- */
        <>
          <p className="text-[10px] tracking-[0.4em] text-gold">
            {registration ? "REGISTRATION OPEN" : "LIVE ROOM"}
          </p>
          <p className="mt-5 text-[9px] tracking-[0.3em] text-muted">
            {auction.bidCount > 0 ? "CURRENT BID" : "OPENING PRICE"}
          </p>
          <p className="mt-1 font-display text-4xl text-silk">{omr(auction.currentBid)}</p>
          <p className="mt-2 text-[9px] tracking-[0.25em] text-muted">
            {auction.bidCount} BID{auction.bidCount === 1 ? "" : "S"} · DEPOSIT REQUIRED TO ENTER
          </p>
          <a
            href={viewer ? room : `/login?next=${encodeURIComponent(room)}`}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3.5 text-xs font-semibold tracking-[0.3em] text-void transition-all hover:brightness-110"
          >
            <Gavel className="h-4 w-4" />
            {viewer ? (registration ? "ENTER & LOCK DEPOSIT" : "ENTER LIVE ROOM") : "SIGN IN TO ENTER"}
          </a>
          {viewer && (
            <p className="mt-3 text-center text-[9px] tracking-[0.25em] text-muted">
              SIGNED IN AS <span className="text-gold-light">{viewer.name.toUpperCase()}</span>
            </p>
          )}
        </>
      ) : (
        /* ---- classic inline bid form ---- */
        <>
          <p className="text-[10px] tracking-[0.4em] text-gold">PLACE YOUR BID</p>
          <p className="mt-5 text-[9px] tracking-[0.3em] text-muted">NEXT MINIMUM BID</p>
          <p className="mt-1 font-display text-4xl text-silk">{omr(amount)}</p>

          {viewer ? (
            <>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[100, 500, 1000].map((add) => (
                  <button
                    key={add}
                    type="button"
                    onClick={() => setAmount((v) => v + add)}
                    className="rounded border border-gold/30 py-2 text-[10px] tracking-[0.15em] text-gold-light transition-colors hover:bg-gold/10"
                  >
                    +{add} OMR
                  </button>
                ))}
              </div>
              <form action={formAction} className="mt-4">
                <input type="hidden" name="auctionId" value={auction.id} />
                <input type="hidden" name="amount" value={amount} />
                <button
                  type="submit"
                  disabled={pending}
                  className="flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3.5 text-xs font-semibold tracking-[0.3em] text-void transition-all hover:brightness-110 disabled:opacity-60"
                >
                  <Gavel className="h-4 w-4" />
                  {pending ? "PLACING…" : "CONFIRM BID"}
                </button>
              </form>
              <p className="mt-3 text-center text-[9px] tracking-[0.25em] text-muted">
                BIDDING AS{" "}
                <span className="text-gold-light">{viewer.name.toUpperCase()}</span>
              </p>
            </>
          ) : (
            <a
              href="/login?next=/auctions"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3.5 text-xs font-semibold tracking-[0.3em] text-void transition-all hover:brightness-110"
            >
              <Gavel className="h-4 w-4" />
              SIGN IN TO BID
            </a>
          )}

          <AnimatePresence>
            {state.ok && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 rounded border border-green-700/50 bg-green-900/30 px-3 py-2 text-center text-xs text-green-200"
              >
                ✓ Your bid of {omr(state.amount ?? amount)} is now leading.
              </motion.p>
            )}
            {state.error && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 rounded border border-crimson/40 bg-crimson/10 px-3 py-2 text-center text-xs text-crimson-light"
              >
                {state.error}
              </motion.p>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};

function OfferingCard({
  auction,
  delay,
  roomsEnabled,
}: {
  auction: HallAuction;
  delay: number;
  roomsEnabled: boolean;
}) {
  const { hh, mm, ss, over } = useCountdown(auction.endAt);
  return (
    <motion.a
      href={roomsEnabled ? `/auctions/${auction.id}` : "#"}
      onClick={(e) => {
        // without rooms there is nowhere to go — the flagship panel above is
        // the bidding surface, so the card scrolls the visitor back to it
        if (roomsEnabled) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay }}
      className="group overflow-hidden rounded border border-crimson/40 bg-surface/40 transition-shadow hover:shadow-[0_0_35px_-8px_rgba(139,30,45,0.6)]"
    >
      <span className="relative block aspect-[4/3] overflow-hidden">
        <span
          className="block h-full w-full bg-contain bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-108"
          style={{ backgroundImage: `url(${auction.image})` }}
        />
        <ZoomButton src={auction.image} alt={auction.artworkTitle} caption={auction.artworkTitle} />
        <span className="absolute left-3 top-3 rounded bg-crimson px-2 py-0.5 text-[8px] font-bold tracking-[0.2em] text-white">
          LIVE
        </span>
        <span className="absolute bottom-3 left-3 rounded bg-void/80 px-2 py-1 font-mono text-[10px] text-gold-light backdrop-blur">
          ⏱ {over ? "ENDED" : `${hh}:${mm}:${ss}`}
        </span>
      </span>
      <span className="block p-4">
        <span className="block text-sm text-silk">{auction.artworkTitle}</span>
        <span className="mt-0.5 block text-[9px] tracking-[0.25em] text-muted">
          {auction.category.toUpperCase()}
        </span>
        <span className="mt-3 flex items-end justify-between">
          <span>
            <span className="block text-[8px] tracking-[0.25em] text-muted">
              CURRENT BID
            </span>
            <span className="font-display text-lg text-gold-light">
              {omr(auction.currentBid)}
            </span>
          </span>
          <span className="text-right">
            <span className="block font-display text-lg text-cream/80">
              {auction.bidCount}
            </span>
            <span className="block text-[8px] tracking-[0.2em] text-muted">
              BIDS
            </span>
          </span>
        </span>
      </span>
    </motion.a>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded border border-gold/15 bg-surface/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm text-cream/90 transition-colors hover:text-gold-light"
      >
        {q}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gold transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-xs leading-loose text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
