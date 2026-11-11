/**
 * Runs once when the Next.js server boots. Used to start the auction lifecycle
 * sweeper — the only piece of the auction that must run without a request.
 *
 * Shape matters here: Next compiles this file for BOTH the Node and the Edge
 * runtime. Keeping every import INSIDE the `if (NEXT_RUNTIME === "nodejs")`
 * block lets webpack drop the whole branch from the Edge build (the constant
 * is inlined per runtime, so the block is dead code there). An early `return`
 * would not do that, and the sweeper's `node:crypto` dependency would break
 * the Edge compilation.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { LIVE_AUCTION_ROOMS } = await import("./lib/auction/flags");
    if (LIVE_AUCTION_ROOMS) {
      const { startAuctionSweeper } = await import("./lib/auction/sweeper");
      startAuctionSweeper();
    } else {
      // the rooms are off (local-only feature) — nothing needs a timer;
      // auctions are closed by hand from the Winners panel, as before
      console.log("[auction] live rooms disabled — sweeper not started");
    }
  }
}
