/**
 * Project Tasks Tab
 * Full-featured task management with search, filters, sorting, and views
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Filter, List, KanbanSquare, Plus, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { TaskCard } from '@/components/tasks/TaskCard';
import { getTasksAction } from '@/app/actions/tasks';
import { createTaskAction } from '@/app/actions/tasks';
import { updateTaskAction, deleteTaskAction } from '@/app/actions/tasks';
import type { TaskWithRelations, TaskFilters, TaskStatus, TaskPriority, UpdateTaskInput } from '@/types/project';
import type { Project } from '@/types/project';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ProjectTasksTabProps {
  projectId: string;
  project: Project;
}

const statusOptions: { value: TaskStatus; label: { ar: string; en: string } }[] = [
  { value: 'TODO', label: { ar: 'قيد الانتظار', en: 'To Do' } },
  { value: 'IN_PROGRESS', label: { ar: 'قيد التنفيذ', en: 'In Progress' } },
  { value: 'REVIEW', label: { ar: 'مراجعة', en: 'Review' } },
  { value: 'BLOCKED', label: { ar: 'محظورة', en: 'Blocked' } },
  { value: 'COMPLETED', label: { ar: 'مكتملة', en: 'Completed' } },
];

const priorityOptions: { value: TaskPriority; label: { ar: string; en: string } }[] = [
  { value: 'URGENT', label: { ar: 'عاجل', en: 'Urgent' } },
  { value: 'HIGH', label: { ar: 'عالي', en: 'High' } },
  { value: 'MEDIUM', label: { ar: 'متوسط', en: 'Medium' } },
  { value: 'LOW', label: { ar: 'منخفض', en: 'Low' } },
];

const sortOptions = [
  { value: 'position', label: { ar: 'الموقع', en: 'Position' } },
  { value: 'created_at', label: { ar: 'تاريخ الإنشاء', en: 'Created Date' } },
  { value: 'updated_at', label: { ar: 'تاريخ التحديث', en: 'Updated Date' } },
  { value: 'due_date', label: { ar: 'تاريخ الاستحقاق', en: 'Due Date' } },
  { value: 'priority', label: { ar: 'الأولوية', en: 'Priority' } },
];

const labels = {
  tasks: { ar: 'المهام', en: 'Tasks' },
  search: { ar: 'البحث...', en: 'Search...' },
  allStatuses: { ar: 'كل الحالات', en: 'All Statuses' },
  allPriorities: { ar: 'كل الأولويات', en: 'All Priorities' },
  sortBy: { ar: 'ترتيب حسب', en: 'Sort By' },
  order: { ar: 'الترتيب', en: 'Order' },
  ascending: { ar: 'تصاعدي', en: 'Ascending' },
  descending: { ar: 'تنازلي', en: 'Descending' },
  createTask: { ar: 'إنشاء مهمة', en: 'Create Task' },
  noTasks: { ar: 'لا توجد مهام', en: 'No tasks' },
  noTasksFiltered: { ar: 'لا توجد مهام تطابق الفلتر', en: 'No tasks match filter' },
  listView: { ar: 'قائمة', en: 'List' },
  kanbanView: { ar: 'كانبان', en: 'Kanban' },
  loading: { ar: 'جاري التحميل...', en: 'Loading...' },
  error: { ar: 'خطأ في التحميل', en: 'Error loading tasks' },
  retry: { ar: 'إعادة المحاولة', en: 'Retry' },
  edit: { ar: 'تعديل', en: 'Edit' },
  duplicate: { ar: 'نسخ', en: 'Duplicate' },
  delete: { ar: 'حذف', en: 'Delete' },
  confirmDelete: { ar: 'هل أنت متأكد من حذف هذه المهمة؟', en: 'Are you sure you want to delete this task?' },
};

export function ProjectTasksTab({ projectId, project }: ProjectTasksTabProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const dateLocale = isArabic ? ar : enUS;
  const projectPath = `/${locale}/projects/${project.id}`;

  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({
    project_id: projectId,
    page: 1,
    page_size: 20,
    sort_by: 'position',
    sort_order: 'asc',
  });
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTasks = useCallback(async (page = 1, append = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getTasksAction({
        ...filters,
        page,
        page_size: 20,
      } as TaskFilters);

      if (result.success && result.data) {
        if (append) {
          setTasks((prev) => [...prev, ...result.data!]);
        } else {
          setTasks(result.data);
        }
        setHasMore(result.data.length === 20);
        setTotalCount(result.count || 0);
      } else {
        throw new Error(result.error || labels.error[isArabic ? 'ar' : 'en']);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error[isArabic ? 'ar' : 'en']);
    } finally {
      setIsLoading(false);
    }
  }, [filters, isArabic]);

  useEffect(() => {
    fetchTasks(1, false);
  }, [fetchTasks]);

  const handleFilterChange = <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSortChange = (sortBy: TaskFilters['sort_by']) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: sortBy,
      sort_order: prev.sort_by === sortBy && prev.sort_order === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const handleLoadMore = () => {
    const nextPage = (filters.page ?? 1) + 1;
    fetchTasks(nextPage, true);
  };

  const handleCreateTask = async (title: string) => {
    const result = await createTaskAction({
      project_id: projectId,
      title,
      status: 'TODO',
      priority: 'MEDIUM',
    });

    if (result.success) {
      fetchTasks(1, false);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(labels.confirmDelete[isArabic ? 'ar' : 'en'])) return;
    
    try {
      const { deleteTaskAction } = await import('@/app/actions/tasks');
      const result = await deleteTaskAction(taskId);
      if (result.success) {
        fetchTasks(1, false);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<TaskWithRelations>) => {
    try {
      const { updateTaskAction } = await import('@/app/actions/tasks');
      // Filter updates to match UpdateTaskInput type (handle null/undefined for description)
      const filteredUpdates = {
        ...updates,
        description: updates.description === null ? undefined : updates.description,
      };
      const result = await updateTaskAction(taskId, filteredUpdates);
      if (result.success) {
        fetchTasks(1, false);
      }
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const statusLabels: Record<TaskStatus, string> = {
    TODO: isArabic ? 'قيد الانتظار' : 'To Do',
    IN_PROGRESS: isArabic ? 'قيد التنفيذ' : 'In Progress',
    REVIEW: isArabic ? 'مراجعة' : 'Review',
    BLOCKED: isArabic ? 'محظورة' : 'Blocked',
    COMPLETED: isArabic ? 'مكتملة' : 'Completed',
  };

  const priorityLabels: Record<TaskPriority, string> = {
    URGENT: isArabic ? 'عاجل' : 'Urgent',
    HIGH: isArabic ? 'عالي' : 'High',
    MEDIUM: isArabic ? 'متوسط' : 'Medium',
    LOW: isArabic ? 'منخفض' : 'Low',
  };

  if (isLoading && tasks.length === 0) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-10 w-32 bg-muted rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 w-full bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchTasks(1, false)}>
            {labels.retry[isArabic ? 'ar' : 'en']}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with View Toggle and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'kanban')} className="hidden sm:flex">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                {labels.listView[isArabic ? 'ar' : 'en']}
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <KanbanSquare className="mr-2 h-4 w-4" />
                {labels.kanbanView[isArabic ? 'ar' : 'en']}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href={`${projectPath}/tasks/new`}>
              <Plus className="mr-2 h-4 w-4" />
              {labels.createTask[isArabic ? 'ar' : 'en']}
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={labels.search[isArabic ? 'ar' : 'en']}
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.status || ''} onValueChange={(value) => handleFilterChange('status', value as TaskStatus | undefined)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={labels.allStatuses[isArabic ? 'ar' : 'en']} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{labels.allStatuses[isArabic ? 'ar' : 'en']}</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label[isArabic ? 'ar' : 'en']}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.priority || ''} onValueChange={(value) => handleFilterChange('priority', value as TaskPriority | undefined)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={labels.allPriorities[isArabic ? 'ar' : 'en']} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{labels.allPriorities[isArabic ? 'ar' : 'en']}</SelectItem>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label[isArabic ? 'ar' : 'en']}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.sort_by} onValueChange={(value) => handleSortChange(value as TaskFilters['sort_by'])}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={labels.sortBy[isArabic ? 'ar' : 'en']} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label[isArabic ? 'ar' : 'en']}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleFilterChange('sort_order', filters.sort_order === 'asc' ? 'desc' : 'asc')}
              className="h-10"
              aria-label={labels.order[isArabic ? 'ar' : 'en']}
            >
              {filters.sort_order === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardContent className="p-0">
          {view === 'list' ? (
            <div className="divide-y">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <List className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p>{filters.search || filters.status || filters.priority 
                    ? labels.noTasksFiltered[isArabic ? 'ar' : 'en'] 
                    : labels.noTasks[isArabic ? 'ar' : 'en']}</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    variant="default"
                    showProject={false}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="p-4">
              <TaskKanbanBoard projectId={projectId} project={project} tasks={tasks} onRefresh={() => fetchTasks(1, false)} />
            </div>
          )}

          {hasMore && (
            <div className="p-4 border-t">
              <Button variant="outline" className="w-full" onClick={handleLoadMore} disabled={isLoading}>
                {isLoading ? labels.loading[isArabic ? 'ar' : 'en'] : `${labels[view === 'list' ? 'listView' : 'kanbanView'][isArabic ? 'ar' : 'en']}...`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground text-center">
        {totalCount > 0 ? (
          <>
            {isArabic ? 'إجمالي' : 'Total'}: <strong>{totalCount}</strong> {isArabic ? 'مهمة' : 'tasks'}
          </>
        ) : (
          ''
        )}
      </div>
    </div>
  );
}

function TaskKanbanBoard({ projectId, project, tasks, onRefresh }: { 
  projectId: string; 
  project: Project; 
  tasks: TaskWithRelations[];
  onRefresh: () => void;
}) {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED'];
  
  const statusLabels: Record<TaskStatus, string> = {
    TODO: isArabic ? 'قيد الانتظار' : 'To Do',
    IN_PROGRESS: isArabic ? 'قيد التنفيذ' : 'In Progress',
    REVIEW: isArabic ? 'مراجعة' : 'Review',
    BLOCKED: isArabic ? 'محظورة' : 'Blocked',
    COMPLETED: isArabic ? 'مكتملة' : 'Completed',
  };

  const statusColors: Record<TaskStatus, string> = {
    TODO: 'bg-gray-100 dark:bg-gray-800',
    IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/30',
    REVIEW: 'bg-purple-100 dark:bg-purple-900/30',
    BLOCKED: 'bg-red-100 dark:bg-red-900/30',
    COMPLETED: 'bg-green-100 dark:bg-green-900/30',
  };

  const columns = statuses.map((status) => {
    const columnTasks = tasks.filter((t) => t.status === status);
    return (
      <div key={status} className="flex-1 min-w-[280px] max-w-[320px] bg-muted/30 rounded-xl p-3 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {statusLabels[status]}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[status]}`}>
            {columnTasks.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]" 
          role="list" 
          aria-label={statusLabels[status]}>
          {columnTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              variant="compact"
              draggable={true}
              showProject={false}
            />
          ))}
          {columnTasks.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {isArabic ? 'لا توجد مهام' : 'No tasks'}
            </div>
          )}
        </div>
      </div>
    );
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-350px)]">
      {columns}
    </div>
  );
}