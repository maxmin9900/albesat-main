import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/landing/SiteFooter";
import LotViewer from "@/components/landing/LotViewer";
import RichText from "@/components/ui/RichText";
import { formatCurrency, formatDimensions } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * One lot, in full — where registering lands you.
 *
 * Keyed on the lot, not the session: a session holds several carpets and
 * each needs its own page. `?registered=1` only decides whether the
 * confirmation banner shows; the page itself is public, so the link survives
 * being shared or bookmarked.
 */
export default async function LotPage({
  params,
  searchParams,
}: {
  params: Promise<{ lotId: string }>;
  searchParams: Promise<{ registered?: string }>;
}) {
  const [{ lotId }, { registered }] = await Promise.all([params, searchParams]);

  const lot = await prisma.auctionLot.findUnique({
    where: { id: lotId },
    include: {
      artwork: {
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          dossier: true,
        },
      },
      auction: {
        include: { _count: { select: { registrations: true } } },
      },
    },
  });
  if (!lot) notFound();

  const auction = lot.auction;
  const art = lot.artwork;
  const media = art.images.length
    ? art.images.map((i) => ({ id: i.id, url: i.url }))
    : [{ id: "cover", url: `/carpets/${art.city.toLowerCase()}-1.jpg` }];
  const starting =
    lot.startingPrice ??
    (Number(auction.startingPrice) > 0 ? auction.startingPrice : auction.basePrice);

  // "OMR 2,500–4,000", or just the low figure when no high one was given
  const estimate = lot.estimateLow
    ? `${formatCurrency(lot.estimateLow.toString(), auction.currency)}${
        lot.estimateHigh
          ? `–${Number(lot.estimateHigh).toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}`
          : ""
      }`
    : null;

  return (
    <main className="min-h-screen bg-void">
      <LandingNav />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <nav className="mb-8 flex items-center gap-2 text-[10px] tracking-[0.3em] text-muted">
          <Link href="/auctions" className="transition-colors hover:text-gold-light">
            AUCTIONS
          </Link>
          <span className="text-gold/40">›</span>
          <span className="text-cream/70">{art.title.toUpperCase()}</span>
        </nav>

        {registered === "1" && (
          <div className="mb-10 flex items-start gap-4 rounded-xl border border-gold/35 bg-gold/5 px-6 py-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-light" />
            <div>
              <p className="font-display text-xl text-gold-light">
                You are registered for this sale.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-cream/75">
                Your place covers every lot in {auction.title}. Our team will
                contact you on the number you gave us with the reserve, the
                viewing arrangements, and how bidding works. In the meantime,
                here is the carpet in full.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <LotViewer media={media} title={art.title} />

          <aside className="space-y-6">
            <div className="rounded-xl border border-gold/15 bg-surface/60 p-7">
              <p className="text-[10px] tracking-[0.3em] text-gold/70">
                {lot.lotNumber ? `LOT ${lot.lotNumber}` : `LOT ${art.code}`}
              </p>
              <h1 className="mt-3 font-display text-3xl text-silk">
                {lot.lotName ?? art.title}
              </h1>
              <p className="mt-2 text-[11px] tracking-[0.25em] text-gold/70">
                {art.city.toUpperCase()} · {art.category.toUpperCase()}
              </p>

              {/* the printed estimate, when there is one — the starting price
                  is what the lot opens at and stands in until then */}
              <div className="mt-6 border-t border-gold/10 pt-5">
                {estimate ? (
                  <>
                    <p className="text-[10px] tracking-[0.25em] text-muted">
                      ESTIMATED VALUE
                    </p>
                    <p className="mt-1 font-display text-3xl text-gold">
                      {estimate}
                    </p>
                    {lot.publishedReserve && (
                      <p className="mt-3 text-sm text-cream/75">
                        <span className="text-[10px] tracking-[0.25em] text-muted">
                          PUBLISHED RESERVE{" "}
                        </span>
                        {formatCurrency(
                          lot.publishedReserve.toString(),
                          auction.currency
                        )}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[10px] tracking-[0.25em] text-muted">
                      STARTING PRICE
                    </p>
                    <p className="mt-1 font-display text-3xl text-gold">
                      {formatCurrency(starting.toString(), auction.currency)}
                    </p>
                  </>
                )}
              </div>

              {/* every catalogue field falls back to what the work records, so
                  a lot listed before its entry was written still reads fully */}
              <dl className="mt-6 space-y-4 border-t border-gold/10 pt-5">
                <Row label="ORIGIN" value={lot.origin ?? art.dossier?.origin ?? art.city} />
                <Row label="ERA" value={lot.era ?? art.approxAge} />
                <Row
                  label="DIMENSIONS"
                  value={
                    lot.lotDimensions ??
                    formatDimensions(art.lengthCm, art.widthCm) ??
                    art.dimensions
                  }
                />
                <Row label="MATERIALS" value={lot.materials ?? art.pileMaterial} />
                <Row label="WEAVE" value={lot.weave} />
                <Row label="CONDITION" value={lot.condition ?? art.condition} />
                <Row label="AUTHENTICATION" value={art.dossier?.authentication} />
              </dl>

              {lot.lotNote && (
                <div className="mt-6 border-t border-gold/10 pt-5">
                  <p className="text-[10px] tracking-[0.25em] text-muted">
                    LOT NOTE
                  </p>
                  <RichText
                    text={lot.lotNote}
                    className="mt-2 text-sm leading-relaxed text-cream/80"
                    paragraphClassName="mt-3 first:mt-0"
                  />
                </div>
              )}

              {auction._count.registrations > 1 && (
                <p className="mt-6 border-t border-gold/10 pt-5 text-xs text-muted">
                  {auction._count.registrations} collectors have registered for
                  this sale.
                </p>
              )}
            </div>

            {registered !== "1" && (
              <Link
                href={`/auctions?session=${auction.id}#register`}
                className="btn-gold-shimmer block rounded-full border border-gold/60 bg-gold/5 px-8 py-4 text-center text-sm tracking-[0.25em] text-gold-light transition-colors hover:bg-gold hover:text-void"
              >
                PARTICIPATE IN AUCTION
              </Link>
            )}

            <Link
              href="/auctions"
              className="block rounded-full border border-gold/30 px-8 py-3.5 text-center text-xs tracking-[0.25em] text-cream/75 transition-colors hover:border-gold hover:text-gold-light"
            >
              BACK TO ALL LOTS
            </Link>
          </aside>
        </div>

        {art.description && (
          <div className="mt-16 max-w-3xl">
            <p className="text-[10px] tracking-[0.3em] text-gold/70 ornament">
              ABOUT THIS CARPET
            </p>
            <RichText
              text={art.description}
              className="mt-5 text-sm leading-relaxed text-cream/75 sm:text-base"
              paragraphClassName="mt-4 first:mt-0"
            />
          </div>
        )}

        {art.dossier?.craftStory && (
          <div className="mt-10 max-w-3xl">
            <p className="text-[10px] tracking-[0.3em] text-gold/70">
              THE WEAVE
            </p>
            <RichText
              text={art.dossier.craftStory}
              className="mt-4 text-sm leading-relaxed text-cream/70"
              paragraphClassName="mt-4 first:mt-0"
            />
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10px] tracking-[0.25em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-cream/85">{value}</dd>
    </div>
  );
}
