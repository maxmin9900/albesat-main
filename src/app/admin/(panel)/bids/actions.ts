"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { BidStatus } from "@prisma/client";

export async function setBidStatus(id: string, status: BidStatus) {
  await prisma.bid.update({ where: { id }, data: { status } });
  revalidatePath("/admin/bids");
}
