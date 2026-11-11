import Link from "next/link";
import type { Tone } from "@/lib/labels";

const TONE_CLASS: Record<Tone, string> = {
  gold: "border-gold/30 bg-gold/10 text-gold-light",
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  blue: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  red: "border-red-500/30 bg-red-500/10 text-red-300",
  gray: "border-white/15 bg-white/5 text-cream/70",
  purple: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export function Badge({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-silk">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-void transition-colors hover:bg-gold-light"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gold/10 bg-surface p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "gold",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}) {
  const accent: Record<Tone, string> = {
    gold: "text-gold-light",
    green: "text-emerald-300",
    blue: "text-sky-300",
    red: "text-red-300",
    gray: "text-cream",
    purple: "text-violet-300",
    amber: "text-amber-300",
  };
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 font-display text-3xl ${accent[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gold/15 bg-surface/50 p-12 text-center text-muted">
      {text}
    </div>
  );
}

export function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gold/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-space text-xs text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gold/5">{children}</tbody>
      </table>
    </div>
  );
}
