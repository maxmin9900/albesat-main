"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { settleFromOrder } from "@/lib/auction/service";

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

export async function updatePaymentStatus(
  id: string,
  paymentStatus: PaymentStatus
) {
  await prisma.order.update({ where: { id }, data: { paymentStatus } });
  // an auction lot paid off-line completes its auction (deposit applied,
  // work marked sold) — the service is idempotent if it already did
  if (paymentStatus === "PAID") await settleFromOrder(id).catch(() => {});
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/auctions");
}

export async function setTrackingCode(id: string, trackingCode: string) {
  await prisma.order.update({
    where: { id },
    data: { trackingCode, status: "SHIPPED" },
  });
  revalidatePath(`/admin/orders/${id}`);
}

export async function completeOrder(id: string) {
  await prisma.order.update({
    where: { id },
    data: { status: "COMPLETED" },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}
