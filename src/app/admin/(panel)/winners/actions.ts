"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import * as auction from "@/lib/auction/service";
import { isAuctionError } from "@/lib/auction/errors";
import { LIVE_AUCTION_ROOMS } from "@/lib/auction/flags";
import { finalizeLegacy } from "@/lib/auction/legacy";

/**
 * Finalize an auction from the Winners panel. The winner selection, order and
 * deposit release all live in the auction service now (one row-locked
 * transaction, state machine enforced); this button just brings the hammer
 * down if the clock has run out, or immediately if an admin insists.
 */
export async function finalizeAuction(auctionId: string) {
  const a = await prisma.auction.findUnique({ where: { id: auctionId }, select: { status: true, endAt: true } });
  if (!a) return;
  // rooms off (the server): the one-step close the panel always had
  if (!LIVE_AUCTION_ROOMS) {
    await finalizeLegacy(auctionId);
    revalidatePath("/admin/winners");
    revalidatePath("/admin/auctions");
    revalidatePath("/admin/collection");
    revalidatePath("/admin/orders");
    return;
  }
  try {
    if (a.status === "LIVE" || a.status === "SCHEDULED" || a.status === "REGISTRATION_OPEN") {
      // due transitions first (SCHEDULED past its start goes LIVE, LIVE past its end closes)
      await auction.runLifecycle(auctionId);
      const after = await prisma.auction.findUnique({ where: { id: auctionId }, select: { status: true } });
      if (after?.status === "LIVE") await auction.endNow(auctionId);
    }
  } catch (e) {
    if (!isAuctionError(e)) throw e;
  }
  revalidatePath("/admin/winners");
  revalidatePath("/admin/auctions");
  revalidatePath("/admin/collection");
  revalidatePath("/admin/orders");
}

/** the balance arrived off-line (bank transfer / cheque) — mark the lot sold */
export async function confirmWinnerPayment(auctionId: string) {
  try {
    await auction.confirmOfflinePayment(auctionId);
  } catch (e) {
    if (!isAuctionError(e)) throw e;
  }
  revalidatePath("/admin/winners");
  revalidatePath("/admin/auctions");
  revalidatePath("/admin/orders");
}

export async function notifyWinner(
  winnerId: string,
  channel: "email" | "sms"
) {
  // In production this would call an email/SMS provider.
  await prisma.auctionWinner.update({
    where: { id: winnerId },
    data: channel === "email" ? { emailSent: true } : { smsSent: true },
  });
  revalidatePath("/admin/winners");
}
