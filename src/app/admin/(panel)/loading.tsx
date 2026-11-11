// Shown instantly on every admin tab navigation while the server component
// loads (and, in dev, compiles) — so clicks feel responsive instead of blank.
export default function PanelLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 rounded-lg bg-surface-2" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-gold/10 bg-surface" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg border border-gold/10 bg-surface" />
        ))}
      </div>
    </div>
  );
}
