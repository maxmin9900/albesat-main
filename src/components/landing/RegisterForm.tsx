"use client";

import { useActionState, useState } from "react";
import { registerUser, type RegisterState } from "@/app/(site-auth)/actions";
import OmanMapPicker from "./OmanMapPicker";

const inputCls =
  "w-full rounded border border-gold/20 bg-void/60 px-4 py-2.5 text-sm text-silk outline-none transition-colors focus:border-gold";
const labelCls = "mb-1.5 block text-xs tracking-[0.2em] text-muted";

export default function RegisterForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerUser,
    {}
  );
  const [mapAddress, setMapAddress] = useState("");
  const [detail, setDetail] = useState("");
  // Omani mobile: exactly 8 digits after the fixed +968 prefix. The input
  // physically refuses anything else (no letters, no extra digits).
  const [phone, setPhone] = useState("");

  const address = mapAddress
    ? detail.trim()
      ? `${detail.trim()}, ${mapAddress}`
      : mapAddress
    : "";

  const err = (f: string) => state.fieldErrors?.[f];

  return (
    <form
      action={formAction}
      className="mt-8 space-y-4 rounded-xl border border-gold/20 bg-surface/60 p-8 backdrop-blur"
    >
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="address" value={address} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>FIRST NAME</label>
          <input name="firstName" required className={inputCls} placeholder="Ahmed" />
          {err("firstName") && (
            <p className="mt-1 text-xs text-crimson-light">{err("firstName")}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>LAST NAME</label>
          <input name="lastName" required className={inputCls} placeholder="Al-Said" />
          {err("lastName") && (
            <p className="mt-1 text-xs text-crimson-light">{err("lastName")}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>PHONE NUMBER (OMAN)</label>
        <div className="flex" dir="ltr">
          <span className="flex items-center rounded-l border border-r-0 border-gold/20 bg-gold/10 px-3 text-sm text-gold-light">
            +968
          </span>
          <input
            value={phone}
            onChange={(e) =>
              // digits only, max 8 — anything else simply cannot be typed
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))
            }
            required
            dir="ltr"
            inputMode="numeric"
            maxLength={8}
            pattern="[79][0-9]{7}"
            title="8 digits starting with 7 or 9, e.g. 91234567"
            placeholder="9xxx xxxx"
            className={`${inputCls} rounded-l-none`}
          />
        </div>
        <input type="hidden" name="mobile" value={phone ? `+968${phone}` : ""} />
        {phone.length > 0 && !/^[79]/.test(phone) && (
          <p className="mt-1 text-xs text-crimson-light">
            Omani mobile numbers start with 7 or 9.
          </p>
        )}
        {err("mobile") && (
          <p className="mt-1 text-xs text-crimson-light">{err("mobile")}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>EMAIL</label>
        <input
          name="email"
          type="email"
          required
          dir="ltr"
          placeholder="you@example.com"
          className={inputCls}
        />
        {err("email") && (
          <p className="mt-1 text-xs text-crimson-light">{err("email")}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>PASSWORD</label>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          dir="ltr"
          placeholder="At least 6 characters"
          className={inputCls}
        />
        {err("password") && (
          <p className="mt-1 text-xs text-crimson-light">{err("password")}</p>
        )}
      </div>

      {/* address — picked on the map of Oman */}
      <div>
        <label className={labelCls}>YOUR ADDRESS — PICK ON THE MAP</label>
        <OmanMapPicker onSelect={(addr) => setMapAddress(addr)} />
        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Street / building details (optional)"
          className={`${inputCls} mt-2`}
        />
        {err("address") && (
          <p className="mt-1 text-xs text-crimson-light">{err("address")}</p>
        )}
      </div>

      {state.error && (
        <p className="rounded border border-crimson/50 bg-crimson/15 px-4 py-2.5 text-sm text-crimson-light">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3 text-sm font-semibold tracking-[0.25em] text-void transition-all hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "CREATING ACCOUNT…" : "CREATE ACCOUNT"}
      </button>

      <p className="pt-1 text-center text-xs text-muted">
        Already a member?{" "}
        <a
          href={`/login?next=${encodeURIComponent(next)}`}
          className="text-gold-light hover:underline"
        >
          Sign in
        </a>
      </p>
    </form>
  );
}
