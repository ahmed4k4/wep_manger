/**
 * Task Card Component
 * Used in List View, Kanban Board, and My Tasks
 */

'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Flag,
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  CheckCircle,
  ChevronRight,
  User,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, Profile } from '@/types/project';
import { useRouter } from 'next/navigation';
import { updateTaskStatusAction, updateTaskPriorityAction, deleteTaskAction } from '@/app/actions/tasks';
import { toast } from 'sonner';

interface TaskCardProps {
  task: Task & {
    assignee?: Profile;
    creator?: Profile;
    comments_count?: number;
    attachments_count?: number;
    project?: Pick<import('@/types/project').Project, 'id' | 'name' | 'key'>;
  };
  onClick?: () => void;
  variant?: 'default' | 'compact' | 'kanban';
  draggable?: boolean;
  showProject?: boolean;
}

const statusLabels: Record<TaskStatus, { ar: string; en: string }> = {
  TODO: { ar: 'قيد الانتظار', en: 'To Do' },
  IN_PROGRESS: { ar: 'قيد التنفيذ', en: 'In Progress' },
  REVIEW: { ar: 'قيد المراجعة', en: 'Review' },
  BLOCKED: { ar: 'محظور', en: 'Blocked' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed' },
};

const statusColors: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  REVIEW: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const priorityLabels: Record<TaskPriority, { ar: string; en: string }> = {
  LOW: { ar: 'منخفض', en: 'Low' },
  MEDIUM: { ar: 'متوسط', en: 'Medium' },
  HIGH: { ar: 'عالي', en: 'High' },
  URGENT: { ar: 'عاجل', en: 'Urgent' },
};

const priorityColors: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
  LOW: <Flag className="h-3 w-3" />,
  MEDIUM: <Flag className="h-3 w-3" />,
  HIGH: <Flag className="h-3 w-3" />,
  URGENT: <AlertTriangle className="h-3 w-3" />,
};

export function TaskCard({
  task,
  onClick,
  variant = 'default',
  draggable = false,
  showProject = false,
}: TaskCardProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETED';
  const isDueSoon = task.due_date && new Date(task.due_date) > new Date() && new Date(task.due_date).getTime() - new Date().getTime() <= 3 * 24 * 60 * 60 * 1000 && task.status !== 'COMPLETED';

  const handleStatusChange = async (newStatus: TaskStatus) => {
    const result = await updateTaskStatusAction(task.id, newStatus);
    if (!result.success) toast.error(result.error || (isArabic ? 'تعذر تحديث الحالة' : 'Could not update status'));
    else router.refresh();
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    const result = await updateTaskPriorityAction(task.id, newPriority);
    if (!result.success) toast.error(result.error || (isArabic ? 'تعذر تحديث الأولوية' : 'Could not update priority'));
    else router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(isArabic ? 'هل أنت متأكد من أرشفة هذه المهمة؟' : 'Are you sure you want to archive this task?')) {
      return;
    }
    const result = await deleteTaskAction(task.id);
    if (!result.success) toast.error(result.error || (isArabic ? 'تعذر أرشفة المهمة' : 'Could not archive task'));
    else router.refresh();
  };

  if (variant === 'compact') {
    return (
      <Card className={cn('transition-all hover:shadow-md', draggable && 'cursor-grab active:cursor-grabbing')}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate"><Link className="hover:text-primary" href={`/${locale}/projects/${task.project_id}/tasks/${task.id}`}>{task.title}</Link></h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn('text-xs', statusColors[task.status])}>
                  {statusLabels[task.status][isArabic ? 'ar' : 'en']}
                </Badge>
                <Badge variant="outline" className={cn('text-xs', priorityColors[task.priority])}>
                  {priorityIcons[task.priority]}
                  {priorityLabels[task.priority][isArabic ? 'ar' : 'en']}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                    {isArabic ? 'متأخرة' : 'Overdue'}
                  </Badge>
                )}
                {isDueSoon && !isOverdue && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="mr-1 h-2.5 w-2.5" />
                    {isArabic ? 'قريباً' : 'Due Soon'}
                  </Badge>
                )}
              </div>
            </div>
            {task.assignee && (
              <Avatar className="h-8 w-8" title={task.assignee.full_name || ''}>
                <AvatarImage src={task.assignee.avatar_url || undefined} alt={task.assignee.full_name || ''} />
                <AvatarFallback>
                  {task.assignee.full_name
                    ? task.assignee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : task.assignee.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'kanban') {
    return (
      <Card
        className={cn(
          'transition-all hover:shadow-lg',
          draggable && 'cursor-grab active:cursor-grabbing',
          task.due_date && new Date(task.due_date) < new Date() && task.status !== 'COMPLETED' && 'ring-2 ring-destructive/50'
        )}
        draggable={draggable}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium line-clamp-2 flex-1 pr-2">
              <Link href={`/${locale}/projects/${task.project_id}/tasks/${task.id}`} className="hover:text-primary">{task.title}</Link>
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => handleStatusChange('TODO')}
                  className={task.status === 'TODO' ? 'bg-primary/10' : ''}
                >
                  {statusLabels.TODO[isArabic ? 'ar' : 'en']}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  className={task.status === 'IN_PROGRESS' ? 'bg-primary/10' : ''}
                >
                  {statusLabels.IN_PROGRESS[isArabic ? 'ar' : 'en']}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange('REVIEW')}
                  className={task.status === 'REVIEW' ? 'bg-primary/10' : ''}
                >
                  {statusLabels.REVIEW[isArabic ? 'ar' : 'en']}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange('BLOCKED')}
                  className={task.status === 'BLOCKED' ? 'bg-primary/10' : ''}
                >
                  {statusLabels.BLOCKED[isArabic ? 'ar' : 'en']}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusChange('COMPLETED')}
                  className={task.status === 'COMPLETED' ? 'bg-primary/10' : ''}
                >
                  {statusLabels.COMPLETED[isArabic ? 'ar' : 'en']}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handlePriorityChange('LOW')}>
                  {priorityLabels.LOW[isArabic ? 'ar' : 'en']}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityChange('MEDIUM')}>
                  {priorityLabels.MEDIUM[isArabic ? 'ar' : 'en']}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityChange('HIGH')}>
                  {priorityLabels.HIGH[isArabic ? 'ar' : 'en']}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePriorityChange('URGENT')}>
                  {priorityLabels.URGENT[isArabic ? 'ar' : 'en']}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                  {isArabic ? 'أرشفة' : 'Archive'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn(statusColors[task.status])}>
                {statusLabels[task.status][isArabic ? 'ar' : 'en']}
              </Badge>
              <Badge variant="outline" className={cn(priorityColors[task.priority])}>
                {priorityIcons[task.priority]}
                {priorityLabels[task.priority][isArabic ? 'ar' : 'en']}
              </Badge>
            </div>
            {task.progress > 0 && task.progress < 100 && (
              <div className="w-24">
                <Progress value={task.progress} className="h-1.5" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {task.assignee && (
                <Avatar className="h-6 w-6" title={task.assignee.full_name || ''}>
                  <AvatarImage src={task.assignee.avatar_url || undefined} alt={task.assignee.full_name || ''} />
                  <AvatarFallback>
                    {task.assignee.full_name
                      ? task.assignee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : task.assignee.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <div className="flex items-center gap-3">
              {task.due_date && (
                <span className={cn(
                  'flex items-center gap-1',
                  isOverdue ? 'text-destructive' : isDueSoon ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'
                )}>
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(task.due_date), {
                    addSuffix: true,
                    locale: isArabic ? ar : enUS,
                  })}
                </span>
              )}
              {(task.comments_count && task.comments_count > 0) && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {task.comments_count}
                </span>
              )}
              {(task.attachments_count && task.attachments_count > 0) && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Paperclip className="h-3 w-3" />
                  {task.attachments_count}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className={cn('transition-all hover:shadow-md', draggable && 'cursor-grab active:cursor-grabbing')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium text-base truncate"><Link href={`/${locale}/projects/${task.project_id}/tasks/${task.id}`} className="hover:text-primary">{task.title}</Link></h3>
              {task.status === 'COMPLETED' && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="outline" className={cn(statusColors[task.status])}>
                {statusLabels[task.status][isArabic ? 'ar' : 'en']}
              </Badge>
              <Badge variant="outline" className={cn(priorityColors[task.priority])}>
                {priorityIcons[task.priority]}
                {priorityLabels[task.priority][isArabic ? 'ar' : 'en']}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {isArabic ? 'متأخرة' : 'Overdue'}
                </Badge>
              )}
              {isDueSoon && !isOverdue && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {isArabic ? 'مستحقة قريباً' : 'Due Soon'}
                </Badge>
              )}
              {showProject && task.project && (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {task.project.key}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                {task.assignee && (
                  <span className="flex items-center gap-1" title={task.assignee.full_name || ''}>
                    <User className="h-3.5 w-3.5" />
                    <span>{task.assignee.full_name || (isArabic ? 'بدون اسم' : 'No name')}</span>
                  </span>
                )}
                {task.due_date && (
                  <span className={cn(
                    'flex items-center gap-1',
                    isOverdue ? 'text-destructive' : isDueSoon ? 'text-yellow-600 dark:text-yellow-400' : ''
                  )}>
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDistanceToNow(new Date(task.due_date), {
                      addSuffix: true,
                      locale: isArabic ? ar : enUS,
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {task.progress > 0 && task.progress < 100 && (
                  <div className="w-32">
                    <Progress value={task.progress} className="h-1.5" />
                  </div>
                )}
                {(task.comments_count && task.comments_count > 0) && (
                  <span className="flex items-center gap-1" title={isArabic ? 'تعليقات' : 'Comments'}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    {task.comments_count}
                  </span>
                )}
                {(task.attachments_count && task.attachments_count > 0) && (
                  <span className="flex items-center gap-1" title={isArabic ? 'مرفقات' : 'Attachments'}>
                    <Paperclip className="h-3.5 w-3.5" />
                    {task.attachments_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
