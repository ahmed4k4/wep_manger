/**
 * Tasks List View
 * Server Component that fetches and displays tasks in a list
 */

import { getTasks, getTaskStats, type TaskFilters, type TaskWithRelations } from '@/lib/db/queries/tasks';
import { TaskCard } from './TaskCard';
import { TasksLoadingSkeleton } from './TasksLoadingSkeleton';
import { TasksEmptyState } from './TasksEmptyState';
import { TasksFiltersClient } from './TasksFiltersClient';
import type { TaskStatus, TaskPriority } from '@/types/project';

interface TasksListProps {
  projectId: string;
  initialFilters?: TaskFilters;
  view?: 'list' | 'compact';
  hasFilters?: boolean;
}

export async function TasksList({ projectId, initialFilters = {}, view = 'list', hasFilters = false }: TasksListProps) {
  const { data: tasks, count, error } = await getTasks({
    project_id: projectId,
    ...initialFilters,
    page_size: view === 'compact' ? 50 : 20,
  });

  const { data: stats } = await getTaskStats(projectId);

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load tasks: {error.message}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return <TasksEmptyState projectId={projectId} hasFilters={hasFilters} />;
  }

  return (
    <div className="space-y-3">
      {view === 'compact' ? (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} variant="compact" draggable={true} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} variant="default" showProject={false} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TasksListContainerProps {
  projectId: string;
  memberIds?: string[];
}

export function TasksListContainer({ projectId, memberIds }: TasksListContainerProps) {
  return (
    <div className="space-y-4">
      <TasksFiltersClient projectId={projectId} memberIds={memberIds} />
      <TasksList projectId={projectId} hasFilters={true} />
    </div>
  );
}