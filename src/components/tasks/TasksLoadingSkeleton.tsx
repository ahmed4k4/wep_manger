/**
 * Tasks Loading Skeleton
 */

import { Skeleton } from '@/components/ui/skeleton';

export function TasksLoadingSkeleton({ count = 5 }: { count?: number } = {}) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading tasks">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}