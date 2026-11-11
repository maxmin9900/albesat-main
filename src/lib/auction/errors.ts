export type AuctionErrorCode =
  | "NOT_FOUND"
  | "NOT_SIGNED_IN"
  | "ILLEGAL_TRANSITION"
  | "NOT_JOINABLE"
  | "NOT_LIVE"
  | "EXPIRED"
  | "NOT_PARTICIPANT"
  | "DEPOSIT_NOT_HELD"
  | "INSUFFICIENT_FUNDS"
  | "BID_TOO_LOW"
  | "INSUFFICIENT_CAPACITY"
  | "NOT_WINNER"
  | "ALREADY_SETTLED"
  | "NO_INTRINSIC_VALUE"
  | "NO_LOTS"
  | "INVALID";

/**
 * A domain failure the caller is expected to show to a person. Anything else
 * thrown from the service is a genuine bug and should surface as a 500.
 */
export class AuctionError extends Error {
  constructor(
    public readonly code: AuctionErrorCode,
    message: string,
    /** machine-readable extras — e.g. the minimum bid, or the shortfall */
    public readonly details?: Record<string, string | number>
  ) {
    super(message);
    this.name = "AuctionError";
  }
}

export const isAuctionError = (e: unknown): e is AuctionError =>
  e instanceof AuctionError;
