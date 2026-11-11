import { prisma } from "@/lib/prisma";
import LandingNav from "@/components/landing/LandingNav";
import SiteFooter from "@/components/landing/SiteFooter";
import AuctionGallery, {
  type SessionCard,
} from "@/components/landing/AuctionGallery";
import { OPEN_FOR_REGISTRATION } from "@/lib/auction/registration";

export const dynamic = "force-dynamic";

/**
 * The sale sessions currently open, each with its carpets.
 *
 * Registration is per session, not per carpet: the form at the top of the
 * page takes the session, and "Participate in auction" on any lot selects
 * that lot's session and scrolls up to it. The live bidding room
 * (/auctions/[id]) is still there behind the LIVE_AUCTION_ROOMS flag.
 */
export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; lot?: string; registered?: string }>;
}) {
  // "?session=<id>" preselects it in the form; "?lot=" is the old link shape
  const sp = await searchParams;
  const preselect = sp.session ?? sp.lot ?? "";

  const auctions = await prisma.auction.findMany({
    where: { status: { in: OPEN_FOR_REGISTRATION } },
    orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
    include: {
      lots: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          artwork: {
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
          },
        },
      },
      _count: { select: { registrations: true } },
    },
  });

  const sessions: SessionCard[] = auctions
    // a session with no carpets on it has nothing to show a visitor
    .filter((a) => a.lots.length > 0)
    .map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      currency: a.currency,
      startAt: a.startAt ? a.startAt.toISOString() : null,
      endAt: a.endAt ? a.endAt.toISOString() : null,
      registrations: a._count.registrations,
      venueName: a.venueName,
      venueAddress: a.venueAddress,
      venueHall: a.venueHall,
      intro: a.intro,
      viewingFrom: a.viewingFrom,
      viewingTo: a.viewingTo,
      lots: a.lots.map((lot) => ({
        id: lot.id,
        artworkId: lot.artworkId,
        artworkTitle: lot.artwork.title,
        code: lot.artwork.code,
        city: lot.artwork.city,
        category: lot.artwork.category,
        image:
          lot.artwork.images[0]?.url ??
          `/carpets/${lot.artwork.city.toLowerCase()}-1.jpg`,
        startingPrice: lot.startingPrice
          ? lot.startingPrice.toString()
          : (Number(a.startingPrice) > 0 ? a.startingPrice : a.basePrice).toString(),

        lotNumber: lot.lotNumber,
        lotName: lot.lotName,
        origin: lot.origin,
        era: lot.era,
        lotDimensions: lot.lotDimensions,
        materials: lot.materials,
        weave: lot.weave,
        condition: lot.condition,
        estimateLow: lot.estimateLow ? lot.estimateLow.toString() : null,
        estimateHigh: lot.estimateHigh ? lot.estimateHigh.toString() : null,
        publishedReserve: lot.publishedReserve
          ? lot.publishedReserve.toString()
          : null,
        lotNote: lot.lotNote,
      })),
    }));

  return (
    <main className="min-h-screen bg-void">
      <LandingNav />
      <AuctionGallery
        sessions={sessions}
        initialSessionId={preselect}
        justRegistered={sp.registered === "1"}
      />
      <SiteFooter />
    </main>
  );
}
