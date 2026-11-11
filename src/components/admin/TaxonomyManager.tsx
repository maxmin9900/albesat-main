"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  createCategory,
  createCity,
  deleteCategory,
  deleteCity,
  moveCategory,
  moveCity,
  setCategoryActive,
  setCityActive,
  updateCategory,
  updateCity,
  type TaxonomyResult,
} from "@/app/admin/(panel)/taxonomy/actions";

export type CityRow = {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  active: boolean;
  works: number;
};

export type CategoryRow = {
  id: string;
  name: string;
  active: boolean;
  works: number;
};

const inputCls =
  "w-full rounded-lg border border-border bg-void px-3 py-2 text-sm text-silk outline-none transition-colors focus:border-gold";
const iconBtn =
  "rounded-lg border border-border p-1.5 text-cream/60 transition-colors hover:border-gold/50 hover:text-gold-light disabled:opacity-40";

export default function TaxonomyManager({
  cities,
  categories,
}: {
  cities: CityRow[];
  categories: CategoryRow[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <CityPanel cities={cities} />
      <CategoryPanel categories={categories} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function CityPanel({ cities }: { cities: CityRow[] }) {
  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Every action goes through here so a refused change (a duplicate name, a
  // city that still has works filed under it) is shown rather than swallowed.
  const run = (fn: () => Promise<TaxonomyResult>, onOk?: () => void) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : (res.error ?? "That did not work."));
      if (res.ok) onOk?.();
    });

  return (
    <Panel
      title="Weaving cities"
      hint="The origins a work can be filed under. These are the regions the public collection page lists, in this order."
      error={error}
      pending={pending}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => createCity(name, province),
            () => {
              setName("");
              setProvince("");
            }
          );
        }}
        className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="City name, e.g. Heriz"
          className={inputCls}
        />
        <input
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          placeholder="Province (optional)"
          className={inputCls}
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="flex items-center justify-center gap-2 rounded-lg border border-gold bg-gold/10 px-4 py-2 text-sm text-gold-light transition-colors hover:bg-gold hover:text-void disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add city
        </button>
      </form>

      <ul className="divide-y divide-gold/10">
        {cities.map((c, i) => (
          <li key={c.id} className="py-2.5">
            {editing === c.id ? (
              <CityEditRow
                city={c}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSave={(n, p) =>
                  run(
                    () => updateCity(c.id, n, p),
                    () => setEditing(null)
                  )
                }
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${
                      c.active ? "text-silk" : "text-cream/40 line-through"
                    }`}
                  >
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    /collection?city={c.slug}
                    {c.province ? ` · ${c.province}` : ""} · {c.works} work
                    {c.works === 1 ? "" : "s"}
                  </p>
                </div>

                <button
                  type="button"
                  title="Move up"
                  disabled={pending || i === 0}
                  onClick={() => run(() => moveCity(c.id, "up"))}
                  className={iconBtn}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  disabled={pending || i === cities.length - 1}
                  onClick={() => run(() => moveCity(c.id, "down"))}
                  className={iconBtn}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title={c.active ? "Hide from the pickers" : "Show again"}
                  disabled={pending}
                  onClick={() => run(() => setCityActive(c.id, !c.active))}
                  className={iconBtn}
                >
                  {c.active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  title="Rename"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setEditing(c.id);
                  }}
                  className={iconBtn}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  disabled={pending}
                  onClick={() => {
                    if (
                      confirm(`Delete ${c.name} from the list of cities?`)
                    )
                      run(() => deleteCity(c.id));
                  }}
                  className={`${iconBtn} hover:border-crimson/60 hover:text-crimson-light`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function CityEditRow({
  city,
  pending,
  onSave,
  onCancel,
}: {
  city: CityRow;
  pending: boolean;
  onSave: (name: string, province: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(city.name);
  const [province, setProvince] = useState(city.province ?? "");

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputCls}
      />
      <input
        value={province}
        onChange={(e) => setProvince(e.target.value)}
        placeholder="Province (optional)"
        className={inputCls}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => onSave(name, province)}
        className="rounded-lg border border-gold px-4 py-2 text-sm text-gold-light transition-colors hover:bg-gold hover:text-void disabled:opacity-40"
      >
        Save
      </button>
      <button type="button" onClick={onCancel} className={iconBtn}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CategoryPanel({ categories }: { categories: CategoryRow[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<TaxonomyResult>, onOk?: () => void) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : (res.error ?? "That did not work."));
      if (res.ok) onOk?.();
    });

  return (
    <Panel
      title="Style categories"
      hint="The design styles offered when a work is created — Medallion, Tribal, and anything else you weave into the archive."
      error={error}
      pending={pending}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => createCategory(name),
            () => setName("")
          );
        }}
        className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name, e.g. Hunting Scene"
          className={inputCls}
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="flex items-center justify-center gap-2 rounded-lg border border-gold bg-gold/10 px-4 py-2 text-sm text-gold-light transition-colors hover:bg-gold hover:text-void disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add category
        </button>
      </form>

      <ul className="divide-y divide-gold/10">
        {categories.map((c, i) => (
          <li key={c.id} className="py-2.5">
            {editing === c.id ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className={inputCls}
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => updateCategory(c.id, draft),
                      () => setEditing(null)
                    )
                  }
                  className="rounded-lg border border-gold px-4 py-2 text-sm text-gold-light transition-colors hover:bg-gold hover:text-void disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className={iconBtn}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm ${
                      c.active ? "text-silk" : "text-cream/40 line-through"
                    }`}
                  >
                    {c.name}
                  </p>
                  <p className="text-xs text-muted">
                    {c.works} work{c.works === 1 ? "" : "s"}
                  </p>
                </div>

                <button
                  type="button"
                  title="Move up"
                  disabled={pending || i === 0}
                  onClick={() => run(() => moveCategory(c.id, "up"))}
                  className={iconBtn}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  disabled={pending || i === categories.length - 1}
                  onClick={() => run(() => moveCategory(c.id, "down"))}
                  className={iconBtn}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title={c.active ? "Hide from the pickers" : "Show again"}
                  disabled={pending}
                  onClick={() => run(() => setCategoryActive(c.id, !c.active))}
                  className={iconBtn}
                >
                  {c.active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  title="Rename"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setDraft(c.name);
                    setEditing(c.id);
                  }}
                  className={iconBtn}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Delete the ${c.name} category?`))
                      run(() => deleteCategory(c.id));
                  }}
                  className={`${iconBtn} hover:border-crimson/60 hover:text-crimson-light`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function Panel({
  title,
  hint,
  error,
  pending,
  children,
}: {
  title: string;
  hint: string;
  error: string | null;
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gold/10 bg-surface p-6">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="font-display text-xl text-gold-light">{title}</h3>
        {pending && (
          <Loader2 className="h-4 w-4 animate-spin text-gold/70" />
        )}
      </div>
      <p className="mb-5 text-sm text-muted">{hint}</p>

      {error && (
        <p className="mb-4 rounded-lg border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm text-crimson-light">
          {error}
        </p>
      )}

      {children}
    </section>
  );
}
