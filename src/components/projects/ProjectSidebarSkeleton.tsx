/**
 * Project Sidebar Skeleton
 * Loading state for project sidebar
 */

'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export function ProjectSidebarSkeleton() {
  return (
    <nav className="space-y-1 animate-pulse" aria-label="Project navigation" aria-busy="true">
      <div className="px-3 py-2">
        <Skeleton className="h-4 w-24" />
      </div>

      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg mx-3" />
      ))}

      <Separator className="my-4" />

      <div className="px-3 py-2">
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="px-3 space-y-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </nav>
  );
}