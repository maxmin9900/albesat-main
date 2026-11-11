"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createAuction,
  type AuctionState,
} from "@/app/admin/(panel)/auctions/actions";
import { useCountdown } from "@/lib/use-countdown";
import { muscatLocalToUtc } from "@/lib/auction/invitation";
import AuctionLotsEditor, {
  emptyLot,
  lotsToPayload,
  type LotDraft,
} from "./AuctionLotsEditor";

/**
 * "YYYY-MM-DDTHH:mm" for the datetime-local boxes, in MUSCAT time.
 *
 * The boxes are read as Muscat wall-clock, so their defaults and their `min`
 * have to be stamped in Muscat too — seeding them from the admin's own clock
 * would offer a starting value that means a different moment than it reads.
 */
function muscatStamp(offsetMs = 0) {
  const d = new Date(Date.now() + offsetMs);
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Muscat",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

type Option = {
  id: string;
  label: string;
  intrinsicValue: string | null;
  currency: string;
  /** used to prefill the catalogue entry — the admin can overwrite every one */
  title: string;
  city: string;
  approxAge: string | null;
  dimensions: string | null;
  pileMaterial: string | null;
  condition: string | null;
};

type Defaults = {
  depositPercent: number;
  bidIncrementPercent: number;
  bidCoveragePercent: number;
  antiSnipingWindowSec: number;
  extensionSec: number;
  paymentDeadlineMin: number;
  failedPaymentDepositPolicy: "RELEASE" | "FORFEIT";
  offerToNextBidder: boolean;
};

const inputCls =
  "w-full rounded-lg border border-border bg-void px-3 py-2 text-silk outline-none transition-colors focus:border-gold";
const labelCls = "mb-1.5 block text-sm text-cream/80";
const hintCls = "mt-1 text-xs text-muted";

const fmt = (n: number, cur: string) =>
  `${cur} ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export default function AuctionForm({
  artworks,
  defaults,
  roomsEnabled,
}: {
  artworks: Option[];
  defaults: Defaults;
  /**
   * The live bidding room (deposits, increments, anti-sniping, settlement) is
   * behind LIVE_AUCTION_ROOMS and off in production. With it off the public
   * flow is register-your-interest, so none of those rules apply and the whole
   * block is hidden — the server still snapshots the system defaults onto the
   * row, so turning the flag on later finds sane values already there.
   */
  roomsEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<AuctionState, FormData>(
    createAuction,
    {}
  );
  const err = (f: string) => state.fieldErrors?.[f];


  const [minStart, setMinStart] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  // localStamp reads the browser clock, so it has to wait for mount or the
  // server and client markup disagree
  useEffect(() => {
    setMinStart(muscatStamp());
    setStartAt(muscatStamp());
    setEndAt(muscatStamp(14 * 86_400_000));
  }, []);

  // live preview of the money rules for the chosen work
  const [currency, setCurrency] = useState("OMR");
  const [lots, setLots] = useState<LotDraft[]>([emptyLot()]);

  /**
   * What the public page will print for "Auction Begins".
   *
   * The timing boxes are read as Muscat wall-clock everywhere — the server
   * stores them that way too — so whatever is typed here is exactly what
   * visitors see, whichever zone the admin's own computer is on.
   */
  const startInstant = startAt ? muscatLocalToUtc(startAt) : null;
  const [startDay, startClock] = startAt.split("T");
  const beginsMuscat = startClock?.slice(0, 5) || "";
  // ticks down to that instant, live as they type it
  const left = useCountdown(startInstant ? startInstant.toISOString() : null);

  /**
   * "Auction begins" and the Opens box are two views of one moment, so
   * editing either keeps the other in step. Typing a time before a date has
   * been chosen falls back to today in Muscat rather than doing nothing.
   */
  const setBeginsTime = (hhmm: string) => {
    if (!hhmm) return;
    setStartAt(`${startDay || muscatStamp().split("T")[0]}T${hhmm}`);
  };

  // only reachable when the live bidding room is on
  const [depositPct, setDepositPct] = useState(defaults.depositPercent);
  const [incPct, setIncPct] = useState(defaults.bidIncrementPercent);

  return (
    <form
      action={formAction}
      className="max-w-3xl space-y-8 rounded-xl border border-gold/10 bg-surface p-6"
    >
      {/* the lots travel as JSON — a session holds a variable number of them,
          each with its own catalogue entry, so they cannot be flat fields */}
      <input type="hidden" name="lots" value={JSON.stringify(lotsToPayload(lots))} />
      {state.error && (
        <p className="rounded-lg border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm text-crimson-light">
          {state.error}
        </p>
      )}

      {/* ---- the session ------------------------------------------------ */}
      <section className="space-y-4">
        <h3 className="font-display text-lg text-gold-light">The session</h3>
        <div>
          <label className={labelCls}>Session title *</label>
          <input
            name="title"
            className={inputCls}
            placeholder="Autumn Sale — Private Collection"
          />
          {err("title") && <p className="mt-1 text-xs text-crimson-light">{err("title")}</p>}
        </div>
        <div className="sm:max-w-[200px]">
          <label className={labelCls}>Currency</label>
          <select
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputCls}
          >
            <option value="OMR">OMR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="AED">AED</option>
            <option value="IRR">IRR</option>
          </select>
        </div>
      </section>

      {/* ---- the printed invitation -------------------------------------- */}
      <section className="space-y-4">
        <h3 className="font-display text-lg text-gold-light">
          The invitation
        </h3>
        <p className="text-xs text-muted">
          Printed above the registration form on the public auctions page, and
          named back to the visitor when they register. Leave any of it blank
          and the page falls back to generic wording.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Venue name (short)</label>
            <input
              name="venueName"
              placeholder="National Museum of Oman"
              className={inputCls}
            />
            <p className={hintCls}>
              Used in a sentence: &ldquo;…the auction at <em>this</em>.&rdquo;
            </p>
          </div>
          <div>
            <label className={labelCls}>Address line</label>
            <input
              name="venueAddress"
              placeholder="National Museum of Oman – Land and People Hall, Muscat"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Venue detail (the &ldquo;Venue:&rdquo; line)</label>
          <input
            name="venueHall"
            placeholder="Land and People Hall, National Museum of Oman"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Introduction</label>
          <textarea
            name="intro"
            rows={2}
            placeholder="A special auction of selected hand-knotted Persian carpets presented by Al Besat Al Hariri."
            className={`${inputCls} resize-y`}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Viewing from</label>
            <input name="viewingFrom" dir="ltr" placeholder="17:00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Viewing to</label>
            <input name="viewingTo" dir="ltr" placeholder="19:00" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Auction begins</label>
            <input
              type="time"
              value={beginsMuscat}
              onChange={(e) => setBeginsTime(e.target.value)}
              dir="ltr"
              className={inputCls}
            />
            {left.ready && beginsMuscat && (
              <p className="mt-1 text-xs tabular-nums text-gold/80">
                {left.over
                  ? "that moment has already passed"
                  : `starts in ${left.days}d ${left.hours}h ${left.minutes}m ${left.seconds}s`}
              </p>
            )}
            <p className={hintCls}>
              Shares the Opens date below — change either one. Every time on
              this form is Muscat time.
            </p>
          </div>
        </div>
      </section>

      {/* ---- the carpets in this session --------------------------------- */}
      <section className="space-y-4">
        <h3 className="font-display text-lg text-gold-light">
          Carpets in this session
        </h3>
        <p className="text-xs text-muted">
          One session can hold several carpets. Each is a lot with its own
          catalogue entry; people register for the session, not for a single
          carpet. Picking a work fills in what it already records.
        </p>
        {artworks.length === 0 && (
          <p className="text-xs text-amber-300">
            No published work is available for auction.
          </p>
        )}
        <AuctionLotsEditor
          works={artworks}
          lots={lots}
          onChange={setLots}
          currency={currency}
        />
        {err("lots") && <p className="text-xs text-crimson-light">{err("lots")}</p>}
      </section>

      {/* ---- timing ----------------------------------------------------- */}
      <section className="space-y-4">
        <h3 className="font-display text-lg text-gold-light">Timing</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Registration opens</label>
            <input name="registrationOpensAt" type="datetime-local" dir="ltr" className={inputCls} />
            <p className={hintCls}>
              {roomsEnabled
                ? "Optional. Members can lock their deposit from this moment."
                : "Optional. Leave blank to take registrations straight away."}
            </p>
            {err("registrationOpensAt") && <p className="mt-1 text-xs text-crimson-light">{err("registrationOpensAt")}</p>}
          </div>
          <div>
            <label className={labelCls}>
              {roomsEnabled ? "Bidding starts *" : "Opens *"}
            </label>
            <input
              name="startAt"
              type="datetime-local"
              min={minStart || undefined}
              required
              dir="ltr"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={inputCls}
            />
            {err("startAt") && <p className="mt-1 text-xs text-crimson-light">{err("startAt")}</p>}
          </div>
          <div>
            <label className={labelCls}>
              {roomsEnabled ? "Bidding ends *" : "Closes *"}
            </label>
            <input
              name="endAt"
              type="datetime-local"
              min={minStart || undefined}
              required
              dir="ltr"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={inputCls}
            />
            {roomsEnabled && (
              <p className={hintCls}>Moves later on late bids (see extension).</p>
            )}
            {err("endAt") && <p className="mt-1 text-xs text-crimson-light">{err("endAt")}</p>}
          </div>
        </div>
      </section>

      {/* The live bidding room owns all of this: deposits, the increment
          ladder, anti-sniping, settlement. With the rooms off the public flow
          is register-your-interest, so showing these would ask the admin to
          decide things the site never uses. The server still snapshots the
          system defaults onto the row. */}
      {roomsEnabled && (
        <>
        {/* ---- money rules ------------------------------------------------ */}
        <section className="space-y-4">
          <h3 className="font-display text-lg text-gold-light">Financial rules</h3>
          <p className="text-xs text-muted">
            Snapshotted onto this auction at creation. Changing the system defaults later never
            alters an auction members already joined.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Deposit % of value</label>
              <input
                name="depositPercent" type="number" step="0.5" min="0" max="100" dir="ltr"
                value={depositPct} onChange={(e) => setDepositPct(Number(e.target.value))}
                className={inputCls}
              />
              <p className={hintCls}>Locked to enter the room</p>
              {err("depositPercent") && <p className="mt-1 text-xs text-crimson-light">{err("depositPercent")}</p>}
            </div>
            <div>
              <label className={labelCls}>Bid increment %</label>
              <input
                name="bidIncrementPercent" type="number" step="0.5" min="0.01" dir="ltr"
                value={incPct} onChange={(e) => setIncPct(Number(e.target.value))}
                className={inputCls}
              />
              <p className={hintCls}>Of the <em>current</em> price — compound.</p>
              {err("bidIncrementPercent") && <p className="mt-1 text-xs text-crimson-light">{err("bidIncrementPercent")}</p>}
            </div>
            <div>
              <label className={labelCls}>Bid coverage %</label>
              <input name="bidCoveragePercent" type="number" step="5" min="0" max="100" dir="ltr" defaultValue={defaults.bidCoveragePercent} className={inputCls} />
              <p className={hintCls}>Share of a bid the member must hold (balance + own deposit) for it to be accepted.</p>
            </div>
          </div>

        </section>

        {/* ---- closing & settlement -------------------------------------- */}
        <section className="space-y-4">
          <h3 className="font-display text-lg text-gold-light">Closing &amp; settlement</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Anti-sniping window (s)</label>
              <input name="antiSnipingWindowSec" type="number" min="0" max="3600" dir="ltr" defaultValue={defaults.antiSnipingWindowSec} className={inputCls} />
              <p className={hintCls}>A valid bid inside the last N seconds extends the auction.</p>
            </div>
            <div>
              <label className={labelCls}>Extension (s)</label>
              <input name="extensionSec" type="number" min="0" max="3600" dir="ltr" defaultValue={defaults.extensionSec} className={inputCls} />
              <p className={hintCls}>By this much, each time.</p>
            </div>
            <div>
              <label className={labelCls}>Payment deadline (min)</label>
              <input name="paymentDeadlineMin" type="number" min="1" dir="ltr" defaultValue={defaults.paymentDeadlineMin} className={inputCls} />
              <p className={hintCls}>The winner&apos;s window to pay the balance.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>If the winner does not pay, their deposit is</label>
              <select name="failedPaymentDepositPolicy" defaultValue={defaults.failedPaymentDepositPolicy} className={inputCls}>
                <option value="RELEASE">released back to them</option>
                <option value="FORFEIT">forfeited</option>
              </select>
            </div>
            <label className="flex items-center gap-3 self-end rounded-lg border border-border bg-void px-3 py-2 text-sm text-cream/80">
              <input type="checkbox" name="offerToNextBidder" defaultChecked={defaults.offerToNextBidder} className="accent-[#c9a24b]" />
              …and offer the lot to the runner-up
            </label>
          </div>
        </section>
        </>
      )}

      {!roomsEnabled && (
        <p className="rounded-lg border border-gold/15 bg-void/40 px-4 py-3 text-xs leading-relaxed text-muted">
          Deposits, bid increments and settlement rules belong to the live
          bidding room, which is off on this site. Visitors register their
          interest in a lot and you call them — you can see who registered on
          the auction&apos;s page.
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gold px-8 py-2.5 font-medium text-void transition-colors hover:bg-gold-light disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create auction"}
        </button>
      </div>
    </form>
  );
}
