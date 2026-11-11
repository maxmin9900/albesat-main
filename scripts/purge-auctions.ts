/**
 * Wipe every auction session and everything hanging off it.
 *
 * The sessions on the server predate the session/lot split — each was a
 * single carpet with no AuctionLot row, so the public page (which skips
 * lot-less sessions) would never show them and the admin panel would list
 * them as "no carpets". They were test data; this clears the decks so the
 * first real session is created cleanly.
 *
 * Run it ONCE, deliberately:
 *
 *   docker compose -f docker-compose.prod.yml exec web npx tsx scripts/purge-auctions.ts --yes
 *
 * Without --yes it only reports what it would delete, and changes nothing.
 *
 * Artworks are never touched. Anything a purged session referenced — orders
 * already raised from a win — is left alone too: the script refuses to run
 * if it finds one, rather than tearing a paid order off its record.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const commit = process.argv.includes("--yes");

  const [auctions, lots, registrations, bids, participants, events, winners, walletTxs] =
    await Promise.all([
      prisma.auction.count(),
      prisma.auctionLot.count(),
      prisma.auctionRegistration.count(),
      prisma.bid.count(),
      prisma.auctionParticipant.count(),
      prisma.auctionEvent.count(),
      prisma.auctionWinner.count(),
      prisma.walletTransaction.count({ where: { auctionId: { not: null } } }),
    ]);

  console.log("About to remove:");
  console.log(`  sessions ............ ${auctions}`);
  console.log(`  lots ................ ${lots}`);
  console.log(`  registrations ....... ${registrations}`);
  console.log(`  bids ................ ${bids}`);
  console.log(`  bidding participants  ${participants}`);
  console.log(`  winners ............. ${winners}`);
  console.log(`  events .............. ${events}`);
  console.log(`  wallet tx links ..... ${walletTxs} (unlinked, not deleted)`);

  if (auctions === 0) {
    console.log("\nNothing to do.");
    return;
  }

  // An order raised from an auction win is a real commercial record. Stop
  // rather than orphan or delete one.
  const auctionOrders = await prisma.order.count({ where: { source: "AUCTION" } });
  if (auctionOrders > 0) {
    console.error(
      `\n✗ Refusing to run: ${auctionOrders} order(s) came from an auction. ` +
        "Those are real records — clear them first if you really mean to wipe."
    );
    process.exitCode = 1;
    return;
  }

  if (!commit) {
    console.log("\nDry run. Re-run with --yes to actually delete.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // A wallet transaction outlives its auction (it is the member's ledger),
    // so cut the link rather than deleting the row.
    await tx.walletTransaction.updateMany({
      where: { auctionId: { not: null } },
      data: { auctionId: null },
    });

    // Children first for the relations Prisma does not cascade for us.
    await tx.auctionWinner.deleteMany({});
    await tx.bid.deleteMany({});
    await tx.auctionParticipant.deleteMany({});
    await tx.auctionRegistration.deleteMany({});
    await tx.auctionLot.deleteMany({});
    await tx.auctionEvent.deleteMany({});
    await tx.auction.deleteMany({});
  });

  const left = await prisma.auction.count();
  console.log(`\n✓ Done. Sessions remaining: ${left}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
