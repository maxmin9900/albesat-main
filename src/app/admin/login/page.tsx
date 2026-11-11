"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-6">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,162,75,0.08),transparent_60%)]" />

      <div className="relative w-full max-w-md rounded-2xl border border-gold/15 bg-surface/70 p-8 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl text-gradient-gold">ALBESAT</p>
          <p className="mt-2 text-sm text-cream/60">Collection Admin Panel</p>
        </div>

        <form action={formAction} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm text-cream/80">Email</label>
            <input
              name="email"
              type="email"
              dir="ltr"
              autoComplete="username"
              defaultValue="admin@carpetsamir.com"
              className="w-full rounded-lg border border-border bg-void px-4 py-2.5 text-silk outline-none transition-colors focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-cream/80">
              Password
            </label>
            <input
              name="password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-void px-4 py-2.5 text-silk outline-none transition-colors focus:border-gold"
            />
          </div>

          {state.error && (
            <p className="rounded-lg border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm text-crimson-light">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-gold py-2.5 font-medium text-void transition-colors hover:bg-gold-light disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        
      </div>
    </div>
  );
}
