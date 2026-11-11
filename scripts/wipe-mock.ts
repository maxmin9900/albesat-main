// One-off cleanup: remove all mock/demo activity data. Site content
// (artworks, auctions) and the admin account are kept.
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const winners = await p.auctionWinner.deleteMany();
  const bids = await p.bid.deleteMany();
  const orders = await p.order.deleteMany();
  const favorites = await p.favorite.deleteMany();
  const users = await p.user.deleteMany();
  console.log("wiped:", {
    winners: winners.count,
    bids: bids.count,
    orders: orders.count,
    favorites: favorites.count,
    users: users.count,
  });
  console.log(
    "remaining artworks:",
    await p.artwork.count(),
    "| auctions:",
    await p.auction.count(),
    "| admins:",
    await p.adminUser.count()
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
