"use client";

import { useActionState } from "react";
import { loginUser, type LoginState } from "@/app/(site-auth)/actions";

const inputCls =
  "w-full rounded border border-gold/20 bg-void/60 px-4 py-2.5 text-sm text-silk outline-none transition-colors focus:border-gold";

export default function LoginForm({
  next,
  justRegistered,
}: {
  next: string;
  justRegistered?: boolean;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginUser,
    {}
  );

  return (
    <form
      action={formAction}
      className="mt-8 space-y-4 rounded-xl border border-gold/20 bg-surface/60 p-8 backdrop-blur"
    >
      <input type="hidden" name="next" value={next} />

      {justRegistered && !state.error && (
        <p className="rounded border border-green-700/50 bg-green-900/30 px-4 py-2.5 text-sm text-green-200">
          ✓ Your account is ready — sign in to continue.
        </p>
      )}

      <div>
        <label className="mb-1.5 block text-xs tracking-[0.2em] text-muted">
          EMAIL OR PHONE NUMBER
        </label>
        <input
          name="identifier"
          required
          dir="ltr"
          placeholder="you@example.com or +968…"
          className={inputCls}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs tracking-[0.2em] text-muted">
          PASSWORD
        </label>
        <input
          name="password"
          type="password"
          required
          dir="ltr"
          placeholder="••••••••"
          className={inputCls}
        />
      </div>

      {state.error && (
        <div className="rounded border border-crimson/50 bg-crimson/15 px-4 py-2.5 text-sm text-crimson-light">
          {state.error}
          {state.unregistered && (
            <a
              href={`/register?next=${encodeURIComponent(next)}`}
              className="mt-1 block font-semibold text-gold-light underline-offset-4 hover:underline"
            >
              Create your account →
            </a>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-gradient-to-r from-gold-light via-gold to-gold-dim py-3 text-sm font-semibold tracking-[0.25em] text-void transition-all hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "SIGNING IN…" : "SIGN IN"}
      </button>

      <p className="pt-1 text-center text-xs text-muted">
        New to ALBESAT?{" "}
        <a
          href={`/register?next=${encodeURIComponent(next)}`}
          className="text-gold-light hover:underline"
        >
          Create an account
        </a>
      </p>
    </form>
  );
}
