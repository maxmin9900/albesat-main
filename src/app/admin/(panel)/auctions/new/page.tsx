import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import AuctionForm from "@/components/admin/AuctionForm";
import { AUCTION_DEFAULTS } from "@/lib/auction/config";
import { LIVE_AUCTION_ROOMS } from "@/lib/auction/flags";

export const dynamic = "force-dynamic";

export default async function NewAuctionPage() {
  // Available (PUBLISHED) works that are not already a lot in an open
  // session. A work with no appraisal is still listable — the opening price
  // is typed on the form.
  const artworks = await prisma.artwork.findMany({
    where: {
      status: "PUBLISHED",
      lots: {
        none: {
          auction: {
            status: { in: ["DRAFT", "SCHEDULED", "REGISTRATION_OPEN", "LIVE"] },
          },
        },
      },
    },
    select: {
      id: true, title: true, code: true, city: true, currency: true,
      intrinsicValue: true, approxAge: true, dimensions: true,
      pileMaterial: true, condition: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Create auction"
        subtitle={
          LIVE_AUCTION_ROOMS
            ? "Open a live auction room on an available work"
            : "Put an available work up for auction and collect registrations"
        }
      />
      <AuctionForm
        defaults={AUCTION_DEFAULTS}
        roomsEnabled={LIVE_AUCTION_ROOMS}
        artworks={artworks.map((a) => ({
          id: a.id,
          label: `${a.title} — ${a.city} (${a.code})`,
          intrinsicValue: a.intrinsicValue ? a.intrinsicValue.toFixed(2) : null,
          currency: a.currency,
          title: a.title,
          city: a.city,
          approxAge: a.approxAge,
          dimensions: a.dimensions,
          pileMaterial: a.pileMaterial,
          condition: a.condition,
        }))}
      />
    </div>
  );
}
