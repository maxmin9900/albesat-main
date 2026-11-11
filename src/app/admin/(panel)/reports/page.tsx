import { getBusinessMetrics } from "@/lib/reports";
import { PageHeader, Card, StatCard } from "@/components/admin/ui";
import {
  RevenueDonut,
  CityBar,
  EngagementBar,
} from "@/components/admin/ReportsCharts";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const m = await getBusinessMetrics();

  return (
    <div>
      <PageHeader
        title="Reports & Business Analytics"
        subtitle="Sales, auctions and customer behaviour"
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total works" value={m.totalArtworks} />
        <StatCard label="Sold" value={m.soldArtworks} tone="amber" />
        <StatCard label="Available" value={m.availableArtworks} tone="green" />
        <StatCard label="Users" value={m.totalUsers} tone="blue" />
        <StatCard
          label="Auction participants"
          value={m.auctionParticipants}
          tone="purple"
        />
        <StatCard
          label="Conversion rate"
          value={`${m.conversionRate.toFixed(2)}%`}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total revenue" value={formatCurrency(m.totalRevenue)} />
        <StatCard
          label="Average order value"
          value={formatCurrency(Math.round(m.averageOrderValue))}
        />
        <StatCard
          label="Highest auction price"
          value={formatCurrency(m.highestBid)}
        />
        <StatCard
          label="Avg bids per auction"
          value={m.avgBidsPerAuction.toFixed(1)}
        />
      </div>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-xl text-silk">
            Revenue: direct sales vs auction
          </h3>
          <RevenueDonut direct={m.directRevenue} auction={m.auctionRevenue} />
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-xl text-silk">
            Top selling cities
          </h3>
          <CityBar data={m.topCities} />
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-xl text-silk">
            Most viewed works
          </h3>
          <EngagementBar
            data={m.mostViewed.map((a) => ({
              title: a.title,
              value: a.viewsCount,
            }))}
            color="views"
          />
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-xl text-silk">
            Most favourited works
          </h3>
          <EngagementBar
            data={m.mostFavorited.map((a) => ({
              title: a.title,
              value: a.favoritesCount,
            }))}
            color="favorites"
          />
        </Card>
      </div>
    </div>
  );
}
