"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  registerForAuction,
  type RegisterState,
} from "@/app/auctions/register-actions";

const fieldCls =
  "mt-3 w-full rounded-sm border border-gold/20 bg-void/50 px-4 py-3 text-cream placeholder:text-muted/70 transition-colors focus:border-gold focus:outline-none";
const labelCls = "text-[10px] tracking-[0.3em] text-gold/80";

export type FormSession = { id: string; label: string };

/**
 * Register for a sale session.
 *
 * Registration is per session, not per carpet — one entry covers every lot
 * in that sale. The session is chosen by pressing "Participate" on a lot or
 * "Register for this session" on a session header; `selectedId` is how the
 * page drives that from outside. With a single session open there is nothing
 * to choose, so no picker is shown at all.
 */
export default function AuctionJoinForm({
  sessions,
  selectedId,
  onSelect,
}: {
  sessions: FormSession[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerForAuction,
    {}
  );

  // Controlled on purpose. React resets an uncontrolled form once the action
  // settles, so after a rejected submit the visitor would find every box they
  // had just filled in wiped clean. Holding the values here keeps them.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  // one sale open? there is nothing to choose
  useEffect(() => {
    if (!selectedId && sessions.length === 1) onSelect(sessions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, selectedId]);

  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="auctionId" value={selectedId} />

      {state.error && (
        <p className="rounded-sm border border-crimson/40 bg-crimson/10 px-4 py-3 text-sm text-crimson-light">
          {state.error}
        </p>
      )}

      {sessions.length > 1 && (
        <div>
          <label className={labelCls} htmlFor="reg-session">
            WHICH SALE
          </label>
          <select
            id="reg-session"
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            className={fieldCls}
          >
            <option value="">Select a sale…</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {err("auctionId") && (
            <p className="mt-2 text-xs text-crimson-light">
              Please choose which sale you are registering for.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="reg-name">
            FULL NAME
          </label>
          <input
            id="reg-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Your name"
            className={fieldCls}
          />
          {err("name") && (
            <p className="mt-2 text-xs text-crimson-light">{err("name")}</p>
          )}
        </div>

        <div>
          <label className={labelCls} htmlFor="reg-phone">
            PHONE
          </label>
          <input
            id="reg-phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            dir="ltr"
            autoComplete="tel"
            placeholder="+968 …"
            className={fieldCls}
          />
          {err("phone") && (
            <p className="mt-2 text-xs text-crimson-light">{err("phone")}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="reg-email">
          EMAIL
        </label>
        <input
          id="reg-email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder="you@example.com"
          className={fieldCls}
        />
        {err("email") && (
          <p className="mt-2 text-xs text-crimson-light">{err("email")}</p>
        )}
      </div>

      <div>
        <label className={labelCls} htmlFor="reg-note">
          ANYTHING WE SHOULD KNOW <span className="text-muted">(OPTIONAL)</span>
        </label>
        <textarea
          id="reg-note"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Accompanying Guest"
          className={`${fieldCls} resize-y`}
        />
      </div>

      <button
        type="submit"
        disabled={pending || !selectedId}
        className="btn-gold-shimmer flex w-full items-center justify-center gap-2 rounded-full border border-gold/60 bg-gold/5 px-8 py-4 text-sm tracking-[0.25em] text-gold-light transition-colors hover:bg-gold hover:text-void disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "REGISTERING…" : "CONFIRM MY PLACE"}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-muted">
        Entirely optional. One registration covers every lot in the sale, costs
        nothing and commits you to nothing — our team will simply call you with
        the terms before bidding opens.
      </p>
    </form>
  );
}
