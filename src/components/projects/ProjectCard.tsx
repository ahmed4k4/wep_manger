/**
 * Project Card Component
 * Display project summary in a card layout
 */

'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ProjectCardProps } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectCardPropsExtended extends ProjectCardProps {
  locale?: 'ar' | 'en';
}

export function ProjectCard({
  project,
  onClick,
  locale,
}: ProjectCardPropsExtended) {
  const nextIntlLocale = useLocale();
  const currentLocale = locale || nextIntlLocale;
  const isArabic = currentLocale === 'ar';
  const dateLocale = currentLocale === 'ar' ? ar : enUS;
  const projectPath = `/${currentLocale}/projects/${project.id}`;

  const statusColors: Record<string, string> = {
    ACTIVE: 'project-status-active',
    ARCHIVED: 'project-status-archived',
    ON_HOLD: 'project-status-hold',
  };

  const getProgress = () => {
    if (!project.task_stats) return 0;
    const { total, completed } = project.task_stats;
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const progress = getProgress();

  return (
    <Card className={cn('project-card group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg', onClick && 'cursor-pointer')} onClick={onClick}>
      <CardHeader className="project-card-header">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-base font-semibold">
                <Link className="project-title-link" href={`${projectPath}/overview`}>
                  {project.name}<ArrowUpRight size={14} className="project-title-arrow" />
                </Link>
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs px-2 py-0.5',
                  statusColors[project.status] || statusColors.ACTIVE
                )}
              >
                {project.status === 'ACTIVE' ? (isArabic ? 'نشط' : 'Active') : project.status === 'ON_HOLD' ? (isArabic ? 'متوقف مؤقتًا' : 'On hold') : (isArabic ? 'مؤرشف' : 'Archived')}
              </Badge>
            </div>
            <CardDescription className="text-sm mt-1 line-clamp-2">
              {project.description || (currentLocale === 'ar' ? 'لا يوجد وصف' : 'No description')}
            </CardDescription>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="font-mono text-primary">{project.key}</span>
              </span>
              {project.task_stats && (
                <>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    {project.task_stats.completed}/{project.task_stats.total}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {project.member_count || 0}
                  </span>
                </>
              )}
            </div>
          </div>
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <button
                className="project-menu-trigger p-1 rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={currentLocale === 'ar' ? 'خيارات المشروع' : 'Project options'}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                  <Link href={`${projectPath}/overview`}>
                  {currentLocale === 'ar' ? 'عرض المشروع' : 'View Project'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                  <Link href={`${projectPath}/overview`}>
                  {currentLocale === 'ar' ? 'نظرة عامة' : 'Overview'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                  <Link href={`${projectPath}/members`}>
                  {currentLocale === 'ar' ? 'الأعضاء' : 'Members'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                  <Link href={`${projectPath}/settings`}>
                  {currentLocale === 'ar' ? 'الإعدادات' : 'Settings'}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="project-card-content">
        {project.task_stats && project.task_stats.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {currentLocale === 'ar' ? 'التقدم' : 'Progress'}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="project-progress-track">
              <div
                className="project-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {currentLocale === 'ar' ? 'تم التحديث' : 'Updated'}
            {' '}
            {formatDistanceToNow(new Date(project.updated_at), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
