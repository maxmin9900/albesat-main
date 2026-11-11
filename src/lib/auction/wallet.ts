import "server-only";
import type { Prisma, WalletTxType } from "@prisma/client";
import { D, ZERO, type Money } from "./money";
import { AuctionError } from "./errors";

/**
 * Member funds. Everything here takes the transaction client, locks the
 * wallet row with SELECT … FOR UPDATE, moves money between `available` and
 * `locked`, and writes one immutable WalletTransaction per movement.
 *
 * Callers must already hold the auction row lock (see service.ts) so the lock
 * order is always Auction → Wallet and two concurrent bids cannot deadlock.
 */
export type Tx = Prisma.TransactionClient;

type Meta = {
  auctionId?: string;
  bidId?: string;
  note?: string;
  createdByAdmin?: string;
};

/** get-or-create, then take the row lock */
export async function lockWallet(tx: Tx, userId: string) {
  await tx.wallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });
  await tx.$queryRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
  return tx.wallet.findUniqueOrThrow({ where: { userId } });
}

async function move(
  tx: Tx,
  userId: string,
  type: WalletTxType,
  amount: Money,
  dAvailable: Money,
  dLocked: Money,
  meta: Meta
) {
  const w = await lockWallet(tx, userId);
  const available = D(w.available).add(dAvailable);
  const locked = D(w.locked).add(dLocked);
  if (available.isNegative() || locked.isNegative()) {
    throw new AuctionError("INSUFFICIENT_FUNDS", "Insufficient funds.", {
      available: D(w.available).toFixed(2),
      required: amount.toFixed(2),
    });
  }
  await tx.wallet.update({
    where: { id: w.id },
    data: { available, locked, version: { increment: 1 } },
  });
  return tx.walletTransaction.create({
    data: {
      walletId: w.id,
      type,
      amount,
      availableAfter: available,
      lockedAfter: locked,
      auctionId: meta.auctionId,
      bidId: meta.bidId,
      note: meta.note,
      createdByAdmin: meta.createdByAdmin,
    },
  });
}

/** available → locked (the auction deposit) */
export const lockFunds = (tx: Tx, userId: string, amount: Money, meta: Meta) =>
  move(tx, userId, "LOCK", amount, amount.neg(), amount, meta);

/** locked → available (deposit returned) */
export const releaseFunds = (tx: Tx, userId: string, amount: Money, meta: Meta) =>
  move(tx, userId, "RELEASE", amount, amount, amount.neg(), meta);

/** locked → gone (deposit counted toward the purchase) */
export const applyLockedFunds = (tx: Tx, userId: string, amount: Money, meta: Meta) =>
  move(tx, userId, "APPLY", amount, ZERO, amount.neg(), meta);

/** available → gone (the winner's remaining balance) */
export const debitFunds = (tx: Tx, userId: string, amount: Money, meta: Meta) =>
  move(tx, userId, "DEBIT", amount, amount.neg(), ZERO, meta);

/** admin-confirmed funds in */
export const creditFunds = (tx: Tx, userId: string, amount: Money, meta: Meta) =>
  move(tx, userId, "CREDIT", amount, amount, ZERO, meta);

/** signed correction by an admin — positive adds, negative removes; note required */
export const adjustFunds = (tx: Tx, userId: string, delta: Money, meta: Meta & { note: string }) =>
  move(tx, userId, "ADJUST", delta.abs(), delta, ZERO, meta);
