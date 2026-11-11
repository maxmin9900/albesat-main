import { prisma } from "@/lib/prisma";
import { PageHeader, Table, Badge, EmptyState } from "@/components/admin/ui";
import BidFilters from "@/components/admin/BidFilters";
import BidRowActions from "@/components/admin/BidRowActions";
import { BID_STATUS } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Prisma, BidStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function BidsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;

  const where: Prisma.BidWhereInput = {};
  if (sp.status) where.status = sp.status as BidStatus;
  if (sp.country)
    where.country = { contains: sp.country, mode: "insensitive" };
  if (sp.q)
    where.user = {
      fullName: { contains: sp.q, mode: "insensitive" },
    };

  const orderBy: Prisma.BidOrderByWithRelationInput =
    sp.sort === "amount" ? { amount: "desc" } : { createdAt: "desc" };

  const bids = await prisma.bid.findMany({
    where,
    orderBy,
    take: 200,
    include: {
      user: { select: { fullName: true } },
      auction: { select: { title: true, currency: true } },
    },
  });

  const suspicious = bids.filter((b) => b.status === "SUSPICIOUS").length;

  return (
    <div>
      <PageHeader
        title="Bid Management"
        subtitle={`${bids.length} bids · ${suspicious} suspicious`}
      />

      <BidFilters />

      {bids.length === 0 ? (
        <EmptyState text="No bids found." />
      ) : (
        <Table
          head={[
            "User",
            "Auction",
            "Amount",
            "Time",
            "IP",
            "Country",
            "Status",
            "",
          ]}
        >
          {bids.map((b) => {
            const st = BID_STATUS[b.status];
            return (
              <tr
                key={b.id}
                className={`hover:bg-space/50 ${
                  b.status === "SUSPICIOUS" ? "bg-red-500/5" : ""
                }`}
              >
                <td className="px-4 py-3 text-silk">{b.user.fullName}</td>
                <td className="px-4 py-3 text-cream/70">{b.auction.title}</td>
                <td className="px-4 py-3 text-gold">
                  {formatCurrency(Number(b.amount), b.auction.currency)}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {formatDate(b.createdAt)}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {b.ipAddress ?? "—"}
                </td>
                <td className="px-4 py-3 text-cream/70">{b.country ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <BidRowActions id={b.id} status={b.status} />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
