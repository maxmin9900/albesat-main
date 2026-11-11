"use client";

import { useActionState } from "react";
import {
  creditWallet,
  adjustWallet,
  type WalletActionState,
} from "@/app/admin/(panel)/users/actions";

const inputCls =
  "w-full rounded-lg border border-border bg-void px-3 py-2 text-sm text-silk outline-none focus:border-gold";

/**
 * Concierge controls for a member's funds. "Credit" is the normal path — a
 * bank transfer or cheque arrived; "Adjust" is a signed correction and needs
 * a note. Both are recorded with the admin's id.
 */
export default function WalletPanel({
  userId,
  currency,
}: {
  userId: string;
  currency: string;
}) {
  const [credit, creditAction, creditPending] = useActionState<WalletActionState, FormData>(creditWallet, {});
  const [adjust, adjustAction, adjustPending] = useActionState<WalletActionState, FormData>(adjustWallet, {});

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <form action={creditAction} className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-900/10 p-4">
        <input type="hidden" name="userId" value={userId} />
        <p className="text-xs tracking-[0.2em] text-emerald-300">CREDIT FUNDS</p>
        <div className="flex gap-2">
          <span className="self-center text-xs text-muted">{currency}</span>
          <input name="amount" type="number" step="0.01" min="0.01" required placeholder="Amount received" dir="ltr" className={inputCls} />
        </div>
        <input name="note" required placeholder="Bank transfer ref / cheque no." className={inputCls} />
        <button disabled={creditPending} className="rounded-md bg-emerald-600/80 px-4 py-1.5 text-xs text-white hover:bg-emerald-600 disabled:opacity-60">
          {creditPending ? "Recording…" : "Record credit"}
        </button>
        {credit.error && <p className="text-xs text-crimson-light">{credit.error}</p>}
        {credit.ok && <p className="text-xs text-emerald-300">Recorded.</p>}
      </form>

      <form action={adjustAction} className="space-y-2 rounded-lg border border-amber-400/20 bg-amber-900/10 p-4">
        <input type="hidden" name="userId" value={userId} />
        <p className="text-xs tracking-[0.2em] text-amber-300">ADJUSTMENT</p>
        <div className="flex gap-2">
          <span className="self-center text-xs text-muted">{currency}</span>
          <input name="delta" type="number" step="0.01" required placeholder="+ adds · − removes" dir="ltr" className={inputCls} />
        </div>
        <input name="note" required placeholder="Reason (required)" className={inputCls} />
        <button disabled={adjustPending} className="rounded-md bg-amber-600/80 px-4 py-1.5 text-xs text-white hover:bg-amber-600 disabled:opacity-60">
          {adjustPending ? "Applying…" : "Apply adjustment"}
        </button>
        {adjust.error && <p className="text-xs text-crimson-light">{adjust.error}</p>}
        {adjust.ok && <p className="text-xs text-amber-300">Applied.</p>}
      </form>
    </div>
  );
}
