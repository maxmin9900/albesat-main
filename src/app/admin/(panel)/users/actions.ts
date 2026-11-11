"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { KycStatus } from "@prisma/client";

export async function setKycStatus(id: string, kycStatus: KycStatus) {
  await prisma.user.update({ where: { id }, data: { kycStatus } });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
}

/* ---- member funds ------------------------------------------------------ */
// The project has no payment gateway: a member funds their account by bank
// transfer or certified cheque, and the concierge records it here. Every
// movement is a WalletTransaction row with the admin's id and a note.

import { getSession } from "@/lib/auth";
import { creditFunds, adjustFunds } from "@/lib/auction/wallet";
import { D } from "@/lib/auction/money";
import { isAuctionError } from "@/lib/auction/errors";

export type WalletActionState = { ok?: boolean; error?: string };

export async function creditWallet(
  _prev: WalletActionState,
  formData: FormData
): Promise<WalletActionState> {
  const admin = await getSession();
  if (!admin) return { error: "Not signed in." };
  const userId = String(formData.get("userId") ?? "");
  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim();
  if (!userId || !Number.isFinite(amount) || amount <= 0) return { error: "Enter a positive amount." };
  if (note.length < 3) return { error: "A note is required (e.g. bank transfer ref)." };
  try {
    await prisma.$transaction((tx) =>
      creditFunds(tx, userId, D(amount), { note, createdByAdmin: admin.sub })
    );
  } catch (e) {
    if (isAuctionError(e)) return { error: e.message };
    throw e;
  }
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function adjustWallet(
  _prev: WalletActionState,
  formData: FormData
): Promise<WalletActionState> {
  const admin = await getSession();
  if (!admin) return { error: "Not signed in." };
  const userId = String(formData.get("userId") ?? "");
  const delta = Number(formData.get("delta"));
  const note = String(formData.get("note") ?? "").trim();
  if (!userId || !Number.isFinite(delta) || delta === 0) return { error: "Enter a non-zero amount (negative removes)." };
  if (note.length < 3) return { error: "A note is required for adjustments." };
  try {
    await prisma.$transaction((tx) =>
      adjustFunds(tx, userId, D(delta), { note, createdByAdmin: admin.sub })
    );
  } catch (e) {
    if (isAuctionError(e)) return { error: e.message };
    throw e;
  }
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}
