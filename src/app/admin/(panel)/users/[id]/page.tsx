import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, Table, EmptyState } from "@/components/admin/ui";
import { ORDER_STATUS, BID_STATUS, KYC_STATUS, DEPOSIT_STATUS, AUCTION_STATUS } from "@/lib/labels";
import WalletPanel from "@/components/admin/WalletPanel";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { artwork: { select: { title: true } } },
      },
      bids: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { auction: { select: { title: true, currency: true } } },
      },
      wallet: {
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 30,
            include: { auction: { select: { title: true } } },
          },
        },
      },
      auctionParticipations: {
        orderBy: { joinedAt: "desc" },
        include: { auction: { select: { id: true, title: true, status: true, currency: true } } },
      },
    },
  });
  if (!user) notFound();
  const walletCurrency = user.wallet?.currency ?? "OMR";

  const k = KYC_STATUS[user.kycStatus];
  const totalSpent = user.orders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((s, o) => s + Number(o.amount), 0);

  return (
    <div>
      <PageHeader title={user.fullName} subtitle="User profile & history" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="mb-4 font-display text-xl text-silk">Information</h3>
          <dl className="space-y-3 text-sm">
            <Field label="Mobile" value={user.mobile ?? "—"} ltr />
            <Field label="Email" value={user.email ?? "—"} ltr />
            <Field label="Country" value={user.country ?? "—"} />
            <div>
              <dt className="text-muted">KYC status</dt>
              <dd className="mt-1">
                <Badge tone={k.tone}>{k.label}</Badge>
              </dd>
            </div>
            <Field
              label="Last login"
              value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "—"}
            />
          </dl>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:col-span-2 lg:grid-cols-3">
          <Card>
            <p className="text-sm text-muted">Purchases</p>
            <p className="mt-2 font-display text-3xl text-gold-light">
              {user.orders.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted">Bids</p>
            <p className="mt-2 font-display text-3xl text-sky-300">
              {user.bids.length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted">Total spent</p>
            <p className="mt-2 font-display text-2xl text-emerald-300">
              {formatCurrency(totalSpent)}
            </p>
          </Card>
        </div>
      </div>

      {/* ---- member funds (auction deposits are locked from here) ---- */}
      <div className="mt-8">
        <h3 className="mb-3 font-display text-xl text-silk">Account funds</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <p className="text-sm text-muted">Available</p>
            <p className="mt-2 font-display text-3xl text-emerald-300">
              {formatCurrency(Number(user.wallet?.available ?? 0), walletCurrency)}
            </p>
            <p className="mt-2 text-sm text-muted">Locked in auctions</p>
            <p className="mt-1 font-display text-2xl text-sky-300">
              {formatCurrency(Number(user.wallet?.locked ?? 0), walletCurrency)}
            </p>
          </Card>
          <div className="lg:col-span-2">
            <WalletPanel userId={user.id} currency={walletCurrency} />
          </div>
        </div>

        {(user.wallet?.transactions.length ?? 0) > 0 && (
          <div className="mt-4">
            <Table head={["Type", "Amount", "Available after", "Locked after", "Auction / note", "When"]}>
              {user.wallet!.transactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 text-xs text-silk">{t.type}</td>
                  <td className="px-4 py-2 text-cream/90">{formatCurrency(Number(t.amount), walletCurrency)}</td>
                  <td className="px-4 py-2 text-xs text-cream/70">{formatCurrency(Number(t.availableAfter), walletCurrency)}</td>
                  <td className="px-4 py-2 text-xs text-cream/70">{formatCurrency(Number(t.lockedAfter), walletCurrency)}</td>
                  <td className="px-4 py-2 text-xs text-muted">
                    {t.auction?.title ? <span className="text-gold-light">{t.auction.title}</span> : null}
                    {t.auction?.title && t.note ? " · " : ""}
                    {t.note ?? ""}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </div>

      {user.auctionParticipations.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 font-display text-xl text-silk">Auction rooms</h3>
          <Table head={["Auction", "Alias", "Deposit", "Deposit status", "Auction status", "Joined"]}>
            {user.auctionParticipations.map((p) => {
              const ds = DEPOSIT_STATUS[p.depositStatus];
              const as = AUCTION_STATUS[p.auction.status] ?? { label: p.auction.status, tone: "gray" as const };
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-silk">{p.auction.title}</td>
                  <td className="px-4 py-2 text-gold-light">{p.alias}</td>
                  <td className="px-4 py-2 text-cream/80">{formatCurrency(Number(p.depositAmount), p.auction.currency)}</td>
                  <td className="px-4 py-2"><Badge tone={ds.tone}>{ds.label}</Badge></td>
                  <td className="px-4 py-2"><Badge tone={as.tone}>{as.label}</Badge></td>
                  <td className="px-4 py-2 text-xs text-muted">{formatDate(p.joinedAt)}</td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8">
        <div>
          <h3 className="mb-3 font-display text-xl text-silk">Purchase history</h3>
          {user.orders.length === 0 ? (
            <EmptyState text="No purchases yet." />
          ) : (
            <Table head={["Work", "Amount", "Status", "Date"]}>
              {user.orders.map((o) => {
                const st = ORDER_STATUS[o.status];
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3 text-silk">{o.artwork.title}</td>
                    <td className="px-4 py-3 text-gold">
                      {formatCurrency(Number(o.amount), o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDate(o.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </div>

        <div>
          <h3 className="mb-3 font-display text-xl text-silk">Bid history</h3>
          {user.bids.length === 0 ? (
            <EmptyState text="No bids yet." />
          ) : (
            <Table head={["Auction", "Amount", "Status", "Time"]}>
              {user.bids.map((b) => {
                const st = BID_STATUS[b.status];
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-cream/80">
                      {b.auction.title}
                    </td>
                    <td className="px-4 py-3 text-gold">
                      {formatCurrency(Number(b.amount), b.auction.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDate(b.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd dir={ltr ? "ltr" : undefined} className="mt-0.5 text-cream/90">
        {value}
      </dd>
    </div>
  );
}
