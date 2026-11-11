import "server-only";
import { prisma } from "@/lib/prisma";
import { D, bidLadder, depositFor, minNextBid, remainingDue } from "./money";
import { JOINABLE, TERMINAL } from "./state";

/**
 * The room's view of one auction, for one viewer. Built on the server, sent
 * as JSON on page load, on every SSE push, and from /api/auctions/[id]/state.
 * The client never computes a rule itself — it displays these numbers.
 */
export type RoomBid = {
  id: string;
  sequence: number;
  amount: string;
  alias: string;
  at: string;
  mine: boolean;
  leading: boolean;
};

/** a member seated at the auction table */
export type RoomSeat = {
  alias: string;
  mine: boolean;
  /** stable seat number: join order, so nobody's chair moves mid-auction */
  seat: number;
  lastBid: string | null;
  bidCount: number;
  leading: boolean;
  depositStatus: string;
  joinedAt: string;
};

/** one line of the room's live activity feed */
export type RoomActivity = {
  id: number;
  type: string;
  at: string;
  /** the member the line is about, as the room knows them */
  alias: string | null;
  mine: boolean;
  payload: Record<string, unknown> | null;
};

export type RoomSnapshot = {
  id: string;
  title: string;
  status: string;
  currency: string;
  artwork: { id: string; title: string; city: string; category: string; image: string };
  startAt: string;
  endAt: string;
  registrationOpensAt: string | null;
  paymentDueAt: string | null;
  extensionCount: number;
  serverNow: string;
  rules: {
    startingPrice: string;
    depositPercent: string;
    depositAmount: string;
    bidIncrementPercent: string;
    bidCoveragePercent: string;
    antiSnipingWindowSec: number;
    extensionSec: number;
    paymentDeadlineMin: number;
  };
  currentPrice: string;
  hasBids: boolean;
  minNextBid: string;
  ladder: string[];
  participantCount: number;
  seats: RoomSeat[];
  bids: RoomBid[];
  activity: RoomActivity[];
  joinable: boolean;
  terminal: boolean;
  lastEventId: number;
  viewer: {
    signedIn: boolean;
    /** the viewer's own user id — a snapshot is built per viewer, so this
     *  only ever travels to its owner; the room uses it to spot events
     *  addressed to them */
    uid: string | null;
    joined: boolean;
    alias: string | null;
    depositStatus: string | null;
    depositAmount: string | null;
    leading: boolean;
    isWinner: boolean;
    remainingDue: string | null;
    wallet: { available: string; locked: string } | null;
  };
};

export async function buildRoomSnapshot(
  auctionId: string,
  viewerId: string | null
): Promise<RoomSnapshot | null> {
  const a = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      artwork: {
        select: {
          id: true,
          title: true,
          city: true,
          category: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
      participants: {
        orderBy: { joinedAt: "asc" }, // seat order is join order and never shifts
        select: { id: true, userId: true, alias: true, depositStatus: true, depositAmount: true, joinedAt: true },
      },
      bids: {
        where: { sequence: { not: null } },
        orderBy: { sequence: "desc" },
        take: 40,
        select: { id: true, sequence: true, amount: true, userId: true, createdAt: true, status: true },
      },
      winner: { select: { userId: true, finalAmount: true } },
      // the room's activity feed, newest first
      events: { orderBy: { id: "desc" }, take: 60 },
    },
  });
  if (!a) return null;

  const aliasOf = new Map(a.participants.map((p) => [p.userId, p.alias]));
  const me = viewerId ? a.participants.find((p) => p.userId === viewerId) ?? null : null;
  const hasBids = a.bidSequence > 0;
  const current = D(a.currentPrice);
  const minNext = minNextBid(current, D(a.bidIncrementPercent), hasBids);
  const deposit = depositFor(D(a.startingPrice), D(a.depositPercent));

  // per-member bid summary for the seats around the table
  const perMember = await prisma.bid.groupBy({
    by: ["userId"],
    where: { auctionId, sequence: { not: null } },
    _count: { _all: true },
    _max: { amount: true },
  });
  const summary = new Map(perMember.map((r) => [r.userId, r]));
  const leaderId = a.bids.find((b) => b.status === "WINNING")?.userId ?? null;

  const wallet = viewerId
    ? await prisma.wallet.findUnique({
        where: { userId: viewerId },
        select: { available: true, locked: true },
      })
    : null;

  const isWinner = !!viewerId && a.winner?.userId === viewerId;
  const due =
    isWinner && a.winner
      ? remainingDue(
          D(a.winner.finalAmount),
          me?.depositStatus === "LOCKED" ? D(me.depositAmount) : D(0)
        ).toFixed(2)
      : null;

  return {
    id: a.id,
    title: a.title,
    status: a.status,
    currency: a.currency,
    artwork: {
      id: a.artwork.id,
      title: a.artwork.title,
      city: a.artwork.city,
      category: a.artwork.category,
      image: a.artwork.images[0]?.url ?? `/carpets/${a.artwork.city.toLowerCase()}-1.jpg`,
    },
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    registrationOpensAt: a.registrationOpensAt?.toISOString() ?? null,
    paymentDueAt: a.paymentDueAt?.toISOString() ?? null,
    extensionCount: a.extensionCount,
    serverNow: new Date().toISOString(),
    rules: {
      startingPrice: D(a.startingPrice).toFixed(2),
      depositPercent: D(a.depositPercent).toFixed(0),
      depositAmount: deposit.toFixed(2),
      bidIncrementPercent: D(a.bidIncrementPercent).toFixed(0),
      bidCoveragePercent: D(a.bidCoveragePercent).toFixed(0),
      antiSnipingWindowSec: a.antiSnipingWindowSec,
      extensionSec: a.extensionSec,
      paymentDeadlineMin: a.paymentDeadlineMin,
    },
    currentPrice: current.toFixed(2),
    hasBids,
    minNextBid: minNext.toFixed(2),
    ladder: bidLadder(current, D(a.bidIncrementPercent), hasBids, 3).map((x) => x.toFixed(2)),
    participantCount: a.participants.length,
    seats: a.participants.map((p, i) => {
      const sum = summary.get(p.userId);
      return {
        alias: p.alias,
        mine: p.userId === viewerId,
        seat: i,
        lastBid: sum?._max.amount ? D(sum._max.amount).toFixed(2) : null,
        bidCount: sum?._count._all ?? 0,
        leading: p.userId === leaderId,
        depositStatus: p.depositStatus,
        joinedAt: p.joinedAt.toISOString(),
      };
    }),
    bids: a.bids.map((b) => ({
      id: b.id,
      sequence: b.sequence ?? 0,
      amount: D(b.amount).toFixed(2),
      alias: aliasOf.get(b.userId) ?? "Bidder",
      at: b.createdAt.toISOString(),
      mine: b.userId === viewerId,
      leading: b.status === "WINNING",
    })),
    joinable: JOINABLE.includes(a.status) && new Date() < a.endAt,
    terminal: TERMINAL.includes(a.status),
    lastEventId: a.events[0]?.id ?? 0,
    // A rejected bid is nobody else's business — the member who made it sees
    // their own, everyone else does not.
    activity: a.events
      .filter((e) => e.type !== "BID_REJECTED" || e.userId === viewerId)
      .map((e) => ({
        id: e.id,
        type: e.type,
        at: e.createdAt.toISOString(),
        alias: e.userId ? aliasOf.get(e.userId) ?? null : null,
        mine: !!viewerId && e.userId === viewerId,
        payload: (e.payload as Record<string, unknown> | null) ?? null,
      })),
    viewer: {
      signedIn: !!viewerId,
      uid: viewerId,
      joined: !!me,
      alias: me?.alias ?? null,
      depositStatus: me?.depositStatus ?? null,
      depositAmount: me ? D(me.depositAmount).toFixed(2) : null,
      leading: !!viewerId && a.bids.some((b) => b.status === "WINNING" && b.userId === viewerId),
      isWinner,
      remainingDue: due,
      wallet: wallet
        ? { available: D(wallet.available).toFixed(2), locked: D(wallet.locked).toFixed(2) }
        : viewerId
          ? { available: "0.00", locked: "0.00" }
          : null,
    },
  };
}
