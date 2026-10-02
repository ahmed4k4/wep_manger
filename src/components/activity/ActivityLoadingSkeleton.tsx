/**
 * Activity Loading Skeleton
 * Placeholder shown while activity data is loading
 */

import { Skeleton } from '@/components/ui/skeleton';

export function ActivityLoadingSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading activities">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="relative flex-shrink-0 w-8">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}