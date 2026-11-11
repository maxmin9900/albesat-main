import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/admin/ui";
import { FinalizeButton, NotifyButtons, ConfirmPaymentButton } from "@/components/admin/WinnerActions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WinnersPage() {
  const now = new Date();

  // auctions past end time, still live/scheduled, with no winner yet
  const toFinalize = await prisma.auction.findMany({
    where: {
      status: { in: ["LIVE", "SCHEDULED", "REGISTRATION_OPEN"] },
      endAt: { lte: now },
      winner: { is: null },
    },
    include: {
      artwork: { select: { title: true, city: true } },
      _count: { select: { bids: true } },
    },
  });

  const winners = await prisma.auctionWinner.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { fullName: true, email: true, country: true } },
      auction: {
        include: { artwork: { select: { title: true, city: true } } },
      },
      order: { select: { orderNumber: true, status: true, paymentStatus: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Auction Winners"
        subtitle="Finalize ended auctions and manage winners"
      />

      {/* Ready to finalize */}
      {toFinalize.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm text-amber-300">
            Auctions ready to finalize ({toFinalize.length})
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {toFinalize.map((a) => (
              <Card key={a.id} className="flex items-center justify-between">
                <div>
                  <p className="text-silk">{a.artwork.title}</p>
                  <p className="text-xs text-muted">
                    {a._count.bids} bids · ended {formatDate(a.endAt)}
                  </p>
                </div>
                <FinalizeButton auctionId={a.id} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Winners list */}
      {winners.length === 0 ? (
        <EmptyState text="No winners recorded yet." />
      ) : (
        <div className="space-y-4">
          {winners.map((w) => (
            <Card key={w.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 text-gold">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-display text-xl text-silk">
                      {w.user.fullName}
                    </p>
                    <p className="text-sm text-muted">
                      {w.auction.artwork.title} · {w.auction.artwork.city}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      <span className="text-gold">
                        Final price:{" "}
                        {formatCurrency(
                          Number(w.finalAmount),
                          w.auction.currency
                        )}
                      </span>
                      <span className="text-cream/70">
                        {w.bidCount} bids
                      </span>
                      <span className="text-muted">
                        Ended: {formatDate(w.endedAt)}
                      </span>
                    </div>
                    {w.order && (
                      <p className="mt-1 text-xs text-muted">
                        Order:{" "}
                        <span className="text-gold">{w.order.orderNumber}</span>{" "}
                        ({w.order.status})
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex gap-2">
                    {w.auction.status === "COMPLETED" ? (
                      <Badge tone="green">Work sold · paid</Badge>
                    ) : w.auction.status === "PAYMENT_PENDING" ? (
                      <Badge tone="amber">
                        Awaiting payment
                        {w.auction.paymentDueAt ? ` · by ${formatDate(w.auction.paymentDueAt)}` : ""}
                      </Badge>
                    ) : w.auction.status === "SETTLEMENT_FAILED" ? (
                      <Badge tone="red">Payment failed</Badge>
                    ) : (
                      <Badge tone="gray">{w.auction.status}</Badge>
                    )}
                    {w.order && <Badge tone="gold">Order {w.order.paymentStatus}</Badge>}
                  </div>
                  {w.auction.status === "PAYMENT_PENDING" && (
                    <ConfirmPaymentButton auctionId={w.auctionId} />
                  )}
                  <NotifyButtons
                    winnerId={w.id}
                    emailSent={w.emailSent}
                    smsSent={w.smsSent}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
