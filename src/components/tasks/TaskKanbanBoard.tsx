/**
 * Task Kanban Board Client Component
 * Displays tasks grouped by status in columns
 */

'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { reorderTasksAction } from '@/app/actions/tasks';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types/project';
import type { TaskWithRelations } from '@/lib/db/queries/tasks';

const statusOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED'];

const statusLabels: Record<TaskStatus, { ar: string; en: string }> = {
  TODO: { ar: 'قيد الانتظار', en: 'To Do' },
  IN_PROGRESS: { ar: 'قيد التنفيذ', en: 'In Progress' },
  REVIEW: { ar: 'قيد المراجعة', en: 'Review' },
  BLOCKED: { ar: 'محظور', en: 'Blocked' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed' },
};

const statusColors: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 dark:bg-gray-800',
  IN_PROGRESS: 'bg-blue-50 dark:bg-blue-900/20',
  REVIEW: 'bg-purple-50 dark:bg-purple-900/20',
  BLOCKED: 'bg-red-50 dark:bg-red-900/20',
  COMPLETED: 'bg-green-50 dark:bg-green-900/20',
};

const statusBorderColors: Record<TaskStatus, string> = {
  TODO: 'border-gray-200 dark:border-gray-700',
  IN_PROGRESS: 'border-blue-200 dark:border-blue-800',
  REVIEW: 'border-purple-200 dark:border-purple-800',
  BLOCKED: 'border-red-200 dark:border-red-800',
  COMPLETED: 'border-green-200 dark:border-green-800',
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskWithRelations[];
  projectId: string;
  columns: Record<TaskStatus, TaskWithRelations[]>;
  setColumns: React.Dispatch<React.SetStateAction<Record<TaskStatus, TaskWithRelations[]>>>;
  initialTasks: Record<TaskStatus, TaskWithRelations[]>;
}

function KanbanColumn({ 
  status, 
  tasks, 
  projectId, 
  columns,
  setColumns,
  initialTasks,
}: KanbanColumnProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('fromStatus', status);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const fromStatus = e.dataTransfer.getData('fromStatus') as TaskStatus;
    
    if (!taskId || fromStatus === status) return;

    // Get current columns
    const sourceTasks = [...columns[fromStatus]];
    const targetTasks = [...columns[status]];

    // Remove from source
    const taskIndex = sourceTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    const [task] = sourceTasks.splice(taskIndex, 1);

    // Add to target (at end for now)
    targetTasks.push({ ...task, status });

    // Optimistic update
    setColumns(prev => ({
      ...prev,
      [fromStatus]: sourceTasks,
      [status]: targetTasks,
    }));

    // Sync with server
    const allTaskIds: string[] = [];
    statusOrder.forEach(s => {
      if (s === status) {
        allTaskIds.push(...targetTasks.map(t => t.id));
      } else if (s === fromStatus) {
        allTaskIds.push(...sourceTasks.map(t => t.id));
      } else {
        allTaskIds.push(...columns[s].map(t => t.id));
      }
    });

    reorderTasksAction(allTaskIds).catch(() => {
      // Revert on error
      setColumns(initialTasks);
    });
  };

  return (
    <div 
      className={cn(
        'flex flex-col flex-shrink-0 w-72 h-full rounded-xl border',
        statusBorderColors[status],
        statusColors[status]
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b sticky top-0 z-10 bg-inherit/95 backdrop-blur-sm rounded-t-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm capitalize">
            {statusLabels[status][isArabic ? 'ar' : 'en']}
          </h3>
          <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks List */}
      <div 
        className="flex-1 overflow-y-auto p-2 space-y-2"
        role="list"
        aria-label={`${statusLabels[status][isArabic ? 'ar' : 'en']} tasks`}
      >
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground/50">
            <p className="text-sm">{isArabic ? 'لا توجد مهام' : 'No tasks'}</p>
            <p className="text-xs mt-1">
              {isArabic ? 'اسحب المهام إلى هنا' : 'Drag tasks here'}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              className="group"
            >
              <TaskCard
                task={task}
                variant="kanban"
                draggable={true}
              />
            </div>
          ))
        )}
      </div>

      {/* Add Task Button at bottom of column */}
      <Button
        variant="ghost"
        size="sm"
        className="mx-2 mb-2 w-full justify-start gap-1"
        onClick={() => router.push(`/projects/${projectId}/tasks/new?status=${status}`)}
      >
        <Plus className="h-3.5 w-3.5" />
        {isArabic ? 'إضافة' : 'Add'}
      </Button>
    </div>
  );
}

interface TaskKanbanBoardProps {
  projectId: string;
  initialTasks: Record<TaskStatus, TaskWithRelations[]>;
}

export function TaskKanbanBoard({ projectId, initialTasks }: TaskKanbanBoardProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();

  const [columns, setColumns] = useState<Record<TaskStatus, TaskWithRelations[]>>(initialTasks);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)]">
      {statusOrder.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={columns[status]}
          projectId={projectId}
          columns={columns}
          setColumns={setColumns}
          initialTasks={initialTasks}
        />
      ))}
      
      {/* Add Task Button Column */}
      <div className="flex-shrink-0 w-72">
        <Button
          variant="outline"
          className="h-12 w-full justify-start gap-2 border-dashed"
          onClick={() => router.push(`/projects/${projectId}/tasks/new`)}
        >
          <Plus className="h-4 w-4" />
          {isArabic ? 'إضافة مهمة' : 'Add Task'}
        </Button>
      </div>
    </div>
  );
}