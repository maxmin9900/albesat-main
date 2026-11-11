"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as auction from "@/lib/auction/service";
import { isAuctionError } from "@/lib/auction/errors";
import { D } from "@/lib/auction/money";
import { LIVE_AUCTION_ROOMS } from "@/lib/auction/flags";
import { placeLegacyBid } from "@/lib/auction/legacy";

const schema = z.object({
  auctionId: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export type BidState = {
  ok?: boolean;
  error?: string;
  amount?: number;
  /** no signed-in member — the UI sends the visitor to /login */
  needLogin?: boolean;
};

/**
 * Bid from the Royal Auction hall. Kept with its original signature for the
 * hall's form, but the rules now live in the auction service: the member must
 * have joined the room (deposit locked), the bid must clear the compound
 * minimum, and the whole thing runs under the auction row lock.
 */
export async function placeBid(
  _prev: BidState,
  formData: FormData
): Promise<BidState> {
  const session = await getUserSession();
  if (!session) return { needLogin: true, error: "Please sign in to bid." };

  const parsed = schema.safeParse({
    auctionId: formData.get("auctionId"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { error: "Invalid bid." };

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) return { needLogin: true, error: "Please sign in again." };

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  // Rooms off (the production server): classic hall bidding, flat increment,
  // no deposit — exactly the behaviour the site shipped with.
  if (!LIVE_AUCTION_ROOMS) {
    const r = await placeLegacyBid({
      auctionId: parsed.data.auctionId,
      userId: user.id,
      amount: D(parsed.data.amount),
      ipAddress: ip,
      country: user.country ?? "Oman",
    });
    revalidatePath("/auctions");
    revalidatePath("/admin/bids");
    if (!r.ok) return { error: r.error };
    return { ok: true, amount: Number(r.amount) };
  }

  try {
    const outcome = await auction.placeBid({
      auctionId: parsed.data.auctionId,
      userId: user.id,
      amount: D(parsed.data.amount),
      ipAddress: ip,
      country: user.country ?? "Oman",
    });
    revalidatePath("/auctions");
    revalidatePath("/admin/bids");
    if (!outcome.accepted) return { error: outcome.reason };
    return { ok: true, amount: Number(outcome.amount) };
  } catch (e) {
    if (isAuctionError(e)) return { error: e.message };
    throw e;
  }
}
