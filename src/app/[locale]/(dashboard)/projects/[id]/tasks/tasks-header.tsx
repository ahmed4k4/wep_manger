/**
 * Tasks Header Component
 * Displays project name and tasks title with RTL support
 */

'use client';

import { useLocale } from 'next-intl';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface TasksHeaderProps {
  project: {
    name: string;
  };
}

export function TasksHeader({ project }: TasksHeaderProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  return (
    <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="text-2xl font-bold">
          {project.name} - {isArabic ? 'المهام' : 'Tasks'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isArabic ? 'إدارة وتتبع مهام المشروع' : 'Manage and track project tasks'}
        </p>
      </div>
      <ThemeSwitcher />
    </div>
  );
}
