import { getBusinessMetrics } from "@/lib/reports";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard, Card, Badge } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils";
import { ORDER_STATUS } from "@/lib/labels";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const m = await getBusinessMetrics();
  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { artwork: { select: { title: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Business overview — ALBESAT collection"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total works" value={m.totalArtworks} />
        <StatCard label="Available" value={m.availableArtworks} tone="green" />
        <StatCard label="Sold" value={m.soldArtworks} tone="amber" />
        <StatCard label="Users" value={m.totalUsers} tone="blue" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          label="Total revenue"
          value={formatCurrency(m.totalRevenue)}
          hint="Paid sales"
        />
        <StatCard
          label="Direct sales revenue"
          value={formatCurrency(m.directRevenue)}
          tone="green"
        />
        <StatCard
          label="Auction revenue"
          value={formatCurrency(m.auctionRevenue)}
          tone="purple"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl text-silk">Recent orders</h3>
            <Link href="/admin/orders" className="text-xs text-gold">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 && (
              <p className="text-sm text-muted">No orders yet.</p>
            )}
            {recentOrders.map((o) => {
              const st = ORDER_STATUS[o.status];
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between border-b border-gold/5 pb-3 last:border-0"
                >
                  <div>
                    <p className="text-sm text-silk">{o.artwork.title}</p>
                    <p className="text-xs text-muted">{o.customerName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gold">
                      {formatCurrency(Number(o.amount), o.currency)}
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top cities */}
        <Card>
          <h3 className="mb-4 font-display text-xl text-silk">
            Top selling cities
          </h3>
          <div className="space-y-3">
            {m.topCities.length === 0 && (
              <p className="text-sm text-muted">No data available.</p>
            )}
            {m.topCities.map((c) => {
              const max = m.topCities[0]?.count || 1;
              return (
                <div key={c.city}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-cream/80">{c.city}</span>
                    <span className="text-gold">{c.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-space">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dim"
                      style={{ width: `${(c.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Highest auction price"
          value={formatCurrency(m.highestBid)}
        />
        <StatCard
          label="Average order value"
          value={formatCurrency(Math.round(m.averageOrderValue))}
        />
        <StatCard
          label="View → purchase rate"
          value={`${m.conversionRate.toFixed(2)}%`}
        />
        <StatCard
          label="Avg bids per auction"
          value={m.avgBidsPerAuction.toFixed(1)}
        />
      </div>
    </div>
  );
}
