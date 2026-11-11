"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";
import { isAuctionError } from "@/lib/auction/errors";
import * as auction from "@/lib/auction/service";
import { D } from "@/lib/auction/money";

/**
 * Thin, typed wrappers around the auction service for the room UI. All the
 * rules live in the service; these only translate session + form → service
 * call → result the client can render. Nothing here is trusted by the
 * service — it re-validates everything under the auction row lock.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string; details?: Record<string, string | number>; needLogin?: boolean };

const fail = (e: unknown): ActionResult<never> => {
  if (isAuctionError(e)) return { ok: false, error: e.message, code: e.code, details: e.details };
  console.error("[auction action]", e);
  return { ok: false, error: "Something went wrong. Please try again.", code: "INTERNAL" };
};

export async function joinAuctionAction(auctionId: string): Promise<ActionResult<auction.JoinResult>> {
  const session = await getUserSession();
  if (!session) return { ok: false, error: "Please sign in to join.", code: "NOT_SIGNED_IN", needLogin: true };
  try {
    return { ok: true, data: await auction.joinAuction(auctionId, session.uid) };
  } catch (e) {
    return fail(e);
  }
}

const bidSchema = z.object({
  auctionId: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  idempotencyKey: z.string().min(8).max(80),
});

export async function placeBidAction(input: {
  auctionId: string;
  amount: string;
  idempotencyKey: string;
}): Promise<ActionResult<auction.BidOutcome>> {
  const session = await getUserSession();
  if (!session) return { ok: false, error: "Please sign in to bid.", code: "NOT_SIGNED_IN", needLogin: true };
  const parsed = bidSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid bid.", code: "INVALID" };

  const user = await prisma.user.findUnique({ where: { id: session.uid }, select: { country: true } });
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? null;

  try {
    const outcome = await auction.placeBid({
      auctionId: parsed.data.auctionId,
      userId: session.uid,
      amount: D(parsed.data.amount),
      idempotencyKey: parsed.data.idempotencyKey,
      ipAddress: ip,
      country: user?.country ?? null,
    });
    return { ok: true, data: outcome };
  } catch (e) {
    return fail(e);
  }
}

export async function payBalanceAction(auctionId: string): Promise<ActionResult> {
  const session = await getUserSession();
  if (!session) return { ok: false, error: "Please sign in.", code: "NOT_SIGNED_IN", needLogin: true };
  try {
    await auction.payBalance(auctionId, session.uid);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}
