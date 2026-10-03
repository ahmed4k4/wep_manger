/**
 * Workspace Loading Skeleton
 * Shows skeleton loading state for the project workspace
 */

export function WorkspaceLoadingSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Skeleton */}
      <aside className="w-64 border-r bg-card hidden lg:block">
        <div className="p-4 space-y-4">
          <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-3">
                  <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                </div>
                <div className="mt-2 h-4 w-64 bg-muted animate-pulse rounded" />
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="h-9 w-9 bg-muted animate-pulse rounded-full" />
            </div>
          </div>
        </header>

        {/* Tabs Skeleton */}
        <div className="border-b bg-card px-4">
          <div className="flex gap-1 h-12 items-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        </div>

        {/* Content Skeleton */}
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Stats Grid Skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-6 bg-card border rounded-xl animate-pulse">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-12 w-12 bg-muted animate-pulse rounded-xl" />
                  </div>
                </div>
              ))}
            </div>

            {/* Content Grid Skeleton */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Quick Actions Skeleton */}
              <div className="lg:col-span-1 p-6 bg-card border rounded-xl animate-pulse space-y-3">
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 w-full bg-muted animate-pulse rounded-lg" />
                ))}
              </div>

              {/* Recent Tasks Skeleton */}
              <div className="lg:col-span-2 p-6 bg-card border rounded-xl animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 w-full bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            </div>

            {/* Activity Skeleton */}
            <div className="p-6 bg-card border rounded-xl animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                <div className="h-6 w-20 bg-muted animate-pulse rounded" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 w-full bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}