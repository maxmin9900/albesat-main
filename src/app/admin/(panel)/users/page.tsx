import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Table, Badge, EmptyState } from "@/components/admin/ui";
import KycControl from "@/components/admin/KycControl";
import { KYC_STATUS } from "@/lib/labels";
import { formatDate, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, bids: true } },
      wallet: { select: { available: true, locked: true, currency: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Users (CRM)" subtitle={`${users.length} users`} />

      {users.length === 0 ? (
        <EmptyState text="No users yet." />
      ) : (
        <Table
          head={[
            "Name",
            "Mobile",
            "Email",
            "Country",
            "Purchases",
            "Bids",
            "Balance",
            "Last login",
            "KYC",
            "",
          ]}
        >
          {users.map((u) => {
            const k = KYC_STATUS[u.kycStatus];
            return (
              <tr key={u.id} className="hover:bg-space/50">
                <td className="px-4 py-3 text-silk">{u.fullName}</td>
                <td className="px-4 py-3 text-xs text-cream/70">
                  {u.mobile ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-cream/70">
                  {u.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-cream/70">{u.country ?? "—"}</td>
                <td className="px-4 py-3 text-center text-gold">
                  {u._count.orders}
                </td>
                <td className="px-4 py-3 text-center text-cream/80">
                  {u._count.bids}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span className="text-emerald-300">{formatCurrency(Number(u.wallet?.available ?? 0), u.wallet?.currency ?? "OMR")}</span>
                  {Number(u.wallet?.locked ?? 0) > 0 && (
                    <span className="ml-1 text-muted">· {formatCurrency(Number(u.wallet!.locked), u.wallet!.currency)} locked</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5">
                    <Badge tone={k.tone}>{k.label}</Badge>
                    <KycControl id={u.id} status={u.kycStatus} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-xs text-gold hover:text-gold-light"
                  >
                    Profile
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
