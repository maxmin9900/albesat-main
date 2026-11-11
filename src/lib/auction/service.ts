import "server-only";
import {
  Prisma,
  type AuctionEvent,
  type AuctionEventType,
  type AuctionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";
import { AUCTION_DEFAULTS } from "./config";
import { AuctionError } from "./errors";
import {
  D,
  ZERO,
  depositFor,
  minNextBid,
  remainingDue,
  requiredCoverage,
  round2,
  startingPriceFor,
  type Money,
} from "./money";
import { assertTransition, JOINABLE } from "./state";
import { bidderAlias } from "./alias";
import { publishAuctionEvents } from "./bus";
import {
  applyLockedFunds,
  debitFunds,
  lockFunds,
  lockWallet,
  releaseFunds,
  type Tx,
} from "./wallet";
import { requireIntrinsicValue } from "./valuation";

/* ------------------------------------------------------------------ */
/*  plumbing: row locks, events, transactions                          */
/* ------------------------------------------------------------------ */

type EventInput = {
  type: AuctionEventType;
  userId?: string | null;
  bidId?: string | null;
  payload?: Prisma.InputJsonValue;
};

/**
 * Every mutation runs inside `withAuction`: one interactive transaction, the
 * auction row locked for its whole duration (SELECT … FOR UPDATE), events
 * collected and written in the same transaction, then — only after commit —
 * pushed to the live streams. Two bids on the same auction therefore execute
 * strictly one after the other, each seeing the other's committed result.
 */
async function withAuction<T>(
  auctionId: string,
  fn: (tx: Tx, a: LockedAuction, emit: (e: EventInput) => void) => Promise<T>
): Promise<T> {
  const pending: EventInput[] = [];
  const emit = (e: EventInput) => void pending.push(e);

  const result = await prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Auction" WHERE id = ${auctionId} FOR UPDATE`;
      if (rows.length === 0) {
        throw new AuctionError("NOT_FOUND", "Auction not found.");
      }
      const a = await tx.auction.findUniqueOrThrow({
        where: { id: auctionId },
        include: { artwork: { select: { id: true, title: true, status: true } } },
      });
      const out = await fn(tx, a, emit);
      const written: AuctionEvent[] = [];
      for (const e of pending) {
        written.push(
          await tx.auctionEvent.create({
            data: {
              auctionId,
              type: e.type,
              userId: e.userId ?? undefined,
              bidId: e.bidId ?? undefined,
              payload: e.payload,
            },
          })
        );
      }
      return { out, written };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 }
  );

  publishAuctionEvents(auctionId, result.written);
  return result.out;
}

type LockedAuction = Prisma.AuctionGetPayload<{
  include: { artwork: { select: { id: true; title: true; status: true } } };
}>;

async function setStatus(
  tx: Tx,
  a: LockedAuction,
  to: AuctionStatus,
  extra: Prisma.AuctionUpdateInput = {}
) {
  assertTransition(a.status, to);
  return tx.auction.update({
    where: { id: a.id },
    data: { status: to, version: { increment: 1 }, ...extra },
  });
}

/* ------------------------------------------------------------------ */
/*  admin: create / schedule / open / start / cancel                   */
/* ------------------------------------------------------------------ */

export type CreateAuctionInput = {
  title: string;
  /**
   * The carpets in this session, in running order. At least one. The first
   * becomes the session's headline work — the live bidding room and the
   * legacy reports still hang off that single artwork.
   */
  lots: LotInput[];
  currency: "OMR" | "IRR" | "USD" | "EUR" | "AED";
  startAt: Date;
  endAt: Date;
  registrationOpensAt?: Date | null;
  /** the printed invitation — see the note on the Auction model */
  venueName?: string | null;
  venueAddress?: string | null;
  venueHall?: string | null;
  intro?: string | null;
  viewingFrom?: string | null;
  viewingTo?: string | null;
  depositPercent?: number;
  bidIncrementPercent?: number;
  bidCoveragePercent?: number;
  antiSnipingWindowSec?: number;
  extensionSec?: number;
  paymentDeadlineMin?: number;
  failedPaymentDepositPolicy?: "RELEASE" | "FORFEIT";
  offerToNextBidder?: boolean;
  /** create straight into SCHEDULED (default) or leave as DRAFT */
  publish?: boolean;
};

/** One carpet in the session: which work, and how it is catalogued. */
export type LotInput = LotCatalogue & {
  artworkId: string;
  /**
   * What this lot opens at. Omit it and the work's intrinsic value is used —
   * that is still the rule for a live bidding room. The admin form sends it
   * so a lot can be listed without an appraisal on file first.
   */
  startingPrice?: number;
};

/**
 * The catalogue entry for a lot: everything the public listing prints under
 * the photograph. Every field is optional — a lot can go up with nothing but
 * a name while the specification is still being written.
 */
export type LotCatalogue = {
  lotNumber?: number | null;
  lotName?: string | null;
  origin?: string | null;
  era?: string | null;
  lotDimensions?: string | null;
  materials?: string | null;
  weave?: string | null;
  condition?: string | null;
  estimateLow?: number | null;
  estimateHigh?: number | null;
  publishedReserve?: number | null;
  lotNote?: string | null;
};

/** Empty strings from a form mean "not filled in", not "set to blank". */
function catalogueData(c: LotCatalogue) {
  const text = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
  const money = (v: number | null | undefined) =>
    v === null || v === undefined || Number.isNaN(v) ? null : D(v);
  return {
    lotNumber: c.lotNumber ?? null,
    lotName: text(c.lotName),
    origin: text(c.origin),
    era: text(c.era),
    lotDimensions: text(c.lotDimensions),
    materials: text(c.materials),
    weave: text(c.weave),
    condition: text(c.condition),
    estimateLow: money(c.estimateLow),
    estimateHigh: money(c.estimateHigh),
    publishedReserve: money(c.publishedReserve),
    lotNote: text(c.lotNote),
  };
}

export async function createAuction(input: CreateAuctionInput) {
  if (input.lots.length === 0) {
    throw new AuctionError("NO_LOTS", "A session needs at least one carpet.");
  }
  const headline = input.lots[0];

  // An explicit price wins. Only when none is given does the headline work
  // need an intrinsic value on file — requireIntrinsicValue throws then.
  const starting =
    headline.startingPrice !== undefined && headline.startingPrice > 0
      ? startingPriceFor(D(headline.startingPrice))
      : startingPriceFor(await requireIntrinsicValue(headline.artworkId));
  const cfg = {
    depositPercent: D(input.depositPercent ?? AUCTION_DEFAULTS.depositPercent),
    bidIncrementPercent: D(
      input.bidIncrementPercent ?? AUCTION_DEFAULTS.bidIncrementPercent
    ),
    bidCoveragePercent: D(
      input.bidCoveragePercent ?? AUCTION_DEFAULTS.bidCoveragePercent
    ),
    antiSnipingWindowSec:
      input.antiSnipingWindowSec ?? AUCTION_DEFAULTS.antiSnipingWindowSec,
    extensionSec: input.extensionSec ?? AUCTION_DEFAULTS.extensionSec,
    paymentDeadlineMin:
      input.paymentDeadlineMin ?? AUCTION_DEFAULTS.paymentDeadlineMin,
    failedPaymentDepositPolicy:
      input.failedPaymentDepositPolicy ??
      AUCTION_DEFAULTS.failedPaymentDepositPolicy,
    offerToNextBidder:
      input.offerToNextBidder ?? AUCTION_DEFAULTS.offerToNextBidder,
  };

  const created = await prisma.$transaction(async (tx) => {
    const a = await tx.auction.create({
      data: {
        title: input.title,
        artworkId: headline.artworkId,
        currency: input.currency,
        startAt: input.startAt,
        endAt: input.endAt,
        originalEndAt: input.endAt,
        registrationOpensAt: input.registrationOpensAt ?? null,
        venueName: input.venueName ?? null,
        venueAddress: input.venueAddress ?? null,
        venueHall: input.venueHall ?? null,
        intro: input.intro ?? null,
        viewingFrom: input.viewingFrom ?? null,
        viewingTo: input.viewingTo ?? null,
        status: input.publish === false ? "DRAFT" : "SCHEDULED",
        // legacy columns kept in step so older pages/reports still read sensibly
        basePrice: starting,
        minBidIncrement: round2(starting.mul(cfg.bidIncrementPercent).div(100)),
        startingPrice: starting,
        currentPrice: starting,
        ...cfg,
        lots: {
          create: input.lots.map((lot, i) => ({
            artworkId: lot.artworkId,
            sortOrder: i,
            startingPrice:
              lot.startingPrice !== undefined && lot.startingPrice > 0
                ? D(lot.startingPrice)
                : i === 0
                  ? starting
                  : null,
            ...catalogueData(lot),
          })),
        },
      },
    });
    const events: AuctionEvent[] = [
      await tx.auctionEvent.create({
        data: {
          auctionId: a.id,
          type: "AUCTION_CREATED",
          payload: { startingPrice: starting.toFixed(2), ...serializeCfg(cfg) },
        },
      }),
    ];
    if (a.status === "SCHEDULED") {
      events.push(
        await tx.auctionEvent.create({
          data: { auctionId: a.id, type: "AUCTION_SCHEDULED" },
        })
      );
    }
    return { a, events };
  });
  publishAuctionEvents(created.a.id, created.events);
  // apply any transition that is already due (start in the past, etc.)
  await runLifecycle(created.a.id);
  return created.a;
}

const serializeCfg = (c: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(c).map(([k, v]) => [
      k,
      v instanceof Prisma.Decimal ? v.toFixed(2) : (v as string | number | boolean),
    ])
  );

export const publishAuction = (auctionId: string) =>
  withAuction(auctionId, async (tx, a, emit) => {
    if (a.status !== "DRAFT") return;
    await setStatus(tx, a, "SCHEDULED");
    emit({ type: "AUCTION_SCHEDULED" });
  }).then(() => runLifecycle(auctionId));

export const openRegistration = (auctionId: string) =>
  withAuction(auctionId, async (tx, a, emit) => {
    if (a.status === "REGISTRATION_OPEN") return;
    await setStatus(tx, a, "REGISTRATION_OPEN", { registrationOpensAt: new Date() });
    emit({ type: "REGISTRATION_OPENED" });
  });

export const startNow = (auctionId: string) =>
  withAuction(auctionId, async (tx, a, emit) => {
    if (a.status === "LIVE") return;
    const now = new Date();
    await setStatus(tx, a, "LIVE", { startAt: now });
    emit({ type: "AUCTION_STARTED", payload: { startAt: now.toISOString() } });
  });

/** admin closes the bidding early — same path as the timer running out */
export const endNow = (auctionId: string) =>
  withAuction(auctionId, async (tx, a, emit) => {
    if (a.status !== "LIVE") return;
    await closeLocked(tx, a, emit);
  });

export const cancelAuction = (auctionId: string, reason?: string) =>
  withAuction(auctionId, async (tx, a, emit) => {
    if (a.status === "CANCELLED") return;
    assertTransition(a.status, "CANCELLED");
    // give everyone their deposit back
    const held = await tx.auctionParticipant.findMany({
      where: { auctionId: a.id, depositStatus: "LOCKED" },
      orderBy: { userId: "asc" },
    });
    for (const p of held) {
      await releaseFunds(tx, p.userId, D(p.depositAmount), {
        auctionId: a.id,
        note: "auction cancelled",
      });
      await tx.auctionParticipant.update({
        where: { id: p.id },
        data: { depositStatus: "RELEASED", settledAt: new Date() },
      });
      emit({
        type: "DEPOSIT_RELEASED",
        userId: p.userId,
        payload: { amount: D(p.depositAmount).toFixed(2), reason: "cancelled" },
      });
    }
    // an order raised for the winner (if any) is void
    const w = await tx.auctionWinner.findUnique({ where: { auctionId: a.id } });
    if (w?.orderId) {
      await tx.order.update({
        where: { id: w.orderId },
        data: { status: "CANCELLED", paymentStatus: "FAILED" },
      });
    }
    await tx.auction.update({
      where: { id: a.id },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    emit({ type: "AUCTION_CANCELLED", payload: reason ? { reason } : undefined });
  });

/* ------------------------------------------------------------------ */
/*  member: join (lock deposit)                                        */
/* ------------------------------------------------------------------ */

export type JoinResult = {
  alias: string;
  depositAmount: string;
  alreadyJoined: boolean;
};

export const joinAuction = (auctionId: string, userId: string): Promise<JoinResult> =>
  withAuction(auctionId, async (tx, a, emit) => {
    const existing = await tx.auctionParticipant.findUnique({
      where: { auctionId_userId: { auctionId, userId } },
    });
    if (existing) {
      return {
        alias: existing.alias,
        depositAmount: D(existing.depositAmount).toFixed(2),
        alreadyJoined: true,
      };
    }
    if (!JOINABLE.includes(a.status)) {
      throw new AuctionError(
        "NOT_JOINABLE",
        a.status === "SCHEDULED"
          ? "Registration for this auction has not opened yet."
          : "This auction is no longer open to new participants."
      );
    }
    if (a.status === "LIVE" && new Date() >= a.endAt) {
      throw new AuctionError("EXPIRED", "This auction has ended.");
    }

    // rule 2: deposit = intrinsic (= starting price) × depositPercent
    const deposit = depositFor(D(a.startingPrice), D(a.depositPercent));

    // funds check happens inside lockFunds (row-locked, atomic)
    const w = await lockWallet(tx, userId);
    if (D(w.available).lt(deposit)) {
      throw new AuctionError(
        "INSUFFICIENT_FUNDS",
        `Joining requires a deposit of ${deposit.toFixed(2)} ${a.currency}; your available balance is ${D(w.available).toFixed(2)}.`,
        {
          required: deposit.toFixed(2),
          available: D(w.available).toFixed(2),
          shortfall: deposit.sub(D(w.available)).toFixed(2),
        }
      );
    }
    const walletTx = await lockFunds(tx, userId, deposit, {
      auctionId,
      note: "auction deposit",
    });

    // alias unique within the auction
    let alias = "";
    for (let salt = 0; salt < 50; salt++) {
      alias = bidderAlias(auctionId, userId, salt);
      const clash = await tx.auctionParticipant.findFirst({
        where: { auctionId, alias },
        select: { id: true },
      });
      if (!clash) break;
    }

    await tx.auctionParticipant.create({
      data: { auctionId, userId, alias, depositAmount: deposit, depositStatus: "LOCKED" },
    });
    emit({ type: "USER_JOINED", userId, payload: { alias } });
    emit({
      type: "DEPOSIT_LOCKED",
      userId,
      payload: { amount: deposit.toFixed(2), walletTxId: walletTx.id },
    });
    return { alias, depositAmount: deposit.toFixed(2), alreadyJoined: false };
  });

/* ------------------------------------------------------------------ */
/*  member: bid                                                        */
/* ------------------------------------------------------------------ */

export type BidInput = {
  auctionId: string;
  userId: string;
  amount: Money;
  /** client-generated per submit; a network retry with the same key returns
   *  the original outcome instead of placing a second bid */
  idempotencyKey?: string;
  ipAddress?: string | null;
  country?: string | null;
};

export type BidOutcome =
  | { accepted: true; bidId: string; amount: string; sequence: number; extendedTo?: string }
  | { accepted: false; bidId: string | null; reason: string; code: string; details?: Record<string, string | number> };

export const placeBid = (input: BidInput): Promise<BidOutcome> =>
  withAuction(input.auctionId, async (tx, a, emit) => {
    const { userId } = input;
    const amount = round2(input.amount);
    const now = new Date();

    // ---- idempotent replay -------------------------------------------------
    if (input.idempotencyKey) {
      const prior = await tx.bid.findUnique({
        where: {
          auctionId_userId_idempotencyKey: {
            auctionId: a.id,
            userId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (prior) {
        return prior.status === "REJECTED"
          ? {
              accepted: false,
              bidId: prior.id,
              reason: prior.rejectionReason ?? "Rejected.",
              code: "REPLAY",
            }
          : {
              accepted: true,
              bidId: prior.id,
              amount: D(prior.amount).toFixed(2),
              sequence: prior.sequence ?? 0,
            };
      }
    }

    // ---- server-side validation, in the order the rules are cheapest ------
    // A rejected bid is still recorded (immutable, with its reason) — that is
    // the audit trail — but never gets a sequence number.
    const reject = async (
      code: AuctionError["code"],
      reason: string,
      details?: Record<string, string | number>
    ): Promise<BidOutcome> => {
      const row = await tx.bid.create({
        data: {
          auctionId: a.id,
          userId,
          amount,
          status: "REJECTED",
          rejectionReason: `${code}: ${reason}`,
          idempotencyKey: input.idempotencyKey,
          ipAddress: input.ipAddress ?? undefined,
          country: input.country ?? undefined,
        },
      });
      emit({
        type: "BID_REJECTED",
        userId,
        bidId: row.id,
        payload: { amount: amount.toFixed(2), code, reason },
      });
      return { accepted: false, bidId: row.id, reason, code, details };
    };

    if (a.status !== "LIVE") {
      return reject("NOT_LIVE", "Bidding is not open on this auction.");
    }
    if (now >= a.endAt) {
      return reject("EXPIRED", "This auction has ended.");
    }
    if (amount.lte(0)) return reject("INVALID", "Invalid amount.");

    const participant = await tx.auctionParticipant.findUnique({
      where: { auctionId_userId: { auctionId: a.id, userId } },
    });
    if (!participant) {
      return reject("NOT_PARTICIPANT", "Join the auction and lock your deposit before bidding.");
    }
    if (participant.depositStatus !== "LOCKED") {
      return reject("DEPOSIT_NOT_HELD", "Your deposit is no longer held for this auction.");
    }

    // rule 3 — on the CURRENT price
    const hasBids = a.bidSequence > 0;
    const minNext = minNextBid(D(a.currentPrice), D(a.bidIncrementPercent), hasBids);
    if (amount.lt(minNext)) {
      return reject(
        "BID_TOO_LOW",
        `Minimum next bid is ${minNext.toFixed(2)} ${a.currency}.`,
        { minNext: minNext.toFixed(2) }
      );
    }

    // ---- financial capacity ------------------------------------------------
    // wallet available + this auction's own locked deposit − what the member
    // is currently leading elsewhere must cover coverage% of the bid.
    const w = await lockWallet(tx, userId);
    const leadingElsewhere = await tx.bid.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        status: "WINNING",
        auctionId: { not: a.id },
        auction: { status: { in: ["LIVE", "ENDED", "PAYMENT_PENDING"] } },
      },
    });
    const capacity = D(w.available)
      .add(D(participant.depositAmount))
      .sub(D(leadingElsewhere._sum.amount ?? 0));
    const required = requiredCoverage(amount, D(a.bidCoveragePercent));
    if (capacity.lt(required)) {
      return reject(
        "INSUFFICIENT_CAPACITY",
        `This bid needs ${required.toFixed(2)} ${a.currency} of cover; you have ${capacity.toFixed(2)}.`,
        { required: required.toFixed(2), capacity: capacity.toFixed(2) }
      );
    }

    // ---- accept: outbid the leader, insert, bump price, maybe extend -------
    const prevLeader = await tx.bid.findFirst({
      where: { auctionId: a.id, status: "WINNING" },
      select: { id: true, userId: true, amount: true },
    });
    await tx.bid.updateMany({
      where: { auctionId: a.id, status: "WINNING" },
      data: { status: "OUTBID" },
    });

    const sequence = a.bidSequence + 1;
    const bid = await tx.bid.create({
      data: {
        auctionId: a.id,
        userId,
        amount,
        status: "WINNING",
        sequence,
        idempotencyKey: input.idempotencyKey,
        ipAddress: input.ipAddress ?? undefined,
        country: input.country ?? undefined,
      },
    });

    // anti-sniping
    let endAt = a.endAt;
    let extended = false;
    const msLeft = a.endAt.getTime() - now.getTime();
    if (msLeft <= a.antiSnipingWindowSec * 1000) {
      endAt = new Date(a.endAt.getTime() + a.extensionSec * 1000);
      extended = true;
    }

    await tx.auction.update({
      where: { id: a.id },
      data: {
        currentPrice: amount,
        bidSequence: sequence,
        version: { increment: 1 },
        endAt,
        extensionCount: extended ? { increment: 1 } : undefined,
      },
    });

    emit({
      type: "BID_PLACED",
      userId,
      bidId: bid.id,
      payload: { amount: amount.toFixed(2), sequence, alias: participant.alias },
    });
    if (prevLeader && prevLeader.userId !== userId) {
      emit({
        type: "BID_OUTBID",
        userId: prevLeader.userId,
        bidId: prevLeader.id,
        payload: { by: amount.toFixed(2) },
      });
    }
    if (extended) {
      emit({
        type: "AUCTION_EXTENDED",
        payload: { endAt: endAt.toISOString(), bySec: a.extensionSec },
      });
    }
    return {
      accepted: true,
      bidId: bid.id,
      amount: amount.toFixed(2),
      sequence,
      extendedTo: extended ? endAt.toISOString() : undefined,
    };
  });

/* ------------------------------------------------------------------ */
/*  close: hammer → winner → payment window                            */
/* ------------------------------------------------------------------ */

/**
 * LIVE → ENDED → PAYMENT_PENDING in one transaction. Picks the leading bid,
 * raises the winner record and the order, releases every other deposit
 * (except the runner-up's when the auction may fall through to them).
 * With no bids it just ENDs and releases everyone.
 */
async function closeLocked(tx: Tx, a: LockedAuction, emit: (e: EventInput) => void) {
  const now = new Date();
  await setStatus(tx, a, "ENDED", { endedAt: now });
  emit({ type: "AUCTION_ENDED", payload: { finalPrice: D(a.currentPrice).toFixed(2) } });

  const top = await tx.bid.findFirst({
    where: { auctionId: a.id, status: "WINNING" },
    include: { user: true },
  });

  const participants = await tx.auctionParticipant.findMany({
    where: { auctionId: a.id, depositStatus: "LOCKED" },
    orderBy: { userId: "asc" },
  });

  if (!top) {
    for (const p of participants) await releaseParticipant(tx, a.id, p, emit, "no winner");
    return;
  }

  // the runner-up keeps their deposit only if the lot may pass to them
  let runnerUpId: string | null = null;
  if (a.offerToNextBidder) {
    const ru = await tx.bid.findFirst({
      where: { auctionId: a.id, status: "OUTBID", userId: { not: top.userId } },
      orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
      select: { userId: true },
    });
    runnerUpId = ru?.userId ?? null;
  }
  for (const p of participants) {
    if (p.userId === top.userId || p.userId === runnerUpId) continue;
    await releaseParticipant(tx, a.id, p, emit, "outbid");
  }

  const ended = await tx.auction.findUniqueOrThrow({
    where: { id: a.id },
    include: { artwork: { select: { id: true, title: true, status: true } } },
  });
  await raiseWinner(tx, ended, top, emit, now);
}

async function releaseParticipant(
  tx: Tx,
  auctionId: string,
  p: { id: string; userId: string; depositAmount: Prisma.Decimal },
  emit: (e: EventInput) => void,
  reason: string
) {
  await releaseFunds(tx, p.userId, D(p.depositAmount), {
    auctionId,
    note: `deposit released — ${reason}`,
  });
  await tx.auctionParticipant.update({
    where: { id: p.id },
    data: { depositStatus: "RELEASED", settledAt: new Date() },
  });
  emit({
    type: "DEPOSIT_RELEASED",
    userId: p.userId,
    payload: { amount: D(p.depositAmount).toFixed(2), reason },
  });
}

/** ENDED → PAYMENT_PENDING for the given bid; (re)uses the AuctionWinner row */
async function raiseWinner(
  tx: Tx,
  a: LockedAuction,
  top: Prisma.BidGetPayload<{ include: { user: true } }>,
  emit: (e: EventInput) => void,
  now: Date
) {
  const bidCount = await tx.bid.count({ where: { auctionId: a.id, sequence: { not: null } } });
  const order = await tx.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: top.userId,
      artworkId: a.artworkId,
      customerName: top.user.fullName,
      amount: top.amount,
      currency: a.currency,
      address: top.user.address ?? top.user.country ?? "—",
      paymentStatus: "PENDING",
      status: "CONFIRMED",
      source: "AUCTION",
      notes: `Auction ${a.id} — balance due within ${a.paymentDeadlineMin} min`,
    },
  });
  await tx.auctionWinner.upsert({
    where: { auctionId: a.id },
    create: {
      auctionId: a.id,
      userId: top.userId,
      finalAmount: top.amount,
      bidCount,
      endedAt: now,
      orderId: order.id,
    },
    update: { userId: top.userId, finalAmount: top.amount, bidCount, endedAt: now, orderId: order.id },
  });
  const paymentDueAt = new Date(now.getTime() + a.paymentDeadlineMin * 60_000);
  // ENDED → PAYMENT_PENDING, or PAYMENT_PENDING → PAYMENT_PENDING when the lot
  // passes to the runner-up after a failed settlement
  assertTransition(a.status, "PAYMENT_PENDING");
  await tx.auction.update({
    where: { id: a.id },
    data: { status: "PAYMENT_PENDING", paymentDueAt, version: { increment: 1 } },
  });
  emit({
    type: "WINNER_SELECTED",
    userId: top.userId,
    bidId: top.id,
    payload: { amount: D(top.amount).toFixed(2), orderId: order.id },
  });
  emit({
    type: "PAYMENT_STARTED",
    userId: top.userId,
    payload: { dueAt: paymentDueAt.toISOString(), orderId: order.id },
  });
}

/* ------------------------------------------------------------------ */
/*  settlement: pay the balance / fail                                 */
/* ------------------------------------------------------------------ */

async function settleLocked(
  tx: Tx,
  a: LockedAuction,
  emit: (e: EventInput) => void,
  how: { source: "wallet"; userId: string } | { source: "offline"; adminId?: string }
) {
  if (a.status !== "PAYMENT_PENDING") {
    throw new AuctionError("ALREADY_SETTLED", "This auction is not awaiting payment.");
  }
  const winner = await tx.auctionWinner.findUniqueOrThrow({ where: { auctionId: a.id } });
  if (how.source === "wallet" && how.userId !== winner.userId) {
    throw new AuctionError("NOT_WINNER", "Only the winning bidder can pay for this lot.");
  }
  const p = await tx.auctionParticipant.findUniqueOrThrow({
    where: { auctionId_userId: { auctionId: a.id, userId: winner.userId } },
  });
  const deposit = p.depositStatus === "LOCKED" ? D(p.depositAmount) : ZERO;
  const due = remainingDue(D(winner.finalAmount), deposit);

  if (how.source === "wallet") {
    const w = await lockWallet(tx, winner.userId);
    if (D(w.available).lt(due)) {
      throw new AuctionError(
        "INSUFFICIENT_FUNDS",
        `The balance due is ${due.toFixed(2)} ${a.currency}; your available balance is ${D(w.available).toFixed(2)}.`,
        { required: due.toFixed(2), available: D(w.available).toFixed(2) }
      );
    }
    if (due.gt(0)) {
      await debitFunds(tx, winner.userId, due, { auctionId: a.id, note: "auction balance" });
    }
  }
  // deposit counts toward the purchase either way
  if (deposit.gt(0)) {
    await applyLockedFunds(tx, winner.userId, deposit, { auctionId: a.id, note: "deposit applied to purchase" });
    await tx.auctionParticipant.update({
      where: { id: p.id },
      data: { depositStatus: "APPLIED", settledAt: new Date() },
    });
    emit({ type: "DEPOSIT_APPLIED", userId: winner.userId, payload: { amount: deposit.toFixed(2) } });
  }
  // a runner-up still holding a deposit is released now
  const others = await tx.auctionParticipant.findMany({
    where: { auctionId: a.id, depositStatus: "LOCKED", userId: { not: winner.userId } },
  });
  for (const o of others) await releaseParticipant(tx, a.id, o, emit, "settled");

  if (winner.orderId) {
    await tx.order.update({ where: { id: winner.orderId }, data: { paymentStatus: "PAID" } });
  }
  await tx.artwork.update({ where: { id: a.artworkId }, data: { status: "SOLD" } });
  await tx.auction.update({
    where: { id: a.id },
    data: { status: "COMPLETED", completedAt: new Date(), version: { increment: 1 } },
  });
  emit({
    type: "PAYMENT_COMPLETED",
    userId: winner.userId,
    payload: { paid: due.toFixed(2), depositApplied: deposit.toFixed(2), source: how.source },
  });
  emit({ type: "AUCTION_COMPLETED", userId: winner.userId });
}

/** the winner pays the remaining balance from their wallet */
export const payBalance = (auctionId: string, userId: string) =>
  withAuction(auctionId, (tx, a, emit) => settleLocked(tx, a, emit, { source: "wallet", userId }));

/** admin confirms the balance arrived by bank transfer / cheque / card */
export const confirmOfflinePayment = (auctionId: string, adminId?: string) =>
  withAuction(auctionId, (tx, a, emit) => settleLocked(tx, a, emit, { source: "offline", adminId }));

/** payment window elapsed (or admin declared it failed) */
export const failSettlement = (auctionId: string, reason = "payment deadline passed") =>
  withAuction(auctionId, async (tx, a, emit) => {
    if (a.status !== "PAYMENT_PENDING") return;
    const winner = await tx.auctionWinner.findUniqueOrThrow({ where: { auctionId: a.id } });
    const p = await tx.auctionParticipant.findUnique({
      where: { auctionId_userId: { auctionId: a.id, userId: winner.userId } },
    });
    emit({ type: "PAYMENT_FAILED", userId: winner.userId, payload: { reason } });

    // the defaulting winner's deposit — per the auction's policy
    if (p && p.depositStatus === "LOCKED") {
      if (a.failedPaymentDepositPolicy === "FORFEIT") {
        await applyLockedFunds(tx, winner.userId, D(p.depositAmount), {
          auctionId: a.id,
          note: "deposit forfeited — payment not received",
        });
        await tx.auctionParticipant.update({
          where: { id: p.id },
          data: { depositStatus: "FORFEITED", settledAt: new Date() },
        });
        emit({ type: "DEPOSIT_FORFEITED", userId: winner.userId, payload: { amount: D(p.depositAmount).toFixed(2) } });
      } else {
        await releaseParticipant(tx, a.id, p, emit, "payment failed");
      }
    }
    if (winner.orderId) {
      await tx.order.update({
        where: { id: winner.orderId },
        data: { status: "CANCELLED", paymentStatus: "FAILED" },
      });
    }

    // pass the lot to the runner-up, if configured and one is still holding a deposit
    if (a.offerToNextBidder) {
      const next = await tx.bid.findFirst({
        where: {
          auctionId: a.id,
          status: "OUTBID",
          userId: { not: winner.userId },
          user: {
            auctionParticipations: { some: { auctionId: a.id, depositStatus: "LOCKED" } },
          },
        },
        orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
        include: { user: true },
      });
      if (next) {
        // the runner-up's bid becomes the winning one
        await tx.bid.update({ where: { id: next.id }, data: { status: "WINNING" } });
        await tx.auction.update({
          where: { id: a.id },
          data: { currentPrice: next.amount, version: { increment: 1 } },
        });
        const fresh = await tx.auction.findUniqueOrThrow({
          where: { id: a.id },
          include: { artwork: { select: { id: true, title: true, status: true } } },
        });
        await raiseWinner(tx, fresh, next, emit, new Date());
        return;
      }
    }

    // nobody to pass to — release anyone still holding a deposit and fail
    const rest = await tx.auctionParticipant.findMany({
      where: { auctionId: a.id, depositStatus: "LOCKED" },
    });
    for (const r of rest) await releaseParticipant(tx, a.id, r, emit, "settlement failed");
    await tx.auction.update({
      where: { id: a.id },
      data: { status: "SETTLEMENT_FAILED", version: { increment: 1 } },
    });
    emit({ type: "SETTLEMENT_FAILED", userId: winner.userId });
  });

/** an AUCTION order was marked PAID in the orders panel → complete the auction */
export async function settleFromOrder(orderId: string) {
  const w = await prisma.auctionWinner.findUnique({ where: { orderId }, select: { auctionId: true } });
  if (!w) return;
  const a = await prisma.auction.findUnique({ where: { id: w.auctionId }, select: { status: true } });
  if (a?.status === "PAYMENT_PENDING") await confirmOfflinePayment(w.auctionId);
}

/* ------------------------------------------------------------------ */
/*  lifecycle: time-driven transitions                                 */
/* ------------------------------------------------------------------ */

/**
 * Applies whatever transition is due for this auction right now. Idempotent
 * and safe to call from anywhere — the sweeper, a page load, an SSE tick.
 * Loops because one call can be due for several steps (SCHEDULED past both
 * its registration and start times → straight to LIVE).
 */
export async function runLifecycle(auctionId: string): Promise<void> {
  for (let guard = 0; guard < 4; guard++) {
    const moved = await withAuction(auctionId, async (tx, a, emit) => {
      const now = new Date();
      switch (a.status) {
        case "SCHEDULED":
          if (now >= a.startAt) {
            await setStatus(tx, a, "LIVE");
            emit({ type: "AUCTION_STARTED", payload: { startAt: a.startAt.toISOString() } });
            return true;
          }
          if (a.registrationOpensAt && now >= a.registrationOpensAt) {
            await setStatus(tx, a, "REGISTRATION_OPEN");
            emit({ type: "REGISTRATION_OPENED" });
            return true;
          }
          return false;
        case "REGISTRATION_OPEN":
          if (now >= a.startAt) {
            await setStatus(tx, a, "LIVE");
            emit({ type: "AUCTION_STARTED", payload: { startAt: a.startAt.toISOString() } });
            return true;
          }
          return false;
        case "LIVE":
          if (now >= a.endAt) {
            await closeLocked(tx, a, emit);
            return true;
          }
          return false;
        case "PAYMENT_PENDING":
          if (a.paymentDueAt && now >= a.paymentDueAt) {
            // fall through the same path an admin "declare failed" takes
            return "FAIL";
          }
          return false;
        default:
          return false;
      }
    });
    if (moved === "FAIL") {
      await failSettlement(auctionId);
      continue;
    }
    if (!moved) return;
  }
}

/** every auction with a due timestamp — the sweeper's work list */
export async function runDueLifecycles(): Promise<number> {
  const now = new Date();
  const due = await prisma.auction.findMany({
    where: {
      OR: [
        { status: "SCHEDULED", startAt: { lte: now } },
        { status: "SCHEDULED", registrationOpensAt: { lte: now } },
        { status: "REGISTRATION_OPEN", startAt: { lte: now } },
        { status: "LIVE", endAt: { lte: now } },
        { status: "PAYMENT_PENDING", paymentDueAt: { lte: now } },
      ],
    },
    select: { id: true },
  });
  for (const { id } of due) {
    try {
      await runLifecycle(id);
    } catch (e) {
      console.error(`[auction] lifecycle failed for ${id}:`, e);
    }
  }
  return due.length;
}
