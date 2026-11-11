"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isOpenForRegistration } from "@/lib/auction/registration";

export type RegisterState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  auctionId: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(2, "Please give your full name")
    .max(80, "That name is too long"),
  // Deliberately permissive: Oman, Iran and Gulf numbers arrive in a dozen
  // shapes (+968…, 00968…, spaced, dashed). Reject only what cannot be a
  // phone number at all rather than bouncing a real customer.
  phone: z
    .string()
    .trim()
    .min(6, "Please give a phone number we can reach you on")
    .max(32, "That phone number is too long")
    .refine((v) => (v.match(/\d/g) ?? []).length >= 6, {
      message: "Please give a phone number we can reach you on",
    }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please give a valid email address")
    .max(120),
  note: z.string().trim().max(500).optional(),
});

/**
 * Register interest in one lot.
 *
 * No account, no deposit — the visitor leaves a name, a phone and an email,
 * and the admin panel shows who registered for which carpet. Submitting twice
 * with the same email updates the earlier entry instead of stacking duplicates.
 */
export async function registerForAuction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please check the details below.", fieldErrors };
  }
  const d = parsed.data;

  // Everything that touches the database is guarded: an unhandled throw here
  // would leave the visitor looking at the errors from their previous attempt
  // with no idea the submission never landed.
  try {
    const auction = await prisma.auction.findUnique({
      where: { id: d.auctionId },
      select: { id: true, status: true },
    });
    if (!auction) return { error: "This auction no longer exists." };
    if (!isOpenForRegistration(auction.status)) {
      return { error: "Registration for this lot is closed." };
    }

    await prisma.auctionRegistration.upsert({
      where: { auctionId_email: { auctionId: d.auctionId, email: d.email } },
      create: {
        auctionId: d.auctionId,
        name: d.name,
        phone: d.phone,
        email: d.email,
        note: d.note || null,
      },
      update: {
        name: d.name,
        phone: d.phone,
        note: d.note || null,
      },
    });
  } catch (e) {
    console.error("[auction] registration failed", e);
    return {
      error:
        "We could not save your registration just now. Please try again, " +
        "or call us and we will add you to the list.",
    };
  }

  revalidatePath("/admin/auctions");
  revalidatePath(`/admin/auctions/${d.auctionId}`);

  // Back to the sale, with the confirmation banner. Registration covers the
  // whole session, so there is no single lot to land on.
  redirect(`/auctions?session=${d.auctionId}&registered=1#register`);
}
