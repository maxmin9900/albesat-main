import { EventEmitter } from "node:events";
import type { AuctionEvent } from "@prisma/client";

/**
 * In-process fan-out of committed auction events to the SSE streams.
 *
 * The project has no message broker, and runs as one Node process, so an
 * EventEmitter is the whole bus. The stream route ALSO polls the AuctionEvent
 * table for anything newer than its cursor, so if this ever runs as several
 * instances the only cost is a couple of seconds of latency for events that
 * committed on a sibling — nothing is lost.
 */
declare global {
  // survives Next's dev-mode module reloads
  // eslint-disable-next-line no-var
  var __auctionBus: EventEmitter | undefined;
}

const bus = globalThis.__auctionBus ?? new EventEmitter();
bus.setMaxListeners(0);
if (process.env.NODE_ENV !== "production") globalThis.__auctionBus = bus;

const channel = (auctionId: string) => `auction:${auctionId}`;

export function publishAuctionEvents(auctionId: string, events: AuctionEvent[]) {
  if (events.length === 0) return;
  bus.emit(channel(auctionId), events);
}

export function subscribeAuction(
  auctionId: string,
  handler: (events: AuctionEvent[]) => void
): () => void {
  bus.on(channel(auctionId), handler);
  return () => bus.off(channel(auctionId), handler);
}
