/**
 * Instant route-segment skeleton (rendered by each route's loading.tsx while the server component
 * streams). Eliminates the blank "time gap" when switching pages — the shell appears immediately.
 */
export function PageSkeleton({ kpis = true, rows = 4 }: { kpis?: boolean; rows?: number }) {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-soft" />
        <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-soft" />
      </div>
      {kpis && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-surface-soft" />
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-card bg-surface-soft" />
        ))}
      </div>
    </div>
  );
}
