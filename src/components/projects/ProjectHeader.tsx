/**
 * Project Header
 * Displays project title, key, status, and actions
 */

'use client';

import { MoreHorizontal, Archive, Users, CheckCircle, Clock } from 'lucide-react';
import { useLocale } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { deleteProjectAction } from '@/app/actions/projects';
import type { Project, ProjectStats } from '@/types/project';

interface ProjectHeaderProps {
  project: Project;
  stats?: ProjectStats | null;
}

export function ProjectHeader({ project, stats }: ProjectHeaderProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const dateLocale = isArabic ? ar : enUS;
  const [pending, startTransition] = useTransition();
  const projectPath = `/${locale}/projects/${project.id}`;

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    ARCHIVED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    ON_HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-3">
              <h1 className="text-2xl font-bold truncate">{project.name}</h1>
              <Badge
                variant="outline"
                className={cn(
                  'text-sm px-3 py-1',
                  statusColors[project.status] || statusColors.ACTIVE
                )}
              >
                {project.status}
              </Badge>
              <span className="font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                {project.key}
              </span>
            </div>
            {project.description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                {project.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {stats && (
                <>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {stats.completed_count}/{stats.total_tasks} {isArabic ? 'مكتملة' : 'completed'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {stats.member_count} {isArabic ? 'أعضاء' : 'members'}
                  </span>
                </>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {isArabic ? 'تم التحديث' : 'Updated'}
                {' '}
                {formatDistanceToNow(new Date(project.updated_at), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={isArabic ? 'خيارات' : 'Options'}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <a href={`${projectPath}/settings`}>
                    {isArabic ? 'الإعدادات' : 'Settings'}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`${projectPath}/members`}>
                    {isArabic ? 'إدارة الأعضاء' : 'Manage Members'}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={pending} className="text-destructive" onClick={() => {
                  if (confirm(isArabic ? 'هل أنت متأكد من أرشفة هذا المشروع؟' : 'Are you sure you want to archive this project?')) {
                    startTransition(async () => {
                      const result = await deleteProjectAction(project.id);
                      if (!result.success) toast.error(result.error || (isArabic ? 'تعذرت أرشفة المشروع' : 'Could not archive project'));
                    });
                  }
                }}>
                  <Archive className="mr-2 h-4 w-4" />
                  {isArabic ? 'أرشفة المشروع' : 'Archive Project'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
