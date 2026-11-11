"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateOrderStatus,
  updatePaymentStatus,
  setTrackingCode,
  completeOrder,
} from "@/app/admin/(panel)/orders/actions";
import { ORDER_STATUS_FLOW, ORDER_STATUS } from "@/lib/labels";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { Check } from "lucide-react";

export default function OrderManager({
  id,
  status,
  paymentStatus,
  trackingCode,
}: {
  id: string;
  status: string;
  paymentStatus: string;
  trackingCode: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [track, setTrack] = useState(trackingCode ?? "");

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const flow = ORDER_STATUS_FLOW.filter((s) => s !== "CANCELLED");
  const currentIdx = flow.indexOf(status);

  return (
    <div className="space-y-6">
      {/* Status flow stepper */}
      <div>
        <p className="mb-3 text-sm text-cream/80">Order stages</p>
        <div className="flex flex-wrap gap-2">
          {flow.map((s, i) => {
            const done = i <= currentIdx && status !== "CANCELLED";
            const st = ORDER_STATUS[s];
            return (
              <button
                key={s}
                disabled={pending}
                onClick={() =>
                  run(() => updateOrderStatus(id, s as OrderStatus))
                }
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  done
                    ? "border-gold/40 bg-gold/10 text-gold-light"
                    : "border-border text-muted hover:border-gold/40"
                }`}
              >
                {done && <Check className="h-3 w-3" />}
                {st.label}
              </button>
            );
          })}
          <button
            disabled={pending}
            onClick={() => run(() => updateOrderStatus(id, "CANCELLED"))}
            className="rounded-full border border-crimson/40 px-3 py-1.5 text-xs text-crimson-light hover:bg-crimson/10"
          >
            Cancel order
          </button>
        </div>
      </div>

      {/* Payment */}
      <div>
        <p className="mb-2 text-sm text-cream/80">Payment status</p>
        <select
          defaultValue={paymentStatus}
          disabled={pending}
          onChange={(e) =>
            run(() =>
              updatePaymentStatus(id, e.target.value as PaymentStatus)
            )
          }
          className="rounded-lg border border-border bg-void px-3 py-2 text-sm text-silk outline-none focus:border-gold"
        >
          <option value="PENDING">Payment pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {/* Tracking */}
      <div>
        <p className="mb-2 text-sm text-cream/80">Tracking code</p>
        <div className="flex gap-2">
          <input
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            dir="ltr"
            placeholder="TRK-XXXXXX"
            className="flex-1 rounded-lg border border-border bg-void px-3 py-2 text-sm text-silk outline-none focus:border-gold"
          />
          <button
            disabled={pending || !track.trim()}
            onClick={() => run(() => setTrackingCode(id, track.trim()))}
            className="rounded-lg border border-gold px-4 py-2 text-sm text-gold hover:bg-gold hover:text-void disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      <button
        disabled={pending || status === "COMPLETED"}
        onClick={() => run(() => completeOrder(id))}
        className="w-full rounded-lg bg-gold py-2.5 font-medium text-void transition-colors hover:bg-gold-light disabled:opacity-50"
      >
        Complete order (close case)
      </button>
    </div>
  );
}
