/** Route loading state for /admin — skeleton while the dashboard loads. */
export default function AdminDashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" role="status" className="grid content-start gap-4">
      <span className="sr-only">Loading dashboard…</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          />
        ))}
      </div>
    </div>
  );
}
