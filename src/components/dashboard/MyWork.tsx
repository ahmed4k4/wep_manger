/**
 * My Work Section Component
 * Personal task view for the current user
 */

'use client';

import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TaskWithMinimalRelations {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  due_date: string | null;
  progress: number;
  project: { id: string; name: string; key: string };
  assignee?: { id: string; full_name: string | null; avatar_url: string | null };
}

interface MyWorkData {
  assigned_tasks: TaskWithMinimalRelations[];
  today_tasks: TaskWithMinimalRelations[];
  overdue_tasks: TaskWithMinimalRelations[];
  upcoming_tasks: TaskWithMinimalRelations[];
}

interface MyWorkProps {
  data: MyWorkData;
  className?: string;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    TODO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  return colors[status] || colors.TODO;
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[priority] || colors.MEDIUM;
}

function TaskItem({ task, locale, t }: { task: TaskWithMinimalRelations; locale: string; t: ReturnType<typeof useTranslations> }) {
  const dateLocale = locale === 'ar' ? ar : enUS;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETED';
  
  return (
    <div className="p-3 hover:bg-muted/50 rounded-lg transition-colors group">
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${getStatusColor(task.status).replace('bg-', 'bg-').replace('text-', '')}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-foreground truncate flex-1">{task.title}</p>
            <Badge className={getStatusColor(task.status)} variant="outline">
              {t(`status.${task.status.toLowerCase()}`)}
            </Badge>
            <Badge className={getPriorityColor(task.priority)} variant="outline">
              {t(`priority.${task.priority.toLowerCase()}`)}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="font-mono px-2 py-0.5 bg-muted rounded">
              {task.project.key}
            </span>
            <span className="truncate">{task.project.name}</span>
            
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {format(new Date(task.due_date), 'MMM d', { locale: dateLocale })}
                {isOverdue && <span>({t('overdue')})</span>}
              </span>
            )}
            
            {task.progress > 0 && task.progress < 100 && (
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  emptyMessage,
  icon,
  limit = 5,
  locale,
  t,
}: {
  title: string;
  tasks: TaskWithMinimalRelations[];
  emptyMessage: string;
  icon: React.ReactNode;
  limit?: number;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const displayTasks = tasks.slice(0, limit);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          {icon}
          {title}
        </h4>
        {tasks.length > limit && (
          <span className="text-sm text-muted-foreground">
            {t('showingOf', { showing: limit, total: tasks.length })}
          </span>
        )}
      </div>
      
      {displayTasks.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground bg-muted/50 rounded-lg">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-1" role="list">
          {displayTasks.map((task) => (
            <TaskItem key={task.id} task={task} locale={locale} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MyWork({ data, className }: MyWorkProps) {
  const t = useTranslations('dashboard.myWork');
  const locale = useLocale();
  
  const todayIcon = (
    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  
  const overdueIcon = (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
  
  const upcomingIcon = (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
  
  const assignedIcon = (
    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
  
  return (
    <Card className={className}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {t('title')}
        </h3>
      </div>
      
      <div className="p-4 space-y-6">
        <TaskSection
          title={t('todayTasks')}
          tasks={data.today_tasks}
          emptyMessage={t('noTodayTasks')}
          icon={todayIcon}
          locale={locale}
          t={t}
        />
        
        <TaskSection
          title={t('overdueTasks')}
          tasks={data.overdue_tasks}
          emptyMessage={t('noOverdueTasks')}
          icon={overdueIcon}
          locale={locale}
          t={t}
        />
        
        <TaskSection
          title={t('upcomingTasks')}
          tasks={data.upcoming_tasks}
          emptyMessage={t('noUpcomingTasks')}
          icon={upcomingIcon}
          locale={locale}
          t={t}
        />
        
        <TaskSection
          title={t('allAssignedTasks')}
          tasks={data.assigned_tasks}
          emptyMessage={t('noAssignedTasks')}
          icon={assignedIcon}
          limit={10}
          locale={locale}
          t={t}
        />
      </div>
    </Card>
  );
}