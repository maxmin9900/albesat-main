"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { setBidStatus } from "@/app/admin/(panel)/bids/actions";

export default function BidRowActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (s: "SUSPICIOUS" | "VALID") =>
    start(async () => {
      await setBidStatus(id, s);
      router.refresh();
    });

  return (
    <div className="flex items-center justify-end gap-1.5">
      {status !== "SUSPICIOUS" ? (
        <button
          disabled={pending}
          onClick={() => run("SUSPICIOUS")}
          title="Flag as suspicious"
          className="rounded-md border border-border p-1.5 text-red-300/80 hover:border-red-400 hover:text-red-300"
        >
          <ShieldAlert className="h-4 w-4" />
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => run("VALID")}
          title="Restore to valid"
          className="rounded-md border border-border p-1.5 text-emerald-300/80 hover:border-emerald-400 hover:text-emerald-300"
        >
          <ShieldCheck className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
