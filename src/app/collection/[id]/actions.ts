"use server";

import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";
import { generateOrderNumber } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  artworkId: z.string().min(1),
  customerName: z.string().trim().min(2, "Please enter your full name"),
  address: z.string().trim().min(8, "Please enter your delivery address"),
});

export type AcquireState = {
  ok?: boolean;
  error?: string;
  needLogin?: boolean;
};

/**
 * "Acquire This Piece" — members only, so the order in the admin panel is
 * linked to a real registered customer (US-ADM-ORD-1 / US-ADM-CRM-1).
 */
export async function acquirePiece(
  _prev: AcquireState,
  formData: FormData
): Promise<AcquireState> {
  const session = await getUserSession();
  if (!session) {
    return { needLogin: true, error: "Please sign in to acquire this piece." };
  }

  const parsed = schema.safeParse({
    artworkId: formData.get("artworkId"),
    customerName: formData.get("customerName"),
    address: formData.get("address"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const artwork = await prisma.artwork.findUnique({
    where: { id: parsed.data.artworkId },
  });
  if (!artwork || artwork.status !== "PUBLISHED") {
    return { error: "This piece is no longer available." };
  }

  await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: session.uid,
      artworkId: artwork.id,
      customerName: parsed.data.customerName,
      amount: artwork.price,
      currency: artwork.currency,
      address: parsed.data.address,
      paymentStatus: "PENDING",
      status: "PENDING",
      source: "DIRECT",
      notes: `Placed from the website by ${session.email ?? session.mobile ?? session.name}`,
    },
  });

  revalidatePath("/admin/orders");
  return { ok: true };
}
