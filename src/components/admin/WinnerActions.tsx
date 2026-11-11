"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare, Gavel } from "lucide-react";
import {
  finalizeAuction,
  notifyWinner,
  confirmWinnerPayment,
} from "@/app/admin/(panel)/winners/actions";

export function FinalizeButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await finalizeAuction(auctionId);
          router.refresh();
        })
      }
      className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-void hover:bg-gold-light disabled:opacity-60"
    >
      <Gavel className="h-4 w-4" />
      {pending ? "Finalizing…" : "Finalize winner & create order"}
    </button>
  );
}

export function NotifyButtons({
  winnerId,
  emailSent,
  smsSent,
}: {
  winnerId: string;
  emailSent: boolean;
  smsSent: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (ch: "email" | "sms") =>
    start(async () => {
      await notifyWinner(winnerId, ch);
      router.refresh();
    });

  return (
    <div className="flex gap-2">
      <button
        disabled={pending || emailSent}
        onClick={() => run("email")}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${
          emailSent
            ? "border-emerald-500/40 text-emerald-300"
            : "border-border text-cream/70 hover:border-gold hover:text-gold"
        }`}
      >
        <Mail className="h-3.5 w-3.5" />
        {emailSent ? "Email sent" : "Send email"}
      </button>
      <button
        disabled={pending || smsSent}
        onClick={() => run("sms")}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${
          smsSent
            ? "border-emerald-500/40 text-emerald-300"
            : "border-border text-cream/70 hover:border-gold hover:text-gold"
        }`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {smsSent ? "SMS sent" : "Send SMS"}
      </button>
    </div>
  );
}

/** the winner's balance arrived by bank transfer / cheque */
export function ConfirmPaymentButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Confirm the balance was received? The lot is marked sold and the deposit applied.")) return;
        start(async () => {
          await confirmWinnerPayment(auctionId);
          router.refresh();
        });
      }}
      className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
    >
      {pending ? "Confirming…" : "Payment received"}
    </button>
  );
}
