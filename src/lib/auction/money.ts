// The five financial rules of the auction, as pure functions. This module is
// the single source of truth — the server enforces it, the UI only displays
// what it returns.
//
//   1. starting price  = intrinsic value
//   2. deposit         = intrinsic value × depositPercent
//   3. min next bid    = CURRENT price × (1 + incrementPercent)   ← compound
//   4. max bid         = unlimited
//   5. non-winner deposit is refundable after settlement
//
// All arithmetic is done in Prisma.Decimal to avoid float drift on money.

import { Prisma } from "@prisma/client";

export type Money = Prisma.Decimal;
export const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
export const ZERO = D(0);

/** round to the currency's 2 decimals, half-up */
export const round2 = (v: Money) => v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
/** round UP to 2 decimals — used for minimums so a bidder can never undercut by a fraction */
export const ceil2 = (v: Money) => v.toDecimalPlaces(2, Prisma.Decimal.ROUND_UP);

/** rule 1 */
export function startingPriceFor(intrinsicValue: Money): Money {
  return round2(intrinsicValue);
}

/** rule 2 */
export function depositFor(intrinsicValue: Money, depositPercent: Money): Money {
  return round2(intrinsicValue.mul(depositPercent).div(100));
}

/**
 * rule 3. The first bid may equal the starting price; every later bid must
 * clear the current price by the increment — computed on the CURRENT price,
 * never on the starting price.
 */
export function minNextBid(
  currentPrice: Money,
  incrementPercent: Money,
  hasBids: boolean
): Money {
  if (!hasBids) return round2(currentPrice);
  return ceil2(currentPrice.mul(D(100).add(incrementPercent)).div(100));
}

/** how much of a bid the bidder must be able to cover */
export function requiredCoverage(bidAmount: Money, coveragePercent: Money): Money {
  return round2(bidAmount.mul(coveragePercent).div(100));
}

/** what the winner still owes after their deposit is applied */
export function remainingDue(finalPrice: Money, depositApplied: Money): Money {
  const due = finalPrice.sub(depositApplied);
  return due.isNegative() ? ZERO : round2(due);
}

/** the compound ladder from the current price — handy for the UI's quick-bid buttons */
export function bidLadder(
  currentPrice: Money,
  incrementPercent: Money,
  hasBids: boolean,
  steps = 3
): Money[] {
  const out: Money[] = [];
  let p = minNextBid(currentPrice, incrementPercent, hasBids);
  for (let i = 0; i < steps; i++) {
    out.push(p);
    p = minNextBid(p, incrementPercent, true);
  }
  return out;
}
