"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { ARTWORK_STATUS } from "@/lib/labels";

const controlCls =
  "rounded-lg border border-border bg-void px-3 py-2 text-sm text-silk outline-none transition-colors focus:border-gold";

export default function CollectionFilters({
  cities,
  categories,
}: {
  cities: string[];
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const city = params.get("city") ?? "";
  const category = params.get("category") ?? "";

  // The text box leads and the URL follows, after a pause — so the query does
  // not re-run on every keystroke.
  const [text, setText] = useState(q);
  const typed = useRef(false);
  // the last `q` this component put in the URL itself. Anything else arriving
  // in `q` came from outside (Back/Forward, a pasted link) and should win.
  const pushed = useRef(q);
  const inputRef = useRef<HTMLInputElement>(null);

  const apply = (patch: Record<string, string>) => {
    if ("q" in patch) pushed.current = patch.q;
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  };

  useEffect(() => {
    // nothing to debounce on the first render, or after the box was rewritten
    // from the URL — only a real keystroke should navigate
    if (!typed.current) return;
    const t = setTimeout(() => {
      if (text !== pushed.current) apply({ q: text });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    // A `q` we did not write means the URL moved under us — follow it. Our own
    // pushes are ignored here, so a slow navigation never overwrites the
    // characters typed while it was in flight.
    if (q === pushed.current) return;
    pushed.current = q;
    typed.current = false;
    setText(q);
  }, [q]);

  const active = Boolean(q || status || city || category);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            typed.current = true;
            setText(e.target.value);
          }}
          placeholder="Search title, code, city, category, material, age, description…"
          aria-label="Search the collection"
          className={`${controlCls} w-full pl-9 pr-9`}
        />
        {text && (
          <button
            type="button"
            aria-label="Clear the search"
            onClick={() => {
              typed.current = false;
              setText("");
              apply({ q: "" });
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-silk"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <select
        value={status}
        onChange={(e) => apply({ status: e.target.value })}
        aria-label="Filter by status"
        className={controlCls}
      >
        <option value="">All statuses</option>
        {Object.entries(ARTWORK_STATUS).map(([value, meta]) => (
          <option key={value} value={value}>
            {meta.label}
          </option>
        ))}
      </select>

      <select
        value={city}
        onChange={(e) => apply({ city: e.target.value })}
        aria-label="Filter by city"
        className={controlCls}
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={category}
        onChange={(e) => apply({ category: e.target.value })}
        aria-label="Filter by category"
        className={controlCls}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {active && (
        <button
          type="button"
          onClick={() => {
            typed.current = false;
            setText("");
            apply({ q: "", status: "", city: "", category: "" });
          }}
          className="rounded-lg border border-border px-3 py-2 text-sm text-cream/70 transition-colors hover:border-gold/50 hover:text-gold-light"
        >
          Clear
        </button>
      )}

      {pending && <Loader2 className="h-4 w-4 animate-spin text-gold/70" />}
    </div>
  );
}
