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
import { Users, CheckCircle, Clock, AlertTriangle, MoreHorizontal } from 'lucide-react';
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
  locale = 'en',
}: ProjectCardPropsExtended) {
  const nextIntlLocale = useLocale();
  const currentLocale = locale || nextIntlLocale;
  const dateLocale = currentLocale === 'ar' ? ar : enUS;

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    ARCHIVED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    ON_HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  const getProgress = () => {
    if (!project.task_stats) return 0;
    const { total, completed } = project.task_stats;
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const progress = getProgress();

  return (
    <Card
      className={cn(
        'group transition-all duration-200 hover:shadow-lg',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-lg font-semibold">
                {project.name}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs px-2 py-0.5',
                  statusColors[project.status] || statusColors.ACTIVE
                )}
              >
                {project.status}
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
                className="p-1 rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                aria-label={currentLocale === 'ar' ? 'خيارات المشروع' : 'Project options'}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}`}>
                  {currentLocale === 'ar' ? 'عرض المشروع' : 'View Project'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}/overview`}>
                  {currentLocale === 'ar' ? 'نظرة عامة' : 'Overview'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}/members`}>
                  {currentLocale === 'ar' ? 'الأعضاء' : 'Members'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}/settings`}>
                  {currentLocale === 'ar' ? 'الإعدادات' : 'Settings'}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm(currentLocale === 'ar' ? 'هل أنت متأكد من أرشفة هذا المشروع؟' : 'Are you sure you want to archive this project?')) {
                    // TODO: Call delete action
                  }
                }}
              >
                {currentLocale === 'ar' ? 'أرشفة' : 'Archive'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {project.task_stats && project.task_stats.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {currentLocale === 'ar' ? 'التقدم' : 'Progress'}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
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