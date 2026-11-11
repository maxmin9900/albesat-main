"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, X } from "lucide-react";
import { updateSession } from "@/app/admin/(panel)/auctions/actions";

export type EditableSession = {
  id: string;
  title: string;
  currency: string;
  /** "YYYY-MM-DDTHH:mm" already expressed in Muscat time */
  startAt: string;
  endAt: string;
  registrationOpensAt: string;
  venueName: string;
  venueAddress: string;
  venueHall: string;
  intro: string;
  viewingFrom: string;
  viewingTo: string;
};

const inputCls =
  "w-full rounded-lg border border-border bg-void px-3 py-2 text-sm text-silk outline-none transition-colors focus:border-gold";
const labelCls = "mb-1.5 block text-xs text-cream/70";

/** Edit the session itself — its name, its timing, and its invitation. */
export default function SessionEditor({ session }: { session: EditableSession }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(session);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const set = (k: keyof EditableSession) => (v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  // the time box and the Opens box are two views of one moment
  const [day, clock] = draft.startAt.split("T");
  const setBeginsTime = (hhmm: string) => {
    if (!hhmm || !day) return;
    set("startAt")(`${day}T${hhmm}`);
  };

  const save = () =>
    start(async () => {
      const { id, ...values } = draft;
      const res = await updateSession(id, values);
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

  const err = (k: string) =>
    fieldErrors[k] ? (
      <p className="mt-1 text-xs text-crimson-light">{fieldErrors[k]}</p>
    ) : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-gold/30 px-4 py-2 text-sm text-gold-light transition-colors hover:bg-gold hover:text-void"
      >
        <Pencil className="h-4 w-4" />
        Edit session
      </button>
    );
  }

  return (
    <div className="mb-8 rounded-xl border border-gold/20 bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-lg text-gold-light">Edit session</h3>
        <button
          type="button"
          onClick={() => {
            setDraft(session);
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
        <div>
          <label className={labelCls}>Session title</label>
          <input
            value={draft.title}
            onChange={(e) => set("title")(e.target.value)}
            className={inputCls}
          />
          {err("title")}
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <select
            value={draft.currency}
            onChange={(e) => set("currency")(e.target.value)}
            className={inputCls}
          >
            {["OMR", "USD", "EUR", "AED", "IRR"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-6 text-[10px] tracking-[0.3em] text-gold/70">TIMING</p>
      <p className="mb-3 mt-1 text-xs text-muted">
        Every time on this form is Muscat time.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Registration opens</label>
          <input
            type="datetime-local"
            dir="ltr"
            value={draft.registrationOpensAt}
            onChange={(e) => set("registrationOpensAt")(e.target.value)}
            className={inputCls}
          />
          {err("registrationOpensAt")}
        </div>
        <div>
          <label className={labelCls}>Opens</label>
          <input
            type="datetime-local"
            dir="ltr"
            value={draft.startAt}
            onChange={(e) => set("startAt")(e.target.value)}
            className={inputCls}
          />
          {err("startAt")}
        </div>
        <div>
          <label className={labelCls}>Auction begins</label>
          <input
            type="time"
            dir="ltr"
            value={clock?.slice(0, 5) ?? ""}
            onChange={(e) => setBeginsTime(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Closes</label>
          <input
            type="datetime-local"
            dir="ltr"
            value={draft.endAt}
            onChange={(e) => set("endAt")(e.target.value)}
            className={inputCls}
          />
          {err("endAt")}
        </div>
      </div>

      <p className="mt-6 text-[10px] tracking-[0.3em] text-gold/70">
        THE INVITATION
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Venue name (short)</label>
          <input
            value={draft.venueName}
            onChange={(e) => set("venueName")(e.target.value)}
            placeholder="National Museum of Oman"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Address line</label>
          <input
            value={draft.venueAddress}
            onChange={(e) => set("venueAddress")(e.target.value)}
            placeholder="National Museum of Oman – Land and People Hall, Muscat"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className={labelCls}>Venue detail (the &ldquo;Venue:&rdquo; line)</label>
        <input
          value={draft.venueHall}
          onChange={(e) => set("venueHall")(e.target.value)}
          placeholder="Land and People Hall, National Museum of Oman"
          className={inputCls}
        />
      </div>

      <div className="mt-3">
        <label className={labelCls}>Introduction</label>
        <textarea
          rows={2}
          value={draft.intro}
          onChange={(e) => set("intro")(e.target.value)}
          className={`${inputCls} resize-y`}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Viewing from</label>
          <input
            value={draft.viewingFrom}
            onChange={(e) => set("viewingFrom")(e.target.value)}
            placeholder="17:00"
            dir="ltr"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Viewing to</label>
          <input
            value={draft.viewingTo}
            onChange={(e) => set("viewingTo")(e.target.value)}
            placeholder="19:00"
            dir="ltr"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setDraft(session);
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
          Save session
        </button>
      </div>
    </div>
  );
}
