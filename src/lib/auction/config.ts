// System-wide defaults for new auctions. Each auction snapshots these onto its
// own row at creation, so changing an env var later never rewrites the terms
// of an auction that members already joined.
//
// Every value can be overridden per auction from the admin form.

const num = (key: string, fallback: number) => {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

export const AUCTION_DEFAULTS = {
  /** % of intrinsic value a member locks to enter the room */
  depositPercent: num("AUCTION_DEPOSIT_PERCENT", 50),
  /** next bid must be ≥ current × (1 + this/100) — compound, on the CURRENT price */
  bidIncrementPercent: num("AUCTION_BID_INCREMENT_PERCENT", 20),
  /** bidder must hold this % of the bid (wallet available + own locked deposit
   *  − amounts they are currently leading elsewhere) */
  bidCoveragePercent: num("AUCTION_BID_COVERAGE_PERCENT", 100),
  /** a valid bid inside this many seconds of the end extends the auction */
  antiSnipingWindowSec: num("AUCTION_ANTI_SNIPING_WINDOW_SEC", 30),
  /** by this many seconds */
  extensionSec: num("AUCTION_EXTENSION_SEC", 30),
  /** the winner has this long to pay the balance */
  paymentDeadlineMin: num("AUCTION_PAYMENT_DEADLINE_MIN", 30),
  /** what happens to the winner's deposit if they do not pay in time */
  failedPaymentDepositPolicy: (process.env.AUCTION_FAILED_PAYMENT_DEPOSIT_POLICY ===
  "FORFEIT"
    ? "FORFEIT"
    : "RELEASE") as "RELEASE" | "FORFEIT",
  /** on settlement failure, offer the lot to the runner-up */
  offerToNextBidder: process.env.AUCTION_OFFER_TO_NEXT_BIDDER === "true",
} as const;

/** how often the lifecycle sweeper looks for due transitions (ms) */
export const SWEEPER_INTERVAL_MS = num("AUCTION_SWEEPER_INTERVAL_MS", 3000);
