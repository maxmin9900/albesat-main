"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import AuctionJoinForm from "./AuctionJoinForm";
import RegistrationSuccessModal from "./RegistrationSuccessModal";
import AuctionInvitation from "./AuctionInvitation";
import type { Invitation } from "@/lib/auction/invitation";
import { sessionDateShort } from "@/lib/auction/invitation";
import { formatCurrency } from "@/lib/utils";
import RichText from "@/components/ui/RichText";

export type LotCard = {
  id: string;
  artworkId: string;
  artworkTitle: string;
  code: string;
  city: string;
  category: string;
  image: string;
  startingPrice: string;

  // ---- the printed catalogue entry ----
  lotNumber: number | null;
  lotName: string | null;
  origin: string | null;
  era: string | null;
  lotDimensions: string | null;
  materials: string | null;
  weave: string | null;
  condition: string | null;
  estimateLow: string | null;
  estimateHigh: string | null;
  publishedReserve: string | null;
  lotNote: string | null;
};

export type SessionCard = {
  id: string;
  title: string;
  status: string;
  currency: string;
  startAt: string | null;
  endAt: string | null;
  registrations: number;
  lots: LotCard[];

  // ---- the printed invitation ----
  venueName: string | null;
  venueAddress: string | null;
  venueHall: string | null;
  intro: string | null;
  viewingFrom: string | null;
  viewingTo: string | null;
};

const toInvitation = (s: SessionCard): Invitation => ({
  title: s.title,
  startAt: s.startAt,
  venueName: s.venueName,
  venueAddress: s.venueAddress,
  venueHall: s.venueHall,
  intro: s.intro,
  viewingFrom: s.viewingFrom,
  viewingTo: s.viewingTo,
});

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const PER_ROW = 3;

const STATUS_LABEL: Record<string, string> = {
  LIVE: "LIVE NOW",
  REGISTRATION_OPEN: "REGISTRATION OPEN",
  SCHEDULED: "UPCOMING",
};

export default function AuctionGallery({
  sessions,
  initialSessionId = "",
  justRegistered = false,
}: {
  sessions: SessionCard[];
  /** from "?session=<id>" — preselects it in the form at the top */
  initialSessionId?: string;
  /** from "?registered=1" — the server action redirects back with it */
  justRegistered?: boolean;
}) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [selectedId, setSelectedId] = useState(() =>
    sessions.some((s) => s.id === initialSessionId) ? initialSessionId : ""
  );
  const formRef = useRef<HTMLDivElement>(null);
  const catalogueRef = useRef<HTMLDivElement>(null);
  const [showSuccess, setShowSuccess] = useState(justRegistered);

  // Drop "registered=1" once the modal is dismissed, so a refresh or a shared
  // link does not replay the confirmation for something that already happened.
  const dismissSuccess = () => {
    setShowSuccess(false);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("registered");
    window.history.replaceState({}, "", url.toString());
  };

  const allLots = useMemo(() => sessions.flatMap((s) => s.lots), [sessions]);

  const cities = useMemo(
    () =>
      [...new Set(allLots.map((l) => l.city))].sort((a, b) => a.localeCompare(b)),
    [allLots]
  );

  // filtering narrows the lots inside each session; a session whose lots all
  // fall away drops out of the catalogue
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sessions
      .map((s) => ({
        ...s,
        lots: s.lots.filter((l) => {
          if (city && l.city !== city) return false;
          if (!needle) return true;
          return [
            l.artworkTitle, l.code, l.city, l.category, l.lotName,
            l.origin, l.era, l.materials, l.weave,
            l.lotNumber ? `lot ${l.lotNumber}` : "",
            s.title,
          ]
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(needle));
        }),
      }))
      .filter((s) => s.lots.length > 0);
  }, [sessions, q, city]);

  // pressing "Participate" on a lot picks its session in the form above and
  // carries the visitor to it
  const participate = (sessionId: string) => {
    setSelectedId(sessionId);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const filtering = Boolean(q || city);
  // the sale the banner speaks for: the chosen one, else the only one
  const featured =
    sessions.find((s) => s.id === selectedId) ??
    (sessions.length === 1 ? sessions[0] : null);

  return (
    <section className="relative z-10 bg-void pb-28">
      <RegistrationSuccessModal
        open={showSuccess}
        invitation={featured ? toInvitation(featured) : null}
        onClose={dismissSuccess}
      />

      {/* The invitation for the sale in hand, full-bleed so the gavel runs
          edge to edge. With one sale open it is selected automatically, so
          this is simply that sale's details; with several, it follows
          whichever the visitor has chosen. */}
      {featured && (
        <AuctionInvitation
          invitation={toInvitation(featured)}
          onReserve={() => participate(featured.id)}
          onBrowse={
            allLots.length > 0
              ? () =>
                  catalogueRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              : undefined
          }
        />
      )}

      <div className="mx-auto max-w-6xl px-6">
        {!featured && (
          <div className="pt-28 text-center">
            <p className="text-sm tracking-[0.4em] text-gold/60 ornament">
              ROYAL AUCTION
            </p>
            <h1 className="mt-4 font-display text-4xl text-silk sm:text-6xl">
              Carpets at Auction
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-cream/70 sm:text-base">
              Register for a sale below and our team will contact you with the
              terms before the hammer falls. One registration covers every lot
              in that session.
            </p>
          </div>
        )}

        {/* ——— register, at the top of the page ——— */}
        {sessions.length > 0 && (
          <div
            ref={formRef}
            id="register"
            className="mx-auto mt-14 max-w-3xl scroll-mt-24 rounded-xl border border-gold/20 bg-surface/50 p-8 sm:p-10"
          >
            <p className="text-[10px] tracking-[0.35em] text-gold/70 ornament">
              AUCTION REGISTRATION
            </p>
            <h2 className="mt-3 font-display text-2xl text-silk sm:text-3xl">
              Reserve Your Seats{" "}
              <span className="text-base text-cream/50">(optional)</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-cream/65">
              Browsing the lots needs nothing from you. Leave your details
              only if you would like a seat held and a call before the sale.
            </p>
            <div className="mt-8">
              <AuctionJoinForm
                sessions={sessions.map((s) => ({
                  id: s.id,
                  label: sessionDateShort(s.startAt)
                    ? `${s.title} — ${sessionDateShort(s.startAt)}`
                    : s.title,
                }))}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </div>
        )}

        {/* ——— the catalogue ——— */}
        {allLots.length > 0 && (
          <div
            ref={catalogueRef}
            id="catalogue"
            className="mt-24 flex scroll-mt-24 flex-wrap items-center justify-center gap-3"
          >
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by lot, carpet, origin or weave…"
                aria-label="Search the auction"
                className="w-full rounded-full border border-gold/25 bg-surface/60 py-3 pl-11 pr-10 text-sm text-cream placeholder:text-muted/70 transition-colors focus:border-gold focus:outline-none"
              />
              {q && (
                <button
                  type="button"
                  aria-label="Clear the search"
                  onClick={() => setQ("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-gold-light"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {cities.length > 1 && (
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="Filter by city"
                className="rounded-full border border-gold/25 bg-surface/60 px-5 py-3 text-sm text-cream transition-colors focus:border-gold focus:outline-none"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="mt-16 space-y-20">
          {shown.length === 0 ? (
            <p className="py-20 text-center text-muted">
              {sessions.length === 0
                ? "No carpets are at auction at the moment."
                : "No lots match this search."}
            </p>
          ) : (
            shown.map((session) => (
              <SessionBlock
                key={session.id}
                session={session}
                selected={session.id === selectedId}
                onParticipate={() => participate(session.id)}
                showingAll={!filtering}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function SessionBlock({
  session,
  selected,
  onParticipate,
  showingAll,
}: {
  session: SessionCard;
  selected: boolean;
  onParticipate: () => void;
  showingAll: boolean;
}) {
  const when = sessionDateShort(session.startAt);
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-gold/15 pb-5">
        <div>
          <span
            className={`inline-block rounded-full border px-3 py-1 text-[10px] tracking-[0.2em] ${
              session.status === "LIVE"
                ? "animate-pulse-glow border-crimson-light/60 bg-crimson/30 text-crimson-light"
                : "border-gold/40 bg-void/60 text-gold-light"
            }`}
          >
            {STATUS_LABEL[session.status] ?? session.status}
          </span>
          <h2 className="mt-3 font-display text-3xl text-silk sm:text-4xl">
            {session.title}
          </h2>
          <p className="mt-2 text-[11px] tracking-[0.25em] text-gold/70">
            {when ? `${when} · ` : ""}
            {session.lots.length} LOT{session.lots.length === 1 ? "" : "S"}
            {!showingAll ? " MATCHING" : ""}
            {session.registrations > 0
              ? ` · ${session.registrations} REGISTERED`
              : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={onParticipate}
          className={`rounded-full border px-7 py-3 text-xs tracking-[0.25em] transition-colors ${
            selected
              ? "border-gold bg-gold text-void"
              : "border-gold/60 bg-gold/5 text-gold-light hover:bg-gold hover:text-void"
          }`}
        >
          {selected ? "SELECTED FOR REGISTRATION" : "RESERVE A SEAT (OPTIONAL)"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {session.lots.map((lot, i) => (
          <LotTile key={lot.id} lot={lot} index={i} currency={session.currency} />
        ))}
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="text-[11px] leading-relaxed text-cream/60">
      <span className="text-gold/70">{label}:</span> {value}
    </p>
  );
}

function LotTile({
  lot,
  index,
  currency,
}: {
  lot: LotCard;
  index: number;
  currency: string;
}) {
  const estimate =
    lot.estimateLow &&
    `${formatCurrency(lot.estimateLow, currency)}${
      lot.estimateHigh
        ? `–${Number(lot.estimateHigh).toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })}`
        : ""
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: (index % PER_ROW) * 0.14 }}
      viewport={{ once: true, margin: "-60px" }}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-gold/10 bg-surface transition-colors hover:border-gold/40"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {/* contain: the whole carpet stays visible, never cropped to fit */}
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-110"
          style={{ backgroundImage: `url(${lot.image})` }}
        />

        <span className="absolute right-4 top-4 rounded-full border border-gold/30 bg-void/60 px-3 py-1 text-xs text-gold-light backdrop-blur">
          {lot.city}
        </span>

        {/* The photograph opens the lot. Someone browsing a sale wants to
            look at the carpet, not be sent to a form — registering is a
            separate, optional step at the top of the page. */}
        <Link
          href={`/auctions/lot/${lot.id}`}
          aria-label={`View ${lot.lotName ?? lot.artworkTitle} in full`}
          className="absolute inset-0 flex items-end justify-center bg-void/40 pb-5 opacity-0 backdrop-blur-[1px] transition-opacity duration-500 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <span className="text-[11px] tracking-[0.25em] text-cream/85 underline-offset-4 group-hover:text-gold-light group-hover:underline">
            VIEW FULL LOT
          </span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs tracking-[0.25em] text-gold/70">
          {lot.lotNumber ? `LOT ${lot.lotNumber}` : lot.code}
        </p>
        <Link
          href={`/auctions/lot/${lot.id}`}
          className="mt-1 font-display text-2xl text-silk transition-colors hover:text-gold-light"
        >
          {lot.lotName || lot.artworkTitle}
        </Link>

        <div className="mt-3 space-y-1">
          <Spec label="Origin" value={lot.origin} />
          <Spec label="Era" value={lot.era} />
          <Spec label="Dimensions" value={lot.lotDimensions} />
          <Spec label="Materials" value={lot.materials} />
          <Spec label="Weave" value={lot.weave} />
          <Spec label="Condition" value={lot.condition} />
        </div>

        {lot.lotNote && (
          <p className="mt-3 text-[11px] leading-relaxed text-cream/55">
            <span className="text-gold/70">Lot Note:</span>{" "}
            <RichText text={lot.lotNote} inline />
          </p>
        )}

        <div className="mt-auto space-y-1 pt-4">
          {estimate ? (
            <p className="text-sm text-gold">
              <span className="text-[10px] tracking-[0.25em] text-muted">
                ESTIMATED VALUE{" "}
              </span>
              {estimate}
            </p>
          ) : (
            <p className="text-sm text-gold">
              <span className="text-[10px] tracking-[0.25em] text-muted">
                STARTING AT{" "}
              </span>
              {formatCurrency(lot.startingPrice, currency)}
            </p>
          )}
          {lot.publishedReserve && (
            <p className="text-xs text-cream/70">
              <span className="text-[10px] tracking-[0.25em] text-muted">
                PUBLISHED RESERVE{" "}
              </span>
              {formatCurrency(lot.publishedReserve, currency)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
