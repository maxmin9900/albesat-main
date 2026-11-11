"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { Pencil, Archive, Trash2, Gavel, Loader2 } from "lucide-react";
import {
  updateArtworkStatus,
  archiveArtwork,
  deleteArtwork,
} from "@/app/admin/(panel)/collection/actions";
import {
  putArtworkOnAuction,
  removeArtworkFromAuction,
} from "@/app/admin/(panel)/auctions/actions";
import type { ArtworkStatus } from "@prisma/client";

const STATUSES: ArtworkStatus[] = [
  "DRAFT",
  "PRIVATE",
  "PUBLISHED",
  "SOLD",
  "ARCHIVED",
];

export default function ArtworkActions({
  id,
  status,
  onAuction = false,
}: {
  id: string;
  status: string;
  /** the work currently has a lot open on the public auctions page */
  onAuction?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggleAuction = () =>
    start(async () => {
      const res = onAuction
        ? await removeArtworkFromAuction(id)
        : await putArtworkOnAuction(id);
      if (!res.ok) {
        alert(res.error ?? "That did not work.");
        return;
      }
      router.refresh();
    });

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        defaultValue={status}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await updateArtworkStatus(id, e.target.value as ArtworkStatus);
            router.refresh();
          })
        }
        className="rounded-md border border-border bg-void px-2 py-1 text-xs text-silk outline-none focus:border-gold"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          if (
            onAuction &&
            !confirm("Take this work off the auction page?")
          )
            return;
          toggleAuction();
        }}
        disabled={pending}
        title={onAuction ? "Remove from auction" : "Put on auction"}
        className={`rounded-md border p-1.5 transition-colors disabled:opacity-40 ${
          onAuction
            ? "border-gold bg-gold/15 text-gold-light hover:bg-gold/25"
            : "border-border text-cream/70 hover:border-gold hover:text-gold"
        }`}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Gavel className="h-4 w-4" />
        )}
      </button>

      <Link
        href={`/admin/collection/${id}`}
        className="rounded-md border border-border p-1.5 text-cream/70 hover:border-gold hover:text-gold"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Link>

      <button
        onClick={() =>
          start(async () => {
            await archiveArtwork(id);
            router.refresh();
          })
        }
        className="rounded-md border border-border p-1.5 text-amber-300/80 hover:border-amber-400 hover:text-amber-300"
        title="Archive"
      >
        <Archive className="h-4 w-4" />
      </button>

      <button
        onClick={() => {
          if (!confirm("Delete this work?")) return;
          start(async () => {
            const res = await deleteArtwork(id);
            if (!res.ok) {
              alert(res.error ?? "This work could not be deleted.");
              return;
            }
            router.refresh();
          });
        }}
        className="rounded-md border border-border p-1.5 text-crimson-light/80 hover:border-crimson hover:text-crimson-light"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
