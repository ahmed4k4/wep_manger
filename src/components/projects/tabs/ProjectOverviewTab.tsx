/**
 * Project Overview Tab
 * Displays project overview with progress, stats, quick actions, and recent activity
 */

'use client';

import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  ArrowRight,
  ClipboardList,
  FileText,
  TrendingUp,
  Activity,
  Target,
  Flag,
  Zap,
} from 'lucide-react';
import type { Project, ProjectStats } from '@/types/project';
import type { TaskWithRelations } from '@/lib/db/queries/tasks';
import type { ActivityLogWithUser } from '@/lib/db/queries/activity';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';

interface ProjectOverviewTabProps {
  project: Project;
  stats?: ProjectStats | null;
  initialTasks?: TaskWithRelations[];
  initialActivity?: ActivityLogWithUser[];
}

const statCards = [
  {
    key: 'total',
    labelKey: 'totalTasks',
    icon: ClipboardList,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    key: 'completed',
    labelKey: 'completed',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    key: 'inProgress',
    labelKey: 'inProgress',
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  {
    key: 'overdue',
    labelKey: 'overdue',
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
] as const;

const labels: Record<string, { ar: string; en: string }> = {
  totalTasks: { ar: 'إجمالي المهام', en: 'Total Tasks' },
  completed: { ar: 'مكتملة', en: 'Completed' },
  inProgress: { ar: 'قيد التنفيذ', en: 'In Progress' },
  overdue: { ar: 'متأخرة', en: 'Overdue' },
  recentTasks: { ar: 'أحدث المهام', en: 'Recent Tasks' },
  recentActivity: { ar: 'النشاط الأخير', en: 'Recent Activity' },
  quickActions: { ar: 'إجراءات سريعة', en: 'Quick Actions' },
  createTask: { ar: 'إنشاء مهمة', en: 'Create Task' },
  inviteMembers: { ar: 'دعوة أعضاء', en: 'Invite Members' },
  uploadFile: { ar: 'رفع ملف', en: 'Upload File' },
  createNote: { ar: 'إضافة ملاحظة', en: 'Create Note' },
  viewAll: { ar: 'عرض الكل', en: 'View All' },
  noTasks: { ar: 'لا توجد مهام', en: 'No tasks' },
  noActivity: { ar: 'لا يوجد نشاط حديث', en: 'No recent activity' },
  projectProgress: { ar: 'تقدم المشروع', en: 'Project Progress' },
  completionRate: { ar: 'معدل الإكمال', en: 'Completion Rate' },
  priorityBreakdown: { ar: 'تقسيم الأولويات', en: 'Priority Breakdown' },
  high: { ar: 'عالي', en: 'High' },
  medium: { ar: 'متوسط', en: 'Medium' },
  low: { ar: 'منخفض', en: 'Low' },
  urgent: { ar: 'عاجل', en: 'Urgent' },
};

export function ProjectOverviewTab({
  project,
  stats,
  initialTasks = [],
  initialActivity = [],
}: ProjectOverviewTabProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const dateLocale = isArabic ? ar : enUS;
  const projectPath = `/${locale}/projects/${project.id}`;

  const getStatValue = (key: string) => {
    if (!stats) return 0;
    switch (key) {
      case 'total': return stats.total_tasks;
      case 'completed': return stats.completed_count;
      case 'inProgress': return stats.in_progress_count + stats.review_count;
      case 'overdue': return stats.overdue_count;
      default: return 0;
    }
  };

  const completionRate = stats && stats.total_tasks > 0
    ? Math.round((stats.completed_count / stats.total_tasks) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Project Progress Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-primary">
                {labels.projectProgress[isArabic ? 'ar' : 'en']}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {labels.completionRate[isArabic ? 'ar' : 'en']}: {completionRate}%
              </p>
            </div>
            <div className="w-full lg:w-64">
              <Progress value={completionRate} className="h-3" />
            </div>
            <div className="text-3xl font-bold text-primary lg:hidden">
              {completionRate}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.key}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {labels[stat.labelKey]?.[isArabic ? 'ar' : 'en'] || stat.labelKey}
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {getStatValue(stat.key)}
                  </p>
                </div>
                <div className={cn('p-3 rounded-xl', stat.bgColor)}>
                  <stat.icon className={cn('h-6 w-6', stat.color)} />
                </div>
              </div>
              {stat.key === 'total' && stats && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{labels.completed[isArabic ? 'ar' : 'en']}</span>
                    <span>{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Priority Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Flag className="h-5 w-5" />
              {labels.priorityBreakdown[isArabic ? 'ar' : 'en']}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { key: 'urgent', count: stats.urgent_count, color: 'text-red-500', bgColor: 'bg-red-500/10', icon: Zap },
                { key: 'high', count: stats.high_count, color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: AlertTriangle },
                { key: 'medium', count: stats.high_count ? 0 : stats.total_tasks - stats.urgent_count - stats.high_count, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', icon: Flag },
                { key: 'low', count: 0, color: 'text-green-500', bgColor: 'bg-green-500/10', icon: Target },
              ].map((priority) => (
                <div key={priority.key} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={cn('p-2 rounded-lg', priority.bgColor)}>
                    <priority.icon className={cn('h-4 w-4', priority.color)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {labels[priority.key][isArabic ? 'ar' : 'en']}
                    </p>
                    <p className="text-xl font-bold">{priority.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions & Recent Tasks */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {labels.quickActions[isArabic ? 'ar' : 'en']}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" asChild className="w-full justify-start gap-2">
              <Link href={`${projectPath}/tasks/new`}>
                <Plus className="h-4 w-4" />
                {labels.createTask[isArabic ? 'ar' : 'en']}
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start gap-2">
              <Link href={`${projectPath}/team`}>
                <Users className="h-4 w-4" />
                {labels.inviteMembers[isArabic ? 'ar' : 'en']}
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start gap-2">
              <Link href={`${projectPath}/files`}>
                <FileText className="h-4 w-4" />
                {labels.uploadFile[isArabic ? 'ar' : 'en']}
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start gap-2">
              <Link href={`${projectPath}/notes/new`}>
                <Activity className="h-4 w-4" />
                {labels.createNote[isArabic ? 'ar' : 'en']}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {labels.recentTasks[isArabic ? 'ar' : 'en']}
            </CardTitle>
            <Link
              href={`${projectPath}/tasks`}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              {labels.viewAll[isArabic ? 'ar' : 'en']}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {initialTasks.length ? initialTasks.map((task) => (
                <Link key={task.id} href={`${projectPath}/tasks/${task.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {task.project?.name || ''}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {({
                      TODO: isArabic ? 'قيد الانتظار' : 'To Do',
                      IN_PROGRESS: isArabic ? 'قيد التنفيذ' : 'In Progress',
                      REVIEW: isArabic ? 'مراجعة' : 'Review',
                      BLOCKED: isArabic ? 'محظورة' : 'Blocked',
                      COMPLETED: isArabic ? 'مكتملة' : 'Completed',
                    })[task.status]}
                  </Badge>
                </Link>
              )) : (
                <div className="py-8 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p>{labels.noTasks[isArabic ? 'ar' : 'en']}</p>
                  <Link
                    href={`${projectPath}/tasks/new`}
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                  >
                    {isArabic ? 'أنشئ أول مهمة' : 'Create your first task'}
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {labels.recentActivity[isArabic ? 'ar' : 'en']}
          </CardTitle>
          <Link
            href={`${projectPath}/activity`}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            {labels.viewAll[isArabic ? 'ar' : 'en']}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {initialActivity.length ? (
            <div className="space-y-4">
              {initialActivity.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-semibold">
                        {entry.user?.full_name || (isArabic ? 'عضو الفريق' : 'A team member')}
                      </span>
                      <span className="text-muted-foreground">
                        {' '}
                        {({
                          PROJECT_CREATED: isArabic ? 'أنشأ المشروع' : 'created the project',
                          PROJECT_UPDATED: isArabic ? 'حدّث المشروع' : 'updated the project',
                          TASK_CREATED: isArabic ? 'أنشأ مهمة' : 'created a task',
                          TASK_UPDATED: isArabic ? 'حدّث مهمة' : 'updated a task',
                          TASK_STATUS_CHANGED: isArabic ? 'غيّر حالة مهمة' : 'changed a task status',
                          COMMENT_CREATED: isArabic ? 'أضاف تعليقًا' : 'added a comment',
                          FILE_UPLOADED: isArabic ? 'رفع ملفًا' : 'uploaded a file',
                          MEMBER_INVITED: isArabic ? 'دعا عضوًا' : 'invited a member',
                          MEMBER_JOINED: isArabic ? 'انضم عضو' : 'member joined',
                        } as Record<string, string>)[entry.action] || (isArabic ? 'سجّل نشاطًا' : 'recorded activity')}
                      </span>
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground" dateTime={entry.created_at}>
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: dateLocale })}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Activity className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p>{labels.noActivity[isArabic ? 'ar' : 'en']}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}