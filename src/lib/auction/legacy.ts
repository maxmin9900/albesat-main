import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { D, round2 } from "./money";

/**
 * Hall bidding exactly as it worked before the live rooms existed: any
 * signed-in member may bid straight from /auctions, and the minimum is the
 * highest bid plus the auction's FLAT minBidIncrement (not the compound
 * percentage — changing the economics of auctions already running on the
 * server is not this module's call).
 *
 * Used only while LIVE_AUCTION_ROOMS is off. Still atomic: the auction row is
 * locked for the duration, and currentPrice/bidSequence are kept in step so
 * the hall and any later room view read the same numbers.
 */
export type LegacyBidResult =
  | { ok: true; amount: string }
  | { ok: false; error: string };

export async function placeLegacyBid(input: {
  auctionId: string;
  userId: string;
  amount: Prisma.Decimal;
  ipAddress?: string | null;
  country?: string | null;
}): Promise<LegacyBidResult> {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Auction" WHERE id = ${input.auctionId} FOR UPDATE`;
      if (rows.length === 0) return { ok: false as const, error: "Auction not found." };

      const a = await tx.auction.findUniqueOrThrow({ where: { id: input.auctionId } });
      if (a.status !== "LIVE") return { ok: false as const, error: "This auction is not live." };
      if (new Date() > a.endAt) return { ok: false as const, error: "This auction has ended." };

      const top = await tx.bid.findFirst({
        where: { auctionId: a.id, status: { notIn: ["REJECTED", "SUSPICIOUS"] } },
        orderBy: { amount: "desc" },
      });
      const minNext = top
        ? D(top.amount).add(D(a.minBidIncrement))
        : D(a.basePrice);
      const amount = round2(input.amount);
      if (amount.lt(minNext)) {
        return {
          ok: false as const,
          error: `Minimum next bid is ${a.currency} ${minNext.toFixed(2)}.`,
        };
      }

      await tx.bid.updateMany({
        where: { auctionId: a.id, status: "WINNING" },
        data: { status: "OUTBID" },
      });
      const sequence = a.bidSequence + 1;
      await tx.bid.create({
        data: {
          auctionId: a.id,
          userId: input.userId,
          amount,
          status: "WINNING",
          sequence,
          ipAddress: input.ipAddress ?? undefined,
          country: input.country ?? undefined,
        },
      });
      await tx.auction.update({
        where: { id: a.id },
        data: { currentPrice: amount, bidSequence: sequence, version: { increment: 1 } },
      });
      return { ok: true as const, amount: amount.toFixed(2) };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 }
  );
}

/**
 * Finalize as the Winners panel did before the live rooms: highest valid bid
 * wins, an order is raised, the work is marked SOLD and the auction ENDED —
 * all in one step, no payment window, no deposits. Idempotent.
 */
export async function finalizeLegacy(auctionId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      winner: true,
      bids: {
        where: { status: { notIn: ["REJECTED", "SUSPICIOUS"] } },
        orderBy: { amount: "desc" },
        include: { user: true },
      },
    },
  });
  if (!auction || auction.winner) return;
  if (!["LIVE", "SCHEDULED", "REGISTRATION_OPEN", "ENDED"].includes(auction.status)) return;

  const top = auction.bids[0];
  if (!top) {
    await prisma.auction.update({ where: { id: auctionId }, data: { status: "ENDED", endedAt: new Date() } });
    return;
  }

  const { generateOrderNumber } = await import("@/lib/utils");
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: top.userId,
        artworkId: auction.artworkId,
        customerName: top.user.fullName,
        amount: top.amount,
        currency: auction.currency,
        address: top.user.address ?? top.user.country ?? "—",
        paymentStatus: "PENDING",
        status: "CONFIRMED",
        source: "AUCTION",
      },
    });
    await tx.auctionWinner.create({
      data: {
        auctionId: auction.id,
        userId: top.userId,
        finalAmount: top.amount,
        bidCount: auction.bids.length,
        endedAt: new Date(),
        orderId: order.id,
      },
    });
    await tx.artwork.update({ where: { id: auction.artworkId }, data: { status: "SOLD" } });
    await tx.auction.update({
      where: { id: auction.id },
      data: { status: "ENDED", endedAt: new Date(), currentPrice: top.amount, version: { increment: 1 } },
    });
    await tx.bid.update({ where: { id: top.id }, data: { status: "WINNING" } });
    await tx.bid.updateMany({
      where: { auctionId: auction.id, id: { not: top.id }, status: { notIn: ["REJECTED", "SUSPICIOUS"] } },
      data: { status: "OUTBID" },
    });
  });
}
