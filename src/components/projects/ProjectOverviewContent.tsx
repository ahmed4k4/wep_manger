/**
 * Project Overview Content
 * Client component with interactive dashboard widgets
 */

'use client';

import { useLocale } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import type { Project, ProjectStats } from '@/types/project';
import type { TaskWithRelations } from '@/lib/db/queries/tasks';
import type { ActivityLogWithUser } from '@/lib/db/queries/activity';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ProjectOverviewContentProps {
  project: Project;
  stats?: ProjectStats | null;
  tasks: TaskWithRelations[];
  activity: ActivityLogWithUser[];
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
  viewAll: { ar: 'عرض الكل', en: 'View All' },
  noTasks: { ar: 'لا توجد مهام', en: 'No tasks' },
  noActivity: { ar: 'لا يوجد نشاط حديث', en: 'No recent activity' },
  quickActions: { ar: 'إجراءات سريعة', en: 'Quick Actions' },
  createTask: { ar: 'إنشاء مهمة', en: 'Create Task' },
  inviteMembers: { ar: 'دعوة أعضاء', en: 'Invite Members' },
  uploadFile: { ar: 'رفع ملف', en: 'Upload File' },
  createNote: { ar: 'إضافة ملاحظة', en: 'Create Note' },
};

export function ProjectOverviewContent({ project, stats, tasks, activity }: ProjectOverviewContentProps) {
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

  return (
    <div className="space-y-6">
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
                <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{
                      width: stats.total_tasks > 0
                        ? `${(stats.completed_count / stats.total_tasks) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
              <Link href={`${projectPath}/tasks`}>
                <Plus className="h-4 w-4" />
                {labels.createTask[isArabic ? 'ar' : 'en']}
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start gap-2">
              <Link href={`${projectPath}/members`}>
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
            <Button variant="outline" className="w-full justify-start gap-2" disabled title={isArabic ? 'ميزة الملاحظات غير متاحة بعد' : 'Notes are not available yet'}>
              <Activity className="h-4 w-4" />
              {isArabic ? 'الملاحظات — قريبًا' : 'Notes — coming soon'}
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
              {tasks.length ? tasks.map((task) => (
                <Link key={task.id} href={`${projectPath}/tasks`} className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
                  <span className="min-w-0 truncate text-sm font-medium">{task.title}</span>
                  <Badge variant="secondary" className="shrink-0 text-xs">{({ TODO: isArabic ? 'قيد الانتظار' : 'To do', IN_PROGRESS: isArabic ? 'قيد التنفيذ' : 'In progress', REVIEW: isArabic ? 'مراجعة' : 'Review', BLOCKED: isArabic ? 'محظورة' : 'Blocked', COMPLETED: isArabic ? 'مكتملة' : 'Completed' })[task.status]}</Badge>
                </Link>
              )) : <div className="py-8 text-center text-muted-foreground"><ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>{labels.noTasks[isArabic ? 'ar' : 'en']}</p><Link href={`${projectPath}/tasks/new`} className="mt-2 inline-block text-sm text-primary hover:underline">{isArabic ? 'أنشئ أول مهمة' : 'Create your first task'}</Link></div>}
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
          {activity.length ? <div className="space-y-4">{activity.map((entry) => <div key={entry.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm"><span className="font-semibold">{entry.user?.full_name || (isArabic ? 'عضو الفريق' : 'A team member')}</span><span className="text-muted-foreground"> {({ PROJECT_CREATED: isArabic ? 'أنشأ المشروع' : 'created the project', PROJECT_UPDATED: isArabic ? 'حدّث المشروع' : 'updated the project', TASK_CREATED: isArabic ? 'أنشأ مهمة' : 'created a task', TASK_UPDATED: isArabic ? 'حدّث مهمة' : 'updated a task', TASK_STATUS_CHANGED: isArabic ? 'غيّر حالة مهمة' : 'changed a task status', COMMENT_CREATED: isArabic ? 'أضاف تعليقًا' : 'added a comment', FILE_UPLOADED: isArabic ? 'رفع ملفًا' : 'uploaded a file' } as Record<string,string>)[entry.action] || (isArabic ? 'سجّل نشاطًا' : 'recorded activity')}</span></p></div><time className="shrink-0 text-xs text-muted-foreground" dateTime={entry.created_at}>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: dateLocale })}</time></div>)}</div> : <div className="py-8 text-center text-muted-foreground"><Activity className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>{labels.noActivity[isArabic ? 'ar' : 'en']}</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
