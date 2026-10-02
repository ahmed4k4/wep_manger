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
  Kanban,
  ClipboardList,
  FileText,
  TrendingUp,
  Activity,
} from 'lucide-react';
import type { Project, ProjectStats } from '@/types/project';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface ProjectOverviewContentProps {
  project: Project;
  stats?: ProjectStats | null;
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

export function ProjectOverviewContent({ project, stats }: ProjectOverviewContentProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';

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
            <Link href={`/projects/${project.id}/tasks/new`}>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                {labels.createTask[isArabic ? 'ar' : 'en']}
              </Button>
            </Link>
            <Link href={`/projects/${project.id}/members`}>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                {labels.inviteMembers[isArabic ? 'ar' : 'en']}
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => {}}>
              <FileText className="h-4 w-4" />
              {labels.uploadFile[isArabic ? 'ar' : 'en']}
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => {}}>
              <Activity className="h-4 w-4" />
              {labels.createNote[isArabic ? 'ar' : 'en']}
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
              href={`/projects/${project.id}/tasks`}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              {labels.viewAll[isArabic ? 'ar' : 'en']}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Mock recent tasks - replace with real data */}
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{labels.noTasks[isArabic ? 'ar' : 'en']}</p>
                <Link href={`/projects/${project.id}/tasks/new`} className="text-primary hover:underline mt-2 inline-block">
                  {isArabic ? 'إنشاء أول مهمة' : 'Create your first task'}
                </Link>
              </div>
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
            href={`/projects/${project.id}/activity`}
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            {labels.viewAll[isArabic ? 'ar' : 'en']}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{labels.noActivity[isArabic ? 'ar' : 'en']}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}