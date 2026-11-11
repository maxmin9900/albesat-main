"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { removeLot, updateLot } from "@/app/admin/(panel)/auctions/actions";
import RichTextArea from "./RichTextArea";

export type EditableLot = {
  id: string;
  lotNumber: string;
  lotName: string;
  origin: string;
  era: string;
  lotDimensions: string;
  materials: string;
  weave: string;
  condition: string;
  estimateLow: string;
  estimateHigh: string;
  publishedReserve: string;
  lotNote: string;
  startingPrice: string;
  /** shown when the lot has no name of its own */
  artworkTitle: string;
  artworkCode: string;
};

const inputCls =
  "w-full rounded-lg border border-border bg-void px-3 py-2 text-sm text-silk outline-none transition-colors focus:border-gold";
const labelCls = "mb-1.5 block text-xs text-cream/70";

/**
 * Edit one lot's catalogue entry in place.
 *
 * The carpet itself is not editable here — people may already have
 * registered for the sale having seen it — only what the listing prints
 * about it.
 */
export default function LotEditor({
  lot,
  canRemove,
}: {
  lot: EditableLot;
  canRemove: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(lot);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const set = (k: keyof EditableLot) => (v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = () =>
    start(async () => {
      const { id, artworkTitle, artworkCode, ...values } = draft;
      void artworkTitle;
      void artworkCode;
      const res = await updateLot(id, values);
      if (res.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      setError(null);
      setFieldErrors({});
      setOpen(false);
      router.refresh();
    });

  const drop = () => {
    if (!confirm(`Remove ${draft.lotName || draft.artworkTitle} from this session?`))
      return;
    start(async () => {
      const res = await removeLot(lot.id);
      if (!res.ok) {
        setError(res.error ?? "That did not work.");
        return;
      }
      router.refresh();
    });
  };

  const Field = ({
    k,
    label,
    placeholder,
    type = "text",
  }: {
    k: keyof EditableLot;
    label: string;
    placeholder?: string;
    type?: string;
  }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        dir={type === "number" ? "ltr" : undefined}
        value={draft[k]}
        onChange={(e) => set(k)(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      {fieldErrors[k] && (
        <p className="mt-1 text-xs text-crimson-light">{fieldErrors[k]}</p>
      )}
    </div>
  );

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-cream/70 transition-colors hover:border-gold/50 hover:text-gold-light"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={drop}
            disabled={pending}
            title="Remove this carpet from the session"
            className="rounded-lg border border-border p-1.5 text-crimson-light/80 transition-colors hover:border-crimson/60 hover:text-crimson-light disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {error && <span className="text-xs text-crimson-light">{error}</span>}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-gold/20 bg-void/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] tracking-[0.3em] text-gold/70">
          EDITING {draft.artworkCode}
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft(lot);
            setError(null);
            setFieldErrors({});
            setOpen(false);
          }}
          className="rounded-lg border border-border p-1.5 text-cream/60 transition-colors hover:border-gold/50 hover:text-gold-light"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm text-crimson-light">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[120px_minmax(0,1fr)_140px]">
        <Field k="lotNumber" label="Lot no." type="number" placeholder="25" />
        <Field k="lotName" label="Name" placeholder="Antique Qashqai Carpet" />
        <Field k="startingPrice" label="Starting price" type="number" placeholder="4500" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field k="origin" label="Origin" placeholder="Fars, Iran" />
        <Field k="era" label="Era" placeholder="1920s" />
        <Field k="lotDimensions" label="Dimensions" placeholder="218 × 145 cm" />
        <Field k="weave" label="Weave" placeholder="Hand-knotted" />
      </div>

      <div className="mt-3">
        <Field
          k="materials"
          label="Materials"
          placeholder="Hand-spun wool pile on wool foundation"
        />
      </div>
      <div className="mt-3">
        <Field
          k="condition"
          label="Condition"
          placeholder="Very good for age, with expected minor signs of use"
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field k="estimateLow" label="Estimate — low" type="number" placeholder="2500" />
        <Field k="estimateHigh" label="Estimate — high" type="number" placeholder="4000" />
        <Field k="publishedReserve" label="Published reserve" type="number" placeholder="1200" />
      </div>

      <div className="mt-3">
        <label className={labelCls}>Lot note</label>
        <RichTextArea
          rows={3}
          value={draft.lotNote}
          onChange={set("lotNote")}
          placeholder="Provenance, restoration history, anything a bidder should know…"
          className={inputCls}
        />
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setDraft(lot);
            setOpen(false);
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm text-cream/70 transition-colors hover:border-gold/50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-gold px-6 py-2 text-sm font-medium text-void transition-colors hover:bg-gold-light disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save lot
        </button>
      </div>
    </div>
  );
}
