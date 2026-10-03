/**
 * Dashboard Skeleton Loading Components
 */

'use client';

import { Card } from '@/components/ui/card';

export function KPICardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-busy="true" aria-label="Loading KPIs">
      {Array.from({ length: 10 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="h-4 w-3/4 bg-muted rounded mb-2" />
              <div className="h-8 w-1/2 bg-muted rounded" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ChartCardSkeleton({ height = 250 }: { height?: number }) {
  return (
    <Card className="animate-pulse">
      <div className="mb-4">
        <div className="h-6 w-1/3 bg-muted rounded mb-2" />
        <div className="h-4 w-1/2 bg-muted rounded" />
      </div>
      <div className="h-full w-full bg-muted rounded" style={{ height }} />
    </Card>
  );
}

export function RecentActivitySkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading recent activity">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <div className="w-0.5 h-full bg-muted mt-1 flex-1" />
          </div>
          <div className="flex-1 min-w-0 py-1">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function UpcomingDeadlinesSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="p-4 border-b">
        <div className="h-6 w-1/4 bg-muted rounded" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-1/2 bg-muted rounded mb-1" />
              <div className="h-3 w-1/3 bg-muted rounded" />
            </div>
            <div className="w-24 text-right">
              <div className="h-4 w-full bg-muted rounded mb-1" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
            <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function OverdueSectionSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="p-4 border-b">
        <div className="h-6 w-1/4 bg-muted rounded flex items-center gap-2" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 w-1/2 bg-muted rounded mb-1" />
              <div className="h-3 w-1/3 bg-muted rounded" />
            </div>
            <div className="w-24 text-right">
              <div className="h-4 w-full bg-muted rounded mb-1" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
            <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function MyWorkSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="p-4 border-b">
        <div className="h-6 w-1/4 bg-muted rounded flex items-center gap-2" />
      </div>
      <div className="p-4 space-y-6">
        {Array.from({ length: 4 }).map((_, sectionIdx) => (
          <div key={sectionIdx} className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-1/4 bg-muted rounded flex items-center gap-2" />
            </div>
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 bg-muted shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="h-5 w-20 bg-muted rounded" />
                        <div className="h-5 w-20 bg-muted rounded" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-3 w-16 bg-muted rounded mb-1" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function FullDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      {/* KPIs */}
      <KPICardsSkeleton />
      
      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCardSkeleton height={300} />
        <ChartCardSkeleton height={300} />
      </div>
      
      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCardSkeleton height={300} />
        <ChartCardSkeleton height={300} />
      </div>
      
      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RecentActivitySkeleton />
        <UpcomingDeadlinesSkeleton />
        <OverdueSectionSkeleton />
      </div>
      
      {/* My Work */}
      <MyWorkSkeleton />
    </div>
  );
}