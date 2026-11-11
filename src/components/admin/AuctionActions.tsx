"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  publishAuction,
  openRegistration,
  startAuctionNow,
  endAuctionNow,
  cancelAuction,
  confirmPayment,
  failSettlement,
} from "@/app/admin/(panel)/auctions/actions";

type Result = { ok: true } | { ok: false; error: string };

/**
 * The buttons an admin gets depend on the auction's state; each one is a
 * state-machine transition and the service refuses anything illegal, so a
 * stale page cannot cause harm — it just shows an error.
 */
export default function AuctionActions({
  id,
  status,
  roomsEnabled = false,
}: {
  id: string;
  status: string;
  /** with the live rooms off (the server) only the classic Publish/Cancel exist */
  roomsEnabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<Result>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  };

  const btn = (label: string, cls: string, onClick: () => void) => (
    <button
      key={label}
      disabled={pending}
      onClick={onClick}
      className={`rounded-md border px-3 py-1 text-xs disabled:opacity-50 ${cls}`}
    >
      {label}
    </button>
  );

  const green = "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10";
  const gold = "border-gold/40 text-gold hover:bg-gold/10";
  const amber = "border-amber-400/40 text-amber-300 hover:bg-amber-400/10";
  const red = "border-crimson/40 text-crimson-light hover:bg-crimson/10";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {status === "DRAFT" && btn("Publish", green, () => run(() => publishAuction(id)))}
        {roomsEnabled && (status === "DRAFT" || status === "SCHEDULED") &&
          btn("Open registration", gold, () => run(() => openRegistration(id)))}
        {roomsEnabled && (status === "SCHEDULED" || status === "REGISTRATION_OPEN") &&
          btn("Start now", green, () => run(() => startAuctionNow(id), "Open bidding now?"))}
        {roomsEnabled && status === "LIVE" &&
          btn("End now", amber, () => run(() => endAuctionNow(id), "Bring the hammer down now? The leading bid wins."))}
        {roomsEnabled && status === "PAYMENT_PENDING" && (
          <>
            {btn("Payment received", green, () =>
              run(() => confirmPayment(id), "Confirm the balance was received off-line? The lot is marked sold.")
            )}
            {btn("Payment failed", red, () =>
              run(() => failSettlement(id), "Declare the settlement failed?")
            )}
          </>
        )}
        {!["COMPLETED", "CANCELLED", "SETTLEMENT_FAILED"].includes(status) &&
          btn("Cancel", red, () =>
            run(() => cancelAuction(id), "Cancel this auction? Every held deposit is released.")
          )}
      </div>
      {error && <p className="max-w-xs text-right text-[11px] text-crimson-light">{error}</p>}
    </div>
  );
}
