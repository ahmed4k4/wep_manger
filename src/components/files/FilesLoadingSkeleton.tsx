/**
 * Files Loading Skeleton
 */

export function FilesLoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-card border rounded-lg">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}