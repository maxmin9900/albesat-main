"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setKycStatus } from "@/app/admin/(panel)/users/actions";
import type { KycStatus } from "@prisma/client";

export default function KycControl({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setKycStatus(id, e.target.value as KycStatus);
          router.refresh();
        })
      }
      className="rounded-md border border-border bg-void px-2 py-1 text-xs text-silk outline-none focus:border-gold"
    >
      <option value="PENDING">Pending</option>
      <option value="VERIFIED">Verified</option>
      <option value="REJECTED">Rejected</option>
    </select>
  );
}
