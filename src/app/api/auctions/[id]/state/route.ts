import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/user-auth";
import { buildRoomSnapshot } from "@/lib/auction/snapshot";
import { runLifecycle } from "@/lib/auction/service";
import { LIVE_AUCTION_ROOMS } from "@/lib/auction/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One JSON snapshot of the room for the current viewer. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!LIVE_AUCTION_ROOMS) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { id } = await ctx.params;
  const session = await getUserSession();
  // apply any transition that is due before answering, so a viewer never sees
  // a stale LIVE on an auction whose timer has run out
  await runLifecycle(id).catch(() => {});
  const snap = await buildRoomSnapshot(id, session?.uid ?? null);
  if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(snap, { headers: { "Cache-Control": "no-store" } });
}
