import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";
import { subscribeAuction } from "@/lib/auction/bus";
import { buildRoomSnapshot } from "@/lib/auction/snapshot";
import { runLifecycle } from "@/lib/auction/service";
import type { AuctionEvent } from "@prisma/client";
import { LIVE_AUCTION_ROOMS } from "@/lib/auction/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events feed for one auction room.
 *
 * Why SSE: the project has no WebSocket server, broker or Redis, and adding
 * one for a single feature would change the deployment. SSE is plain HTTP,
 * needs no dependency, streams from a normal route handler and passes through
 * nginx unchanged (see the X-Accel-Buffering header below).
 *
 * Each message carries the events that just committed AND a fresh snapshot
 * built for this viewer, so the client never has to reconstruct state from a
 * partial event stream. Sources, in order of speed:
 *   1. the in-process bus — fires the moment a transaction commits
 *   2. a catch-up query every few seconds for events past the cursor (covers
 *      a second server instance, or a bus event lost mid-reconnect)
 *   3. a heartbeat comment so proxies keep the connection open
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!LIVE_AUCTION_ROOMS) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  const session = await getUserSession();
  const viewerId = session?.uid ?? null;

  const url = new URL(req.url);
  let cursor = Number(url.searchParams.get("since") ?? 0) || 0;

  const exists = await prisma.auction.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };
      const heartbeat = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          closed = true;
        }
      };

      // push = events + a viewer-specific snapshot
      let pushing: Promise<void> | null = null;
      const push = async (events: AuctionEvent[]) => {
        const fresh = events.filter((e) => e.id > cursor);
        if (fresh.length === 0) return;
        cursor = Math.max(cursor, ...fresh.map((e) => e.id));
        const snapshot = await buildRoomSnapshot(id, viewerId);
        send("auction", {
          events: fresh.map((e) => ({
            id: e.id,
            type: e.type,
            userId: e.userId,
            payload: e.payload,
            at: e.createdAt.toISOString(),
          })),
          snapshot,
        });
      };
      const queuePush = (events: AuctionEvent[]) => {
        pushing = (pushing ?? Promise.resolve()).then(() => push(events)).catch(() => {});
      };

      // 1. instant fan-out from the bus
      const unsubscribe = subscribeAuction(id, queuePush);

      // initial hello with the current snapshot so the room hydrates at once
      const first = await buildRoomSnapshot(id, viewerId);
      cursor = Math.max(cursor, first?.lastEventId ?? 0);
      send("hello", { snapshot: first, cursor });

      // 2. catch-up + lifecycle tick every 2 s, 3. heartbeat every 15 s
      const catchUp = setInterval(async () => {
        if (closed) return;
        try {
          await runLifecycle(id);
          const missed = await prisma.auctionEvent.findMany({
            where: { auctionId: id, id: { gt: cursor } },
            orderBy: { id: "asc" },
            take: 100,
          });
          if (missed.length) queuePush(missed);
        } catch {
          /* transient — next tick retries */
        }
      }, 2000);
      const beat = setInterval(heartbeat, 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(catchUp);
        clearInterval(beat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // tells nginx not to buffer this response — without it events arrive
      // in bursts instead of live
      "X-Accel-Buffering": "no",
    },
  });
}
