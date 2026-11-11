"use client";

import { forwardRef, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import CarpetWeave, { WEAVE_CAPTIONS } from "./CarpetWeave";
import PageBackdrop from "./PageBackdrop";
import { formatCurrency } from "@/lib/utils";

export type ArchiveWork = {
  id: string;
  title: string;
  city: string;
  citySlug: string;
  code: string;
  category: string;
  /** Artwork.pileMaterial — free text on the work, so "" when not recorded */
  material: string;
  price: string;
  currency: string;
  image: string;
  sold: boolean;
};

/**
 * A page of the gallery: six rows of three. The pagination below walks the
 * rest. PER_ROW also drives the reveal stagger, so a row lights up together
 * rather than the whole page cascading for two seconds.
 */
const PER_ROW = 3;
const ROWS_PER_PAGE = 6;
const PER_PAGE = PER_ROW * ROWS_PER_PAGE;

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function CollectionArchive({
  works,
  cities,
  categories,
  materials,
  weaveCity,
  weaveImage,
  initialCity,
}: {
  works: ArchiveWork[];
  cities: string[];
  categories: string[];
  materials: string[];
  /** slug of the carpet on the loom — the city clicked on the map, or the
      archive's first city when the visitor came in through the nav tab */
  weaveCity: string;
  weaveImage: string;
  /** city filter the page opens with, empty when nothing was picked */
  initialCity: string;
}) {
  // The carpet on the loom. It opens with the city's own photograph and
  // changes when a visitor picks a piece out of the gallery below.
  const [woven, setWoven] = useState({ cityKey: weaveCity, image: weaveImage });
  const loomRef = useRef<HTMLElement>(null);

  const weave = (cityKey: string, image: string) => {
    setWoven({ cityKey, image });
    // back to the top of the track, where the warp is still bare — the
    // visitor scrolls down and watches this piece being made
    loomRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Loom ref={loomRef} cityKey={woven.cityKey} image={woven.image} />
      <PageBackdrop src="/backgrounds/collection.jpg" strength={0.55} position="60% 55%">
      <Gallery
        works={works}
        cities={cities}
        categories={categories}
        materials={materials}
        initialCity={initialCity}
        onWeave={weave}
        wovenImage={woven.image}
      />
      </PageBackdrop>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  the loom — an overture, then the carpet is woven as you scroll     */
/* ------------------------------------------------------------------ */

// Word by word, so the copy is read at the pace of the weaving behind it.
// The line breaks are authored, not wraps — client-approved wording, do not
// rewrite.
const OVERTURE = [
  "Explore a carefully selected collection of fine Persian and handmade",
  "carpets, chosen for their quality, craftsmanship, design, material,",
  "and character.",
];

// the second paragraph settles in under the headline once it has landed
const OVERTURE_SUB =
  "Whether you are looking for a classic Persian carpet, a decorative " +
  "piece, or a collectible rug, our team is ready to guide you with " +
  "honest advice and decades of carpet experience.";

const Loom = forwardRef<HTMLElement, { cityKey: string; image: string }>(
  function Loom({ cityKey, image }, forwardedRef) {
  const trackRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef as React.RefObject<HTMLElement>,
    offset: ["start start", "end end"],
  });

  // The first screen belongs to the sentence; the loom takes over once the
  // visitor scrolls past it. After that it is the home page's timeline: warp
  // rises, weft interlocks row by row, camera settles on the finished carpet.
  const introOpacity = useTransform(scrollYProgress, [0, 0.05, 0.13], [1, 1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.13], [0, -70]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.045], [1, 0]);

  const weaveProgress = useTransform(scrollYProgress, [0.12, 0.8], [0, 1]);
  const weaveScale = useTransform(scrollYProgress, [0.8, 0.96], [1.045, 1]);
  const captionOpacity = useTransform(
    scrollYProgress,
    [0.28, 0.38, 0.88, 0.97],
    [0, 1, 1, 0]
  );

  return (
    <section
      ref={(node) => {
        trackRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      className="relative h-[360vh] bg-void"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* The courtyard behind the opening words. The loom's canvas stays
            transparent until the weaving starts, so the photograph shows
            through here and fades with the overture; once the warp rises the
            canvas paints over it. */}
        <motion.div
          aria-hidden
          style={{ opacity: introOpacity }}
          className="pointer-events-none absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/backgrounds/collection.jpg"
            alt=""
            className="h-full w-full object-cover opacity-60"
            draggable={false}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(5,5,10,0.55),rgba(5,5,10,0.85))]" />
        </motion.div>

        <motion.div style={{ scale: weaveScale }} className="absolute inset-0">
          <CarpetWeave
            progress={weaveProgress}
            cityKey={cityKey}
            image={image}
          />
        </motion.div>

        {/* ——— the overture ——— */}
        <motion.div
          style={{ opacity: introOpacity, y: introY }}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        >
          {/* a slow gold halo behind the words, so they sit in light rather
              than on flat black */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_50%,rgba(201,162,75,0.10),transparent_70%)]"
          />

          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={{ opacity: 1, letterSpacing: "0.4em" }}
            transition={{ duration: 1.4, ease: EASE }}
            className="relative text-[11px] tracking-[0.4em] text-gold/70 ornament"
          >
            THE COLLECTION ARCHIVE
          </motion.p>

          {/* wide enough that each line of OVERTURE stays on its own line at
              desktop widths — the break between them is authored, not a wrap */}
          <h2 className="relative mt-8 max-w-5xl font-display text-xl leading-[1.45] sm:text-2xl md:text-[2rem] md:leading-[1.4]">
            {OVERTURE.map((line, li) => (
              <span key={li} className="block">
                {line.split(" ").map((word, wi) => {
                  // one running index across both lines keeps the stagger even
                  const n =
                    OVERTURE.slice(0, li).reduce(
                      (t, l) => t + l.split(" ").length,
                      0
                    ) + wi;
                  return (
                    <span key={wi}>
                      <motion.span
                        initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{
                          duration: 1,
                          ease: EASE,
                          delay: 0.4 + n * 0.09,
                        }}
                        className="inline-block text-gradient-gold-animated"
                      >
                        {word}
                      </motion.span>{" "}
                    </span>
                  );
                })}
              </span>
            ))}
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: 2.5 }}
            className="relative mt-7 max-w-2xl text-sm leading-relaxed text-cream/75 sm:text-base"
          >
            {OVERTURE_SUB}
          </motion.p>

          {/* the rule draws itself open once the last word has landed */}
          <motion.span
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.6, ease: EASE, delay: 3.1 }}
            className="relative mt-9 block h-px w-40 origin-center bg-gradient-to-r from-transparent via-gold to-transparent"
          />
        </motion.div>

        {/* ——— scroll hint ——— */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-[6vh] z-20 flex flex-col items-center gap-3"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 3.8 }}
            className="text-[10px] tracking-[0.35em] text-gold/60"
          >
            SCROLL — WATCH IT BE WOVEN
          </motion.p>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{
              opacity: { duration: 1.2, delay: 3.8 },
              y: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 3.8 },
            }}
            className="text-gold/60"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </motion.div>

        <motion.p
          style={{ opacity: captionOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-[7vh] z-10 text-center text-xs tracking-[0.45em] text-gold-light/90 ornament"
        >
          {WEAVE_CAPTIONS[cityKey] ?? WEAVE_CAPTIONS.kashan}
        </motion.p>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  the gallery — search, filters, three carpets a page, stacked       */
/* ------------------------------------------------------------------ */

function Gallery({
  works,
  cities,
  categories,
  materials,
  initialCity,
  onWeave,
  wovenImage,
}: {
  works: ArchiveWork[];
  cities: string[];
  categories: string[];
  materials: string[];
  initialCity: string;
  /** put this carpet on the loom and carry the visitor back up to it */
  onWeave: (cityKey: string, image: string) => void;
  /** the one currently being woven, so its card can show it */
  wovenImage: string;
}) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState("");
  const [material, setMaterial] = useState("");
  const [page, setPage] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return works.filter((w) => {
      if (city && w.city !== city) return false;
      if (category && w.category !== category) return false;
      if (material && w.material !== material) return false;
      if (!needle) return true;
      return [w.title, w.code, w.city, w.category, w.material].some((f) =>
        f.toLowerCase().includes(needle)
      );
    });
  }, [works, q, city, category, material]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  // a filter change can leave the visitor past the end of the shorter list
  const current = Math.min(page, pages - 1);
  const from = current * PER_PAGE;
  const shown = filtered.slice(from, from + PER_PAGE);
  const paged = filtered.length > PER_PAGE;

  const reset = (fn: () => void) => {
    fn();
    setPage(0);
  };

  // paging keeps the first carpet of the new page where the eye already is
  const goto = (n: number) => {
    setPage(((n % pages) + pages) % pages);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filtering = Boolean(q || city || category || material);

  return (
    <section className="relative z-10 px-6 pb-28 pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm tracking-[0.4em] text-gold/60 ornament">
            THE COLLECTION
          </p>
          <h1 className="mt-4 font-display text-4xl text-silk sm:text-6xl">
            {city || "Featured Works"}
          </h1>
        </div>

        {/* search + filters */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/50" />
            <input
              value={q}
              onChange={(e) => reset(() => setQ(e.target.value))}
              placeholder="Search by carpet, code, city or style…"
              aria-label="Search the collection"
              className="w-full rounded-full border border-gold/25 bg-surface/60 py-3 pl-11 pr-10 text-sm text-cream placeholder:text-muted/70 transition-colors focus:border-gold focus:outline-none"
            />
            {q && (
              <button
                type="button"
                aria-label="Clear the search"
                onClick={() => reset(() => setQ(""))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-gold-light"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={city}
            onChange={(e) => reset(() => setCity(e.target.value))}
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

          <select
            value={category}
            onChange={(e) => reset(() => setCategory(e.target.value))}
            aria-label="Filter by style"
            className="rounded-full border border-gold/25 bg-surface/60 px-5 py-3 text-sm text-cream transition-colors focus:border-gold focus:outline-none"
          >
            <option value="">All styles</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Pile material is free text on the work, so these options are the
              values actually recorded in the archive — an empty list means no
              piece has one yet, and the control stays out of the way. */}
          {materials.length > 0 && (
            <select
              value={material}
              onChange={(e) => reset(() => setMaterial(e.target.value))}
              aria-label="Filter by material"
              className="rounded-full border border-gold/25 bg-surface/60 px-5 py-3 text-sm text-cream transition-colors focus:border-gold focus:outline-none"
            >
              <option value="">All materials</option>
              {materials.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {filtering && (
            <button
              type="button"
              onClick={() =>
                reset(() => {
                  setQ("");
                  setCity("");
                  setCategory("");
                  setMaterial("");
                })
              }
              className="rounded-full border border-gold/25 px-5 py-3 text-sm text-cream/70 transition-colors hover:border-gold hover:text-gold-light"
            >
              Clear
            </button>
          )}
        </div>

        {/* the carpets — three to a row, six rows to a page */}
        <div ref={listRef} className="mt-14 scroll-mt-24">
          {filtered.length === 0 ? (
            <p className="py-20 text-center text-muted">
              No carpets match this search.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((w, i) => (
                // keyed by page too, so the reveal replays on every page turn
                <Card
                  key={`${current}-${w.id}`}
                  work={w}
                  index={i}
                  onWeave={onWeave}
                  woven={w.image === wovenImage}
                />
              ))}
            </div>
          )}
        </div>

        {paged && (
          <Pagination
            page={current}
            pages={pages}
            from={from + 1}
            to={Math.min(from + PER_PAGE, filtered.length)}
            total={filtered.length}
            onGo={goto}
          />
        )}
      </div>
    </section>
  );
}

function Pagination({
  page,
  pages,
  from,
  to,
  total,
  onGo,
}: {
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  onGo: (n: number) => void;
}) {
  const btn =
    "flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 text-cream/70 transition-colors hover:border-gold hover:text-gold-light disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="mt-14 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onGo(page - 1)}
          className={btn}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageWindow(page, pages).map((k, i) =>
          k === null ? (
            <span key={`gap${i}`} className="px-1 text-muted">
              …
            </span>
          ) : (
            <button
              key={k}
              type="button"
              aria-label={`Page ${k + 1}`}
              aria-current={k === page ? "page" : undefined}
              onClick={() => onGo(k)}
              className={`h-10 w-10 rounded-full border text-sm transition-colors ${
                k === page
                  ? "border-gold bg-gold text-void"
                  : "border-gold/25 text-cream/70 hover:border-gold hover:text-gold-light"
              }`}
            >
              {k + 1}
            </button>
          )
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={page === pages - 1}
          onClick={() => onGo(page + 1)}
          className={btn}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="text-[11px] tracking-[0.25em] text-muted">
        SHOWING {from}–{to} OF {total}
      </p>
    </div>
  );
}

/**
 * Which page numbers to print. Eighteen carpets to a page means a big archive
 * still reaches double-digit page counts, so past seven pages the row keeps
 * the first, the last, and the current one's neighbours, with `null` standing
 * in for an ellipsis.
 */
function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, k) => k);

  const out: (number | null)[] = [0];
  const from = Math.max(1, Math.min(page - 1, pages - 4));
  const to = Math.min(pages - 2, Math.max(page + 1, 3));

  if (from > 1) out.push(null);
  for (let k = from; k <= to; k++) out.push(k);
  if (to < pages - 2) out.push(null);
  out.push(pages - 1);
  return out;
}

function Card({
  work,
  index,
  onWeave,
  woven,
}: {
  work: ArchiveWork;
  index: number;
  onWeave: (cityKey: string, image: string) => void;
  woven: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      // stagger across the row, not across the page — with eighteen cards a
      // running delay would leave the last one arriving two seconds late
      transition={{ duration: 0.9, ease: EASE, delay: (index % PER_ROW) * 0.14 }}
      viewport={{ once: true, margin: "-60px" }}
      className={`group h-full overflow-hidden rounded-lg border bg-surface transition-colors ${
        woven ? "border-gold" : "border-gold/10 hover:border-gold/40"
      }`}
    >
      {/* contain, not cover: a carpet is photographed at whatever ratio it
          is, and cropping a runner or a room-size rug to fit a 4:5 frame
          cuts the border off the piece. The card keeps its shape so the
          grid stays even; the photograph sits whole inside it. */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-110"
          style={{ backgroundImage: `url(${work.image})` }}
        />

        {/* The frame puts this carpet on the loom. The photograph is the
            control — pressing it carries the visitor back up to the top of
            the track, where the warp is bare, to watch this piece be made. */}
        <button
          type="button"
          onClick={() => onWeave(work.citySlug, work.image)}
          aria-label={`Weave ${work.title} on the loom`}
          className="group/weave absolute inset-0 cursor-pointer"
        >
          <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[10px] tracking-[0.3em] text-gold-light opacity-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-opacity duration-500 group-hover:opacity-90">
            WEAVE THIS CARPET
          </span>
        </button>

        <span className="pointer-events-none absolute right-4 top-4 rounded-full border border-gold/30 bg-void/60 px-3 py-1 text-xs text-gold-light backdrop-blur">
          {work.city}
        </span>
        {work.sold && (
          <span className="pointer-events-none absolute left-4 top-4 rounded-full border border-crimson-light/60 bg-crimson/30 px-3 py-1 text-xs tracking-[0.2em] text-crimson-light backdrop-blur">
            SOLD
          </span>
        )}
        {woven && (
          <span className="pointer-events-none absolute left-4 top-4 rounded-full border border-gold bg-gold/20 px-3 py-1 text-[10px] tracking-[0.25em] text-gold-light backdrop-blur">
            ON THE LOOM
          </span>
        )}

        {/* Details keep their own control, but down at the foot of the
            frame. Centred, it swallowed every click aimed at the carpet —
            the body of the photograph has to belong to the loom. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-void/80 to-transparent pb-5 pt-10 opacity-0 transition-opacity duration-500 focus-within:opacity-100 group-hover:opacity-100">
          <Link
            href={`/collection/${work.id}`}
            className="pointer-events-auto border border-gold bg-void/70 px-5 py-2.5 text-[11px] tracking-[0.25em] text-gold-light backdrop-blur transition-colors hover:bg-gold hover:text-void"
          >
            VIEW DETAILS →
          </Link>
        </span>
      </div>

      <div className="p-5">
        <p className="text-xs tracking-widest text-muted">{work.code}</p>
        <Link
          href={`/collection/${work.id}`}
          className="mt-1 block font-display text-2xl text-silk transition-colors hover:text-gold-light"
        >
          {work.title}
        </Link>
        <p className="mt-1 text-[11px] tracking-[0.25em] text-gold/70">
          {work.city.toUpperCase()} · {work.category.toUpperCase()}
        </p>
        <p className="mt-3 text-gold">
          {formatCurrency(work.price, work.currency)}
        </p>
      </div>
    </motion.div>
  );
}
