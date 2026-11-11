import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Table, Badge, EmptyState } from "@/components/admin/ui";
import AuctionActions from "@/components/admin/AuctionActions";
import { LIVE_AUCTION_ROOMS } from "@/lib/auction/flags";
import { AUCTION_STATUS } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const auctions = await prisma.auction.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lots: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          lotNumber: true,
          lotName: true,
          artwork: { select: { title: true, city: true } },
        },
      },
      _count: {
        select: {
          lots: true,
          participants: true,
          registrations: true,
          bids: { where: { sequence: { not: null } } },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Auction sessions"
        subtitle={`${auctions.length} session${auctions.length === 1 ? "" : "s"}`}
        action={{ href: "/admin/auctions/new", label: "+ Create session" }}
      />

      {auctions.length === 0 ? (
        <EmptyState text="No auction sessions yet." />
      ) : (
        <Table
          head={[
            "Session",
            "Lots",
            "Registered",
            ...(LIVE_AUCTION_ROOMS ? ["Current", "Bidders / Bids"] : []),
            "Ends",
            "Status",
            "Actions",
          ]}
        >
          {auctions.map((a) => {
            const st = AUCTION_STATUS[a.status] ?? { label: a.status, tone: "gray" as const };
            const current = Number(a.currentPrice) > 0 ? Number(a.currentPrice) : Number(a.basePrice);
            return (
              <tr key={a.id} className="hover:bg-space/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/auctions/${a.id}`} className="text-silk hover:text-gold-light">
                    {a.title}
                  </Link>
                  <p className="text-xs text-muted">{formatDate(a.startAt)}</p>
                </td>
                <td className="px-4 py-3">
                  {a._count.lots === 0 ? (
                    <span className="text-xs text-amber-300">no carpets</span>
                  ) : (
                    <>
                      <p className="text-cream/80">
                        {a._count.lots} carpet{a._count.lots === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-muted">
                        {a.lots
                          .slice(0, 2)
                          .map(
                            (l) =>
                              `${l.lotNumber ? `#${l.lotNumber} ` : ""}${
                                l.lotName ?? l.artwork.title
                              }`
                          )
                          .join(", ")}
                        {a._count.lots > 2 ? ` +${a._count.lots - 2} more` : ""}
                      </p>
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {a._count.registrations > 0 ? (
                    <Link
                      href={`/admin/auctions/${a.id}#registrations`}
                      className="text-gold hover:underline"
                    >
                      {a._count.registrations}
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                {LIVE_AUCTION_ROOMS && (
                  <>
                    <td className="px-4 py-3 text-gold">
                      {formatCurrency(current, a.currency)}
                      {a.extensionCount > 0 && (
                        <span className="ml-2 text-[10px] text-muted">+{a.extensionCount} ext</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-cream/80">
                      {a._count.participants} / {a._count.bids}
                    </td>
                  </>
                )}
                <td className="px-4 py-3 text-xs text-muted">
                  {formatDate(a.endAt)}
                  {a.status === "PAYMENT_PENDING" && a.paymentDueAt && (
                    <p className="text-amber-300">pay by {formatDate(a.paymentDueAt)}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={st.tone}>{st.label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <AuctionActions id={a.id} status={a.status} roomsEnabled={LIVE_AUCTION_ROOMS} />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
