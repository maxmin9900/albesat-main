"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BID_STATUS } from "@/lib/labels";

export default function BidFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin/bids?${next.toString()}`);
  };

  const inputCls =
    "rounded-lg border border-border bg-void px-3 py-2 text-sm text-silk outline-none focus:border-gold";

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <input
        placeholder="Search user…"
        defaultValue={params.get("q") ?? ""}
        onChange={(e) => update("q", e.target.value)}
        className={inputCls}
      />
      <select
        defaultValue={params.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className={inputCls}
      >
        <option value="">All statuses</option>
        {Object.entries(BID_STATUS).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </select>
      <input
        placeholder="Country"
        defaultValue={params.get("country") ?? ""}
        onChange={(e) => update("country", e.target.value)}
        className={inputCls}
      />
      <select
        defaultValue={params.get("sort") ?? "createdAt"}
        onChange={(e) => update("sort", e.target.value)}
        className={inputCls}
      >
        <option value="createdAt">Newest</option>
        <option value="amount">Highest amount</option>
      </select>
    </div>
  );
}
