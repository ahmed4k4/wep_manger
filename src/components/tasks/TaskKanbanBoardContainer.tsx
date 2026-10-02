/**
 * Task Kanban Board Container (Server Component)
 * Fetches data and wraps the client component
 */

import { Suspense } from 'react';
import { getTasksForKanban } from '@/lib/db/queries/tasks';
import { TaskKanbanBoard } from './TaskKanbanBoard';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskStatus } from '@/types/project';
import type { TaskWithRelations } from '@/lib/db/queries/tasks';

const statusOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED'];

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
      {statusOrder.map((status) => (
        <div key={status} className="flex-shrink-0 w-72">
          <div className="h-10 bg-muted rounded-t-xl" />
          <div className="flex-1 space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export async function TaskKanbanBoardContainer({ projectId }: { projectId: string }) {
  const { data, error } = await getTasksForKanban(projectId);
  
  if (error || !data) {
    return <div className="text-center py-8 text-destructive">Failed to load kanban board</div>;
  }

  return (
    <Suspense fallback={<KanbanSkeleton />}>
      <TaskKanbanBoard projectId={projectId} initialTasks={data} />
    </Suspense>
  );
}
