import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/admin/ui";
import OrderManager from "@/components/admin/OrderManager";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      artwork: { select: { title: true, code: true, city: true } },
      user: { select: { fullName: true, mobile: true, email: true } },
    },
  });
  if (!order) notFound();

  return (
    <div>
      <PageHeader title="Order details" subtitle={order.orderNumber} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-display text-xl text-silk">Order details</h3>
          <dl className="grid grid-cols-2 gap-y-4 text-sm">
            <Row label="Customer name" value={order.customerName} />
            <Row label="Work" value={`${order.artwork.title} (${order.artwork.code})`} />
            <Row
              label="Amount"
              value={formatCurrency(Number(order.amount), order.currency)}
            />
            <Row label="Source" value={order.source === "AUCTION" ? "Auction" : "Direct sale"} />
            <div className="col-span-2">
              <dt className="mb-1 text-muted">Address</dt>
              <dd className="text-cream/90">{order.address}</dd>
            </div>
            {order.user && (
              <div className="col-span-2">
                <dt className="mb-1 text-muted">Customer contact</dt>
                <dd className="text-cream/90">
                  {order.user.mobile} · {order.user.email}
                </dd>
              </div>
            )}
            <Row label="Placed on" value={formatDate(order.createdAt)} />
            {order.trackingCode && (
              <Row label="Current tracking code" value={order.trackingCode} />
            )}
          </dl>
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-xl text-silk">Manage status</h3>
          <OrderManager
            id={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
            trackingCode={order.trackingCode}
          />
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 text-cream/90">{value}</dd>
    </div>
  );
}
