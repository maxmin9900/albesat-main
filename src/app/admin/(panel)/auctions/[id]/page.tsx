import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, Table, StatCard, EmptyState } from "@/components/admin/ui";
import AuctionActions from "@/components/admin/AuctionActions";
import LotEditor from "@/components/admin/LotEditor";
import SessionEditor from "@/components/admin/SessionEditor";
import RichText from "@/components/ui/RichText";
import { LIVE_AUCTION_ROOMS } from "@/lib/auction/flags";
import { AUCTION_STATUS, BID_STATUS, DEPOSIT_STATUS } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import { D, depositFor, minNextBid } from "@/lib/auction/money";

export const dynamic = "force-dynamic";

/** One auction, everything about it: terms, participants, bids, audit log. */
export default async function AdminAuctionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await prisma.auction.findUnique({
    where: { id },
    include: {
      artwork: { select: { id: true, title: true, city: true, code: true, intrinsicValue: true } },
      lots: {
        orderBy: { sortOrder: "asc" },
        include: { artwork: { select: { id: true, title: true, code: true, city: true } } },
      },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: { user: { select: { id: true, fullName: true, email: true, kycStatus: true } } },
      },
      bids: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, fullName: true } } },
      },
      winner: {
        include: {
          user: { select: { fullName: true } },
          order: { select: { id: true, orderNumber: true, paymentStatus: true } },
        },
      },
      registrations: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { id: "desc" }, take: 200 },
    },
  });
  if (!a) notFound();

  const st = AUCTION_STATUS[a.status] ?? { label: a.status, tone: "gray" as const };
  const cur = a.currency;
  const aliasOf = new Map(a.participants.map((p) => [p.userId, p.alias]));
  const deposit = depositFor(D(a.startingPrice), D(a.depositPercent));
  const minNext = minNextBid(D(a.currentPrice), D(a.bidIncrementPercent), a.bidSequence > 0);
  const lockedTotal = a.participants
    .filter((p) => p.depositStatus === "LOCKED")
    .reduce((s, p) => s.add(D(p.depositAmount)), D(0));
  const failPolicy = a.failedPaymentDepositPolicy.toLowerCase();

  /** "YYYY-MM-DDTHH:mm" in Muscat, which is what the editor's boxes mean */
  const muscatBox = (d: Date | null) => {
    if (!d) return "";
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Muscat",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(d);
    const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
    return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
  };

  return (
    <div>
      <PageHeader
        title={a.title}
        subtitle={
          a.lots.length
            ? `${a.lots.length} carpet${a.lots.length === 1 ? "" : "s"} · ${a.registrations.length} registered`
            : "No carpets in this session yet"
        }
      />

      <SessionEditor
        session={{
          id: a.id,
          title: a.title,
          currency: a.currency,
          startAt: muscatBox(a.startAt),
          endAt: muscatBox(a.endAt),
          registrationOpensAt: muscatBox(a.registrationOpensAt),
          venueName: a.venueName ?? "",
          venueAddress: a.venueAddress ?? "",
          venueHall: a.venueHall ?? "",
          intro: a.intro ?? "",
          viewingFrom: a.viewingFrom ?? "",
          viewingTo: a.viewingTo ?? "",
        }}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge tone={st.tone}>{st.label}</Badge>
          <Link href={`/auctions/${a.id}`} target="_blank" className="text-xs text-gold hover:underline">
            Open the public room
          </Link>
        </div>
        <AuctionActions id={a.id} status={a.status} roomsEnabled={LIVE_AUCTION_ROOMS} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Starting price" value={formatCurrency(Number(a.startingPrice), cur)} />
        <StatCard label="Current price" value={formatCurrency(Number(a.currentPrice), cur)} />
        <StatCard label="Next minimum" value={formatCurrency(Number(minNext), cur)} />
        <StatCard label="Deposits held" value={formatCurrency(Number(lockedTotal), cur)} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-display text-lg text-gold-light">Terms</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row k="Deposit" v={`${Number(a.depositPercent)}% = ${formatCurrency(Number(deposit), cur)}`} />
            <Row k="Bid increment" v={`+${Number(a.bidIncrementPercent)}% of current`} />
            <Row k="Bid coverage" v={`${Number(a.bidCoveragePercent)}%`} />
            <Row k="Maximum bid" v="Unlimited" />
            <Row k="Anti-sniping" v={`+${a.extensionSec}s if bid in last ${a.antiSnipingWindowSec}s`} />
            <Row k="Extensions so far" v={String(a.extensionCount)} />
            <Row k="Payment deadline" v={`${a.paymentDeadlineMin} min`} />
            <Row
              k="On failed payment"
              v={`deposit ${failPolicy}${a.offerToNextBidder ? ", offer to runner-up" : ""}`}
            />
          </dl>
        </Card>
        <Card>
          <h3 className="mb-3 font-display text-lg text-gold-light">Timeline</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row k="Registration opens" v={a.registrationOpensAt ? formatDate(a.registrationOpensAt) : "—"} />
            <Row k="Bidding starts" v={formatDate(a.startAt)} />
            <Row k="Bidding ends" v={formatDate(a.endAt)} />
            <Row k="Original end" v={a.originalEndAt ? formatDate(a.originalEndAt) : "—"} />
            <Row k="Hammer" v={a.endedAt ? formatDate(a.endedAt) : "—"} />
            <Row k="Payment due" v={a.paymentDueAt ? formatDate(a.paymentDueAt) : "—"} />
            <Row k="Completed" v={a.completedAt ? formatDate(a.completedAt) : "—"} />
            <Row k="Version" v={String(a.version)} />
          </dl>
          {a.winner && (
            <p className="mt-4 rounded border border-gold/20 bg-gold/5 px-3 py-2 text-sm text-cream/90">
              Winner: <span className="text-gold-light">{a.winner.user.fullName}</span>{" "}
              ({aliasOf.get(a.winner.userId)}) · {formatCurrency(Number(a.winner.finalAmount), cur)}
              {a.winner.order && (
                <>
                  {" "}· order{" "}
                  <Link className="text-gold hover:underline" href={`/admin/orders/${a.winner.order.id}`}>
                    {a.winner.order.orderNumber}
                  </Link>{" "}
                  ({a.winner.order.paymentStatus})
                </>
              )}
            </p>
          )}
        </Card>
      </div>

      {/* Every carpet in this session, with the catalogue entry the public
          listing prints for it. */}
      <h3 className="mb-3 font-display text-lg text-gold-light">
        Carpets in this session ({a.lots.length})
      </h3>
      {a.lots.length === 0 ? (
        <Card className="mb-8">
          <p className="text-sm text-muted">
            No lots recorded on this session.
          </p>
        </Card>
      ) : (
        <div className="mb-8 space-y-4">
          {a.lots.map((lot) => (
            <Card key={lot.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-[10px] tracking-[0.3em] text-gold/70">
                    {lot.lotNumber ? `LOT ${lot.lotNumber}` : lot.artwork.code}
                  </p>
                  <p className="mt-1 font-display text-2xl text-silk">
                    {lot.lotName ?? lot.artwork.title}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/collection/${lot.artworkId}`}
                    className="text-xs text-gold hover:underline"
                  >
                    Open the work
                  </Link>
                  <LotEditor
                    canRemove={a.lots.length > 1 && lot.artworkId !== a.artworkId}
                    lot={{
                      id: lot.id,
                      lotNumber: lot.lotNumber?.toString() ?? "",
                      lotName: lot.lotName ?? "",
                      origin: lot.origin ?? "",
                      era: lot.era ?? "",
                      lotDimensions: lot.lotDimensions ?? "",
                      materials: lot.materials ?? "",
                      weave: lot.weave ?? "",
                      condition: lot.condition ?? "",
                      estimateLow: lot.estimateLow?.toString() ?? "",
                      estimateHigh: lot.estimateHigh?.toString() ?? "",
                      publishedReserve: lot.publishedReserve?.toString() ?? "",
                      lotNote: lot.lotNote ?? "",
                      startingPrice: lot.startingPrice?.toString() ?? "",
                      artworkTitle: lot.artwork.title,
                      artworkCode: lot.artwork.code,
                    }}
                  />
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                <Row k="Origin" v={lot.origin ?? "—"} />
                <Row k="Era" v={lot.era ?? "—"} />
                <Row k="Dimensions" v={lot.lotDimensions ?? "—"} />
                <Row k="Weave" v={lot.weave ?? "—"} />
                <Row k="Materials" v={lot.materials ?? "—"} />
                <Row k="Condition" v={lot.condition ?? "—"} />
                <Row
                  k="Starting price"
                  v={lot.startingPrice ? formatCurrency(Number(lot.startingPrice), cur) : "—"}
                />
                <Row
                  k="Estimated value"
                  v={
                    lot.estimateLow
                      ? `${formatCurrency(Number(lot.estimateLow), cur)}${
                          lot.estimateHigh
                            ? `–${Number(lot.estimateHigh).toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                              })}`
                            : ""
                        }`
                      : "—"
                  }
                />
                <Row
                  k="Published reserve"
                  v={
                    lot.publishedReserve
                      ? formatCurrency(Number(lot.publishedReserve), cur)
                      : "—"
                  }
                />
              </dl>

              {lot.lotNote && (
                <div className="mt-4 border-t border-gold/10 pt-4">
                  <p className="text-[10px] tracking-[0.25em] text-muted">LOT NOTE</p>
                  <RichText
                    text={lot.lotNote}
                    className="mt-2 text-sm leading-relaxed text-cream/85"
                    paragraphClassName="mt-3 first:mt-0"
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Who asked to take part, straight off the public auctions page. No
          account and no deposit behind these — they are leads to call. One
          entry covers the whole session, not a single carpet. */}
      <h3 id="registrations" className="mb-3 scroll-mt-24 font-display text-lg text-gold-light">
        Registered for this session ({a.registrations.length})
      </h3>
      <div className="mb-8">
        {a.registrations.length === 0 ? (
          <EmptyState text="Nobody has registered for this session yet." />
        ) : (
          <Table head={["Name", "Phone", "Email", "Note", "Registered"]}>
            {a.registrations.map((r) => (
              <tr key={r.id} className="hover:bg-space/50">
                <td className="px-4 py-3 text-silk">{r.name}</td>
                <td className="px-4 py-3 text-cream/80" dir="ltr">
                  <a href={`tel:${r.phone}`} className="hover:text-gold-light">
                    {r.phone}
                  </a>
                </td>
                <td className="px-4 py-3 text-cream/80" dir="ltr">
                  <a href={`mailto:${r.email}`} className="hover:text-gold-light">
                    {r.email}
                  </a>
                </td>
                <td className="max-w-xs px-4 py-3 text-xs text-muted">
                  {r.note ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {formatDate(r.createdAt)}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      <h3 className="mb-3 font-display text-lg text-gold-light">
        Bidding participants ({a.participants.length})
      </h3>
      <div className="mb-8">
        <Table head={["Alias", "Member", "KYC", "Deposit", "Status", "Joined"]}>
          {a.participants.map((p) => {
            const ds = DEPOSIT_STATUS[p.depositStatus];
            return (
              <tr key={p.id} className="hover:bg-space/50">
                <td className="px-4 py-3 text-gold-light">{p.alias}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${p.user.id}`} className="text-silk hover:text-gold-light">
                    {p.user.fullName}
                  </Link>
                  <p className="text-xs text-muted">{p.user.email}</p>
                </td>
                <td className="px-4 py-3 text-xs text-cream/70">{p.user.kycStatus}</td>
                <td className="px-4 py-3 text-cream/80">{formatCurrency(Number(p.depositAmount), cur)}</td>
                <td className="px-4 py-3">
                  <Badge tone={ds.tone}>{ds.label}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{formatDate(p.joinedAt)}</td>
              </tr>
            );
          })}
        </Table>
      </div>

      <h3 className="mb-3 font-display text-lg text-gold-light">Bids ({a.bids.length}, incl. rejected)</h3>
      <div className="mb-8">
        <Table head={["#", "Alias / Member", "Amount", "Status", "Reason", "When"]}>
          {a.bids.map((b) => {
            const bs = BID_STATUS[b.status];
            return (
              <tr key={b.id} className={`hover:bg-space/50 ${b.status === "REJECTED" ? "opacity-70" : ""}`}>
                <td className="px-4 py-3 text-xs text-muted">{b.sequence ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="text-gold-light">{aliasOf.get(b.userId) ?? "—"}</span>
                  <span className="ml-2 text-xs text-muted">{b.user.fullName}</span>
                </td>
                <td className="px-4 py-3 text-cream/90">{formatCurrency(Number(b.amount), cur)}</td>
                <td className="px-4 py-3">
                  <Badge tone={bs.tone}>{bs.label}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{b.rejectionReason ?? ""}</td>
                <td className="px-4 py-3 text-xs text-muted">{formatDate(b.createdAt)}</td>
              </tr>
            );
          })}
        </Table>
      </div>

      <h3 className="mb-3 font-display text-lg text-gold-light">Audit log ({a.events.length})</h3>
      <Table head={["#", "Event", "Member", "Details", "When"]}>
        {a.events.map((e) => (
          <tr key={e.id} className="hover:bg-space/50">
            <td className="px-4 py-2 text-xs text-muted">{e.id}</td>
            <td className="px-4 py-2 text-xs text-silk">{e.type}</td>
            <td className="px-4 py-2 text-xs text-gold-light">
              {e.userId ? aliasOf.get(e.userId) ?? e.userId.slice(0, 8) : ""}
            </td>
            <td className="px-4 py-2 font-mono text-[11px] text-cream/70">
              {e.payload ? JSON.stringify(e.payload) : ""}
            </td>
            <td className="px-4 py-2 text-xs text-muted">{formatDate(e.createdAt)}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted">{k}</dt>
      <dd className="text-cream/90">{v}</dd>
    </>
  );
}
