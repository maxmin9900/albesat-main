// One-off, idempotent: auctions created before the live-auction columns
// existed have startingPrice/currentPrice = 0. Give them sensible values so
// the room and the rules work on them:
//   startingPrice  = basePrice
//   currentPrice   = highest accepted bid, else basePrice
//   bidSequence    = number of accepted bids (and number those bids)
//   artwork.intrinsicValue = basePrice, if the work has none
// Safe to re-run: only touches rows where startingPrice = 0.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const legacy = await prisma.auction.findMany({
    where: { startingPrice: 0 },
    include: { bids: { where: { status: { not: "REJECTED" } }, orderBy: { createdAt: "asc" } }, artwork: true },
  });
  for (const a of legacy) {
    let seq = 0;
    for (const b of a.bids) {
      seq += 1;
      await prisma.bid.update({ where: { id: b.id }, data: { sequence: seq } });
    }
    const top = [...a.bids].sort((x, y) => Number(y.amount) - Number(x.amount))[0];
    await prisma.auction.update({
      where: { id: a.id },
      data: {
        startingPrice: a.basePrice,
        currentPrice: top?.amount ?? a.basePrice,
        bidSequence: seq,
        originalEndAt: a.originalEndAt ?? a.endAt,
      },
    });
    if (!a.artwork.intrinsicValue) {
      await prisma.artwork.update({
        where: { id: a.artworkId },
        data: { intrinsicValue: a.basePrice, intrinsicValueSource: "backfill:basePrice", intrinsicValuedAt: new Date() },
      });
    }
    console.log(`↺ ${a.title}: starting ${a.basePrice}, current ${top?.amount ?? a.basePrice}, ${seq} bids`);
  }
  console.log(`✅ backfilled ${legacy.length} auction(s)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
