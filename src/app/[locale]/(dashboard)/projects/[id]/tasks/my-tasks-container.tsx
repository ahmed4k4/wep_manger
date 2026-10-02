/**
 * My Tasks Container
 * Server component that fetches user's tasks and renders the client component
 */

import { getMyTasks } from '@/lib/db/queries/tasks';
import { MyTasksClient } from './my-tasks-client';
import { Suspense } from 'react';

interface MyTasksContainerProps {
  projectId: string;
}

export function MyTasksContainer({ projectId }: MyTasksContainerProps) {
  return (
    <Suspense fallback={<MyTasksSkeleton />}>
      <MyTasksServer projectId={projectId} />
    </Suspense>
  );
}

async function MyTasksServer({ projectId }: { projectId: string }) {
  const { data: tasks, error } = await getMyTasks({
    project_id: projectId,
    page_size: 50,
  });

  if (error) {
    return <div className="text-center py-8 text-destructive">Failed to load tasks</div>;
  }

  return <MyTasksClient initialTasks={tasks || []} projectId={projectId} />;
}

function MyTasksSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}