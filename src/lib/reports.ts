import { prisma } from "@/lib/prisma";

export type BusinessMetrics = Awaited<ReturnType<typeof getBusinessMetrics>>;

export async function getBusinessMetrics() {
  const [
    totalArtworks,
    soldArtworks,
    availableArtworks,
    totalUsers,
    directRevenueAgg,
    auctionRevenueAgg,
    paidOrders,
    auctionParticipants,
    topCitiesRaw,
    mostViewed,
    mostFavorited,
    highestBid,
    auctionCount,
    bidCount,
  ] = await Promise.all([
    prisma.artwork.count(),
    prisma.artwork.count({ where: { status: "SOLD" } }),
    prisma.artwork.count({ where: { status: "PUBLISHED" } }),
    prisma.user.count(),
    prisma.order.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: "PAID", source: "DIRECT" },
    }),
    prisma.order.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: "PAID", source: "AUCTION" },
    }),
    prisma.order.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { paymentStatus: "PAID" },
    }),
    prisma.bid.findMany({ distinct: ["userId"], select: { userId: true }, where: { status: { not: "REJECTED" } } }),
    prisma.order.groupBy({
      by: ["source"],
      _count: true,
    }),
    prisma.artwork.findMany({
      orderBy: { viewsCount: "desc" },
      take: 5,
      select: { id: true, title: true, city: true, viewsCount: true },
    }),
    prisma.artwork.findMany({
      orderBy: { favoritesCount: "desc" },
      take: 5,
      select: { id: true, title: true, city: true, favoritesCount: true },
    }),
    prisma.bid.aggregate({ _max: { amount: true }, where: { status: { not: "REJECTED" } } }),
    prisma.auction.count(),
    prisma.bid.count({ where: { status: { not: "REJECTED" } } }),
  ]);

  // Top cities by number of PAID orders
  const cityOrders = await prisma.order.findMany({
    where: { paymentStatus: "PAID" },
    select: { artwork: { select: { city: true } } },
  });
  const cityMap = new Map<string, number>();
  for (const o of cityOrders) {
    const c = o.artwork.city;
    cityMap.set(c, (cityMap.get(c) ?? 0) + 1);
  }
  const topCities = [...cityMap.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const totalViews = await prisma.artwork.aggregate({
    _sum: { viewsCount: true },
  });

  const directRevenue = Number(directRevenueAgg._sum.amount ?? 0);
  const auctionRevenue = Number(auctionRevenueAgg._sum.amount ?? 0);
  const paidCount = paidOrders._count;
  const paidTotal = Number(paidOrders._sum.amount ?? 0);
  const views = totalViews._sum.viewsCount ?? 0;

  return {
    totalArtworks,
    soldArtworks,
    availableArtworks,
    totalUsers,
    directRevenue,
    auctionRevenue,
    totalRevenue: directRevenue + auctionRevenue,
    auctionParticipants: auctionParticipants.length,
    topCities,
    mostViewed,
    mostFavorited,
    highestBid: Number(highestBid._max.amount ?? 0),
    avgBidsPerAuction: auctionCount > 0 ? bidCount / auctionCount : 0,
    averageOrderValue: paidCount > 0 ? paidTotal / paidCount : 0,
    conversionRate: views > 0 ? (paidCount / views) * 100 : 0,
    // silence unused
    _sourceSplit: topCitiesRaw,
  };
}
