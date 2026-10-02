/**
 * Tasks Header Component
 * Displays project name and tasks title with RTL support
 */

'use client';

import { useLocale } from 'next-intl';

interface TasksHeaderProps {
  project: {
    name: string;
  };
}

export function TasksHeader({ project }: TasksHeaderProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  return (
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
      <div>
        <h1 className="text-2xl font-bold">
          {isArabic ? 'المهام' : 'Tasks'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isArabic ? 'إدارة وتتبع مهام المشروع' : 'Manage and track project tasks'}
        </p>
      </div>
    </div>
  );
}
