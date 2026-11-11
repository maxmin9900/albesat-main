import "server-only";
import { SWEEPER_INTERVAL_MS } from "./config";
import { runDueLifecycles } from "./service";

/**
 * Time-driven transitions (open registration, go live, hammer, payment
 * deadline) need something to fire them even when nobody has the room open.
 * The project has no cron or queue, so this is a single setInterval started
 * once per process from src/instrumentation.ts.
 *
 * Ticks never overlap: if one is still running when the next is due, the next
 * is skipped. Each auction's transition is itself idempotent, so a page load
 * or SSE tick calling runLifecycle at the same moment is harmless.
 */
declare global {
  // eslint-disable-next-line no-var
  var __auctionSweeper: NodeJS.Timeout | undefined;
}

let running = false;

export function startAuctionSweeper() {
  if (globalThis.__auctionSweeper) return;
  globalThis.__auctionSweeper = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await runDueLifecycles();
    } catch (e) {
      console.error("[auction] sweeper tick failed:", e);
    } finally {
      running = false;
    }
  }, SWEEPER_INTERVAL_MS);
  // don't keep a shutting-down process alive
  globalThis.__auctionSweeper.unref?.();
  console.log(`[auction] sweeper started (every ${SWEEPER_INTERVAL_MS} ms)`);
}
