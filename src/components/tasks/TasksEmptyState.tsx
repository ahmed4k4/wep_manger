/**
 * Tasks Empty State
 */

'use client';

import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle, Search, FilterX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

interface TasksEmptyStateProps {
  projectId: string;
  hasFilters?: boolean;
}

export function TasksEmptyState({ projectId, hasFilters = false }: TasksEmptyStateProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();

  const clearFilters = () => {
    router.push(`/projects/${projectId}/tasks`);
  };

  if (hasFilters) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">
          {isArabic ? 'لا توجد مهام مطابقة' : 'No matching tasks'}
        </h3>
        <p className="text-muted-foreground mb-6">
          {isArabic
            ? 'حاول تعديل الفلاتر أو البحث للعثور على مهام.'
            : 'Try adjusting your filters or search to find tasks.'}
        </p>
        <Button variant="outline" onClick={clearFilters} className="gap-2">
          <FilterX className="h-4 w-4" />
          {isArabic ? 'مسح الفلاتر' : 'Clear Filters'}
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">
        {isArabic ? 'لا توجد مهام بعد' : 'No tasks yet'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        {isArabic
          ? 'ابدأ بإنشاء أول مهمة لتنظيم عملك وتتبع التقدم.'
          : 'Get started by creating your first task to organize work and track progress.'}
      </p>
      <Button
        onClick={() => router.push(`/projects/${projectId}/tasks/new`)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        {isArabic ? 'إنشاء مهمة جديدة' : 'Create Task'}
      </Button>
    </div>
  );
}