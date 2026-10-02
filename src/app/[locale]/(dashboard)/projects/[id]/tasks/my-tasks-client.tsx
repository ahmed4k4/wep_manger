/**
 * My Tasks Client Component
 * Handles interactive functionality for my tasks
 */

'use client';

import { useState } from 'react';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TasksEmptyState } from '@/components/tasks/TasksEmptyState';
import type { TaskWithRelations } from '@/types/project';

interface MyTasksClientProps {
  initialTasks: TaskWithRelations[];
  projectId: string;
}

export function MyTasksClient({ initialTasks, projectId }: MyTasksClientProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);

  if (tasks.length === 0) {
    return <TasksEmptyState projectId={projectId} />;
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} variant="default" showProject={false} />
      ))}
    </div>
  );
}