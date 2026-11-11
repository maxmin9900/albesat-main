"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Images,
  ShoppingBag,
  Gavel,
  HandCoins,
  Trophy,
  Users,
  BarChart3,
  Tags,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/admin/actions";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/collection", label: "Collection", icon: Images },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/auctions", label: "Auctions", icon: Gavel },
  { href: "/admin/bids", label: "Bids", icon: HandCoins },
  { href: "/admin/winners", label: "Winners", icon: Trophy },
  { href: "/admin/users", label: "Users (CRM)", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/taxonomy", label: "Cities & Categories", icon: Tags },
];

export default function Sidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // navigating closes the mobile drawer
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-gold/10 bg-space px-4 py-3 md:hidden">
        <Link href="/admin" className="font-display text-xl text-gradient-gold">
          ALBESAT
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg border border-gold/30 p-2 text-gold"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* backdrop while the drawer is open (mobile) */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-void/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gold/10 bg-space pt-14 transition-transform duration-300 md:z-30 md:translate-x-0 md:pt-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div className="border-b border-gold/10 px-6 py-5">
        <Link href="/" className="font-display text-2xl text-gradient-gold">
          ALBESAT
        </Link>
        <p className="mt-1 text-xs text-muted">Admin Panel</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-gold/15 text-gold-light"
                  : "text-cream/70 hover:bg-surface hover:text-silk"
              }`}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={1.6} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gold/10 px-3 py-4">
        <div className="mb-3 px-3">
          <p className="text-sm text-silk">{name}</p>
          <p className="text-xs text-muted">Administrator</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-crimson-light transition-colors hover:bg-crimson/10"
          >
            <LogOut className="h-4.5 w-4.5" strokeWidth={1.6} />
            Sign out
          </button>
        </form>
      </div>
      </aside>
    </>
  );
}
