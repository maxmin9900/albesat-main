"use client";

import { useActionState, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  ShieldCheck,
  Headphones,
  Sparkles,
  X,
  ChevronRight,
} from "lucide-react";
import { acquirePiece, type AcquireState } from "@/app/collection/[id]/actions";
import { formatCurrency, isVideoUrl } from "@/lib/utils";
import { CONTACT } from "@/lib/contact";
import { Zoomable, ZoomButton } from "@/components/ui/Lightbox";
import RichText from "@/components/ui/RichText";

export type DetailArtwork = {
  id: string;
  code: string;
  title: string;
  city: string;
  category: string;
  price: string;
  currency: string;
  dimensions: string | null;
  pileMaterial: string | null;
  approxAge: string | null;
  description: string | null;
  status: string;
  /** first photo/clip — used for the woven-detail vignette */
  image: string;
  /** everything uploaded for this piece, in the admin's order */
  media: { id: string; url: string }[];
  dossier: {
    origin: string | null;
    authentication: string | null;
    craftStory: string | null;
    artisan: string | null;
    collection: string | null;
  } | null;
};

export type RelatedItem = {
  id: string;
  title: string;
  city: string;
  price: string;
  currency: string;
  image: string;
};

export type DetailViewer = {
  name: string;
  address: string | null;
} | null;

const fadeUp = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

export default function ArtworkDetail({
  artwork,
  related,
  viewer = null,
}: {
  artwork: DetailArtwork;
  related: RelatedItem[];
  viewer?: DetailViewer;
}) {
  const [active, setActive] = useState(0);
  const [acquireOpen, setAcquireOpen] = useState(false);

  const price = formatCurrency(Number(artwork.price), artwork.currency);

  // the real uploads; falls back to the single cover image for older pieces
  const media = artwork.media.length
    ? artwork.media
    : [{ id: "cover", url: artwork.image }];
  const current = media[Math.min(active, media.length - 1)];
  const isVideo = isVideoUrl(current.url);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-28">
      {/* breadcrumb */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-8 flex items-center gap-2 text-[10px] tracking-[0.3em] text-muted"
      >
        <a href="/collection" className="transition-colors hover:text-gold-light">
          COLLECTIONS
        </a>
        <ChevronRight className="h-3 w-3" />
        <a
          href={`/collection?city=${artwork.city.toLowerCase()}`}
          className="transition-colors hover:text-gold-light"
        >
          {artwork.city.toUpperCase()}
        </a>
        <ChevronRight className="h-3 w-3" />
        <span className="text-cream/70">{artwork.title.toUpperCase()}</span>
      </motion.nav>

      {/* ---------- gallery + acquisition card ---------- */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.15fr_1fr]">
        {/* gallery */}
        <div>
          <Zoomable
            items={media.map((m) => ({ url: m.url, alt: artwork.title }))}
            index={Math.min(active, media.length - 1)}
            caption={artwork.title}
          >
          {/* No fixed ratio and no cover crop: the frame takes the shape of
              the photograph the admin uploaded, so a runner stays long and a
              room-size rug stays wide. Only the height is bounded, to keep a
              very tall piece on one screen. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative overflow-hidden rounded-xl border border-gold/15 bg-void shadow-glow-gold"
          >
            {isVideo ? (
              <video
                key={current.url}
                src={current.url}
                controls
                playsInline
                className="block max-h-[78vh] w-full object-contain"
              />
            ) : (
              /* keyed on the url: React swaps the element and the fade plays
                 again, without an exit animation collapsing the box first */
              <motion.img
                key={current.url}
                src={current.url}
                alt={artwork.title}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                draggable={false}
                className="block max-h-[78vh] w-full object-contain"
              />
            )}
          </motion.div>
          </Zoomable>

          {/* every photo and clip uploaded for this piece */}
          {media.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {media.map((item, i) => (
                <motion.button
                  type="button"
                  key={item.id}
                  onClick={() => setActive(i)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.06, duration: 0.5 }}
                  className={`group ${
                    i === active ? "" : "opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`View media ${i + 1} of ${media.length}`}
                  aria-current={i === active}
                >
                  <span
                    className={`block aspect-square overflow-hidden rounded-lg border transition-all ${
                      i === active
                        ? "border-gold shadow-[0_0_18px_rgba(201,162,75,0.35)]"
                        : "border-gold/10"
                    }`}
                  >
                    {isVideoUrl(item.url) ? (
                      <span className="flex h-full w-full items-center justify-center bg-void text-[9px] tracking-widest text-gold/70">
                        VIDEO
                      </span>
                    ) : (
                      <span
                        className="block h-full w-full bg-contain bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${item.url})` }}
                      />
                    )}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* acquisition card */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
        >
          <div className="rounded-xl border border-gold/20 bg-surface/60 p-8 backdrop-blur">
            <div className="flex items-center gap-3 text-[10px] tracking-[0.3em] text-muted">
              <span className="rounded-full border border-gold/30 px-3 py-1 text-gold-light">
                {artwork.status === "SOLD" ? "SOLD" : "AVAILABLE"}
              </span>
              <span>{artwork.code}</span>
            </div>

            <h1 className="mt-4 font-display text-4xl text-silk sm:text-5xl">
              {artwork.title}
            </h1>
            <p className="mt-2 text-sm tracking-[0.2em] text-cream/60">
              {artwork.city.toUpperCase()} · {artwork.category.toUpperCase()}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-gold/10 py-4 text-xs">
              <div>
                <p className="text-muted">DIMENSIONS</p>
                <p className="mt-1 text-cream/90">{artwork.dimensions ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted">MATERIAL</p>
                <p className="mt-1 text-cream/90">{artwork.pileMaterial ?? "—"}</p>
              </div>
            </div>

            <p className="mt-6 text-[10px] tracking-[0.3em] text-muted">
              VALUATION
            </p>
            <p className="font-display text-4xl text-gradient-gold">{price}</p>

            {artwork.status !== "SOLD" ? (
              <>
                {viewer ? (
                  <button
                    type="button"
                    onClick={() => setAcquireOpen(true)}
                    className="mt-7 block w-full rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3.5 text-center text-sm font-semibold tracking-[0.2em] text-void transition-all hover:brightness-110"
                  >
                    ACQUIRE THIS PIECE
                  </button>
                ) : (
                  <a
                    href={`/login?next=${encodeURIComponent(`/collection/${artwork.id}`)}`}
                    className="mt-7 block w-full rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3.5 text-center text-sm font-semibold tracking-[0.2em] text-void transition-all hover:brightness-110"
                  >
                    SIGN IN TO ACQUIRE
                  </a>
                )}
                <a
                  href={`${CONTACT.emailHref}?subject=Consultation%20request`}
                  className="mt-3 block w-full rounded border border-gold/40 py-3.5 text-center text-sm tracking-[0.2em] text-gold-light transition-colors hover:bg-gold/10"
                >
                  REQUEST CONSULTATION
                </a>
              </>
            ) : (
              <p className="mt-7 rounded border border-amber-400/40 py-3 text-center text-sm tracking-[0.2em] text-amber-300">
                THIS PIECE HAS BEEN SOLD
              </p>
            )}

            <a
              href="/auctions"
              className="mt-5 block text-center text-[10px] tracking-[0.35em] text-muted transition-colors hover:text-gold-light"
            >
              JOIN PRIVATE AUCTION
            </a>
          </div>
        </motion.div>
      </div>

      {/* ---------- quote + story ---------- */}
      <motion.div {...fadeUp} transition={{ duration: 0.8 }} className="mt-24 text-center">
        <p className="mx-auto max-w-2xl font-display text-3xl italic leading-snug text-silk sm:text-4xl">
          &ldquo;The medallion is not merely a center point, but a sun around
          which the entire garden of the weaver&rsquo;s soul revolves.&rdquo;
        </p>
      </motion.div>

      <div className="mt-16 grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        <motion.div {...fadeUp} transition={{ duration: 0.8 }}>
          <RichText
            text={artwork.description || artwork.dossier?.craftStory}
            className="leading-loose text-cream/75"
            paragraphClassName="mt-5 first:mt-0"
          />
          {artwork.dossier?.artisan && (
            <p className="mt-6 text-sm text-muted">
              Woven by{" "}
              <span className="text-gold-light">{artwork.dossier.artisan}</span>
              {artwork.dossier.collection
                ? ` · ${artwork.dossier.collection}`
                : ""}
            </p>
          )}
          <a
            href={`/collection?city=${artwork.city.toLowerCase()}`}
            className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.3em] text-gold transition-colors hover:text-gold-light"
          >
            EXPLORE THE WEAVER&apos;S LEGACY <ChevronRight className="h-3 w-3" />
          </a>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.9 }}
          className="relative mx-auto"
        >
          <Zoomable src={artwork.image} alt={artwork.title} caption={artwork.title} className="rounded-full">
            <div
              className="h-72 w-72 rounded-full border border-gold/25 bg-cover shadow-glow-gold sm:h-80 sm:w-80"
              style={{
                backgroundImage: `url(${artwork.image})`,
                backgroundSize: "300%",
                backgroundPosition: "50% 45%",
              }}
            />
          </Zoomable>
          <div className="absolute -bottom-4 -right-2 w-44 rounded border border-gold/20 bg-void/90 p-3 text-[10px] leading-relaxed text-cream/70 backdrop-blur">
            <p className="mb-1 tracking-[0.25em] text-gold">WOVEN DETAIL</p>
            Observe the natural luminescence of the vegetable-dyed threads.
          </div>
        </motion.div>
      </div>

      {/* ---------- provenance & craft ---------- */}
      <motion.div {...fadeUp} transition={{ duration: 0.8 }} className="mt-24">
        <p className="text-[10px] tracking-[0.4em] text-gold">DOSSIER</p>
        <h2 className="mt-2 font-display text-3xl text-silk">
          Provenance &amp; Craft
        </h2>
        <div className="mt-3 h-px w-14 bg-gold" />

        <dl className="mt-10 grid grid-cols-1 gap-x-16 gap-y-1 sm:grid-cols-2">
          {(
            [
              ["ORIGIN", artwork.dossier?.origin ?? artwork.city],
              ["DIMENSIONS", artwork.dimensions],
              ["PILE MATERIAL", artwork.pileMaterial],
              ["AGE", artwork.approxAge],
              ["AUTHENTICATION", artwork.dossier?.authentication],
            ] as [string, string | null | undefined][]
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between border-b border-gold/10 py-3"
            >
              <dt className="text-[10px] tracking-[0.3em] text-muted">{label}</dt>
              <dd className="text-right text-sm text-cream/90">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </motion.div>

      {/* ---------- ownership experience ---------- */}
      <motion.div {...fadeUp} transition={{ duration: 0.8 }} className="mt-24 text-center">
        <p className="text-[10px] tracking-[0.4em] text-gold">SERVICE</p>
        <h2 className="mt-2 font-display text-3xl text-silk">
          The Ownership Experience
        </h2>
      </motion.div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            [Truck, "White Glove Delivery", "Complimentary climate-controlled transport and professional in-home installation worldwide."],
            [ShieldCheck, "Certificate of Authenticity", "Dossier of provenance signed by our master curators, verifying age, origin, and material."],
            [Headphones, "Expert Consultation", "Private 1-on-1 session with our textile historians to discuss placement and lighting."],
            [Sparkles, "Lifetime Support", "Ongoing professional restoration advice and cleaning services for the duration of ownership."],
          ] as [typeof Truck, string, string][]
        ).map(([Icon, title, body], i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: i * 0.12 }}
            className="rounded border border-gold/15 bg-surface/40 p-6 text-left"
          >
            <Icon className="h-5 w-5 text-gold" />
            <p className="mt-4 text-sm font-semibold text-silk">{title}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{body}</p>
          </motion.div>
        ))}
      </div>

      {/* ---------- more from this city ---------- */}
      {related.length > 0 && (
        <motion.div {...fadeUp} transition={{ duration: 0.8 }} className="mt-24">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] tracking-[0.4em] text-gold">DISCOVERY</p>
              <h2 className="mt-2 font-display text-3xl text-silk">
                More from {artwork.city}
              </h2>
              <div className="mt-3 h-px w-14 bg-gold" />
            </div>
            <a
              href="/collection"
              className="hidden items-center gap-2 text-[10px] tracking-[0.3em] text-gold transition-colors hover:text-gold-light sm:inline-flex"
            >
              VIEW FULL COLLECTION <ChevronRight className="h-3 w-3" />
            </a>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {related.map((r, i) => (
              <motion.a
                key={r.id}
                href={`/collection/${r.id}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="group overflow-hidden rounded-lg border border-gold/10 bg-surface"
              >
                <span className="relative block aspect-[4/5] overflow-hidden">
                  <span
                    className="block h-full w-full bg-contain bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${r.image})` }}
                  />
                  <ZoomButton src={r.image} alt={r.title} caption={r.title} />
                </span>
                <span className="block p-4">
                  <span className="block font-display text-lg text-silk transition-colors group-hover:text-gold-light">
                    {r.title}
                  </span>
                  <span className="mt-1 block text-sm text-gold">
                    {formatCurrency(Number(r.price), r.currency)}
                  </span>
                </span>
              </motion.a>
            ))}
          </div>
        </motion.div>
      )}

      {/* ---------- acquire modal ---------- */}
      <AnimatePresence>
        {acquireOpen && (
          <AcquireModal
            artwork={artwork}
            viewer={viewer}
            onClose={() => setAcquireOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Acquire This Piece — concierge order request                        */
/* ------------------------------------------------------------------ */

function AcquireModal({
  artwork,
  viewer,
  onClose,
}: {
  artwork: DetailArtwork;
  viewer: DetailViewer;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<AcquireState, FormData>(
    acquirePiece,
    {}
  );

  // session expired mid-visit → sign in and come back to this piece
  useEffect(() => {
    if (state.needLogin) {
      window.location.href = `/login?next=${encodeURIComponent(
        `/collection/${artwork.id}`
      )}`;
    }
  }, [state.needLogin, artwork.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 p-6 backdrop-blur-lg"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-gold/25 bg-surface p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-gold/30 p-1.5 text-gold hover:bg-gold/10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {state.ok ? (
          <div className="py-6 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-gold" />
            <h3 className="mt-4 font-display text-2xl text-silk">
              Request received
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-cream/70">
              Thank you. Our concierge will contact you shortly to arrange
              payment, authentication and white-glove delivery of{" "}
              <span className="text-gold-light">{artwork.title}</span>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full border border-gold px-6 py-2 text-sm text-gold hover:bg-gold hover:text-void"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="text-[10px] tracking-[0.35em] text-gold">
              PRIVATE ACQUISITION
            </p>
            <h3 className="mt-2 font-display text-3xl text-silk">
              {artwork.title}
            </h3>
            <p className="mt-1 text-sm text-cream/60">
              {formatCurrency(Number(artwork.price), artwork.currency)} ·{" "}
              {artwork.city}
            </p>

            <form action={formAction} className="mt-6 space-y-4">
              <input type="hidden" name="artworkId" value={artwork.id} />
              <div>
                <label className="mb-1 block text-xs tracking-[0.2em] text-muted">
                  FULL NAME
                </label>
                <input
                  name="customerName"
                  required
                  defaultValue={viewer?.name ?? ""}
                  className="w-full rounded border border-gold/20 bg-void/60 px-4 py-2.5 text-sm text-silk outline-none focus:border-gold"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs tracking-[0.2em] text-muted">
                  DELIVERY ADDRESS
                </label>
                <textarea
                  name="address"
                  required
                  rows={3}
                  defaultValue={viewer?.address ?? ""}
                  className="w-full rounded border border-gold/20 bg-void/60 px-4 py-2.5 text-sm text-silk outline-none focus:border-gold"
                  placeholder="Country, city, street…"
                />
              </div>
              {state.error && (
                <p className="text-sm text-crimson-light">{state.error}</p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3 text-sm font-semibold tracking-[0.2em] text-void transition-all hover:brightness-110 disabled:opacity-60"
              >
                {pending ? "SUBMITTING…" : "CONFIRM REQUEST"}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
