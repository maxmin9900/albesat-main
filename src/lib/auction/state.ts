import type { AuctionStatus } from "@prisma/client";
import { AuctionError } from "./errors";

/**
 * The auction state machine. Every status change in the service goes through
 * `assertTransition`, so an illegal jump (e.g. COMPLETED → LIVE) is impossible
 * no matter which admin button or sweeper tick asked for it.
 *
 *   DRAFT → SCHEDULED → REGISTRATION_OPEN → LIVE → ENDED → PAYMENT_PENDING → COMPLETED
 *                                                                        ↘ SETTLEMENT_FAILED
 *   (anything not terminal) → CANCELLED
 */
const TRANSITIONS: Record<AuctionStatus, readonly AuctionStatus[]> = {
  DRAFT: ["SCHEDULED", "REGISTRATION_OPEN", "LIVE", "CANCELLED"],
  SCHEDULED: ["REGISTRATION_OPEN", "LIVE", "CANCELLED"],
  REGISTRATION_OPEN: ["LIVE", "CANCELLED"],
  LIVE: ["ENDED", "CANCELLED"],
  ENDED: ["PAYMENT_PENDING", "CANCELLED"],
  PAYMENT_PENDING: ["COMPLETED", "SETTLEMENT_FAILED", "PAYMENT_PENDING", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  SETTLEMENT_FAILED: [],
};

export function canTransition(from: AuctionStatus, to: AuctionStatus) {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: AuctionStatus, to: AuctionStatus) {
  if (!canTransition(from, to)) {
    throw new AuctionError(
      "ILLEGAL_TRANSITION",
      `Auction cannot go from ${from} to ${to}.`
    );
  }
}

/** states in which a member may still join and lock a deposit */
export const JOINABLE: readonly AuctionStatus[] = ["REGISTRATION_OPEN", "LIVE"];
/** states the sweeper has to watch for time-based transitions */
export const TIME_DRIVEN: readonly AuctionStatus[] = [
  "SCHEDULED",
  "REGISTRATION_OPEN",
  "LIVE",
  "PAYMENT_PENDING",
];
export const TERMINAL: readonly AuctionStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "SETTLEMENT_FAILED",
];
