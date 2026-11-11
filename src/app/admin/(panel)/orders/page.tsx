import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Table, Badge, EmptyState } from "@/components/admin/ui";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { artwork: { select: { title: true } } },
  });

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${orders.length} orders`} />

      {orders.length === 0 ? (
        <EmptyState text="No orders yet." />
      ) : (
        <Table
          head={[
            "Number",
            "Customer",
            "Work",
            "Amount",
            "Payment",
            "Status",
            "Date",
            "",
          ]}
        >
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status];
            const ps = PAYMENT_STATUS[o.paymentStatus];
            return (
              <tr key={o.id} className="hover:bg-space/50">
                <td className="px-4 py-3 text-xs text-muted">
                  {o.orderNumber}
                </td>
                <td className="px-4 py-3 text-silk">{o.customerName}</td>
                <td className="px-4 py-3 text-cream/80">{o.artwork.title}</td>
                <td className="px-4 py-3 text-gold">
                  {formatCurrency(Number(o.amount), o.currency)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={ps.tone}>{ps.label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {formatDate(o.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="text-xs text-gold hover:text-gold-light"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
