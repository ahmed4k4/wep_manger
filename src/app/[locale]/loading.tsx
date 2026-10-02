export default function LocaleLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-7" aria-label="Loading" role="status">
      <span className="sr-only">Loading workspace</span>
      <div className="space-y-3"><div className="h-3 w-24 rounded bg-muted" /><div className="h-9 w-56 rounded bg-muted" /><div className="h-4 w-80 max-w-full rounded bg-muted" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="h-48 rounded-2xl border bg-card" /><div className="h-48 rounded-2xl border bg-card" /><div className="h-48 rounded-2xl border bg-card" /></div>
    </div>
  );
}
