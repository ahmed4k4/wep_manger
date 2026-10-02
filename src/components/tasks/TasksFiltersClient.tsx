/**
 * Tasks Filters Client Component
 * Handles filter UI with URL state management
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Filter, X } from 'lucide-react';
import type { TaskStatus, TaskPriority } from '@/types/project';

interface TasksFiltersClientProps {
  projectId: string;
  memberIds?: string[];
}

export function TasksFiltersClient({ projectId, memberIds = [] }: TasksFiltersClientProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();

  type LocalTaskFilters = {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee_id?: string;
    search?: string;
    overdue?: boolean;
    due_soon_days?: number;
    sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'progress' | 'position';
    sort_order?: 'asc' | 'desc';
  };

  const [filters, setFilters] = useState<LocalTaskFilters>({
    status: (searchParams.get('status') as TaskStatus) || undefined,
    priority: (searchParams.get('priority') as TaskPriority) || undefined,
    search: searchParams.get('search') || undefined,
    overdue: searchParams.get('overdue') === 'true',
    due_soon_days: searchParams.get('due_soon_days') ? parseInt(searchParams.get('due_soon_days')!) : undefined,
    sort_by: (searchParams.get('sort_by') as LocalTaskFilters['sort_by']) || 'position',
    sort_order: (searchParams.get('sort_order') as LocalTaskFilters['sort_order']) || 'asc',
  });

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  const updateFilter = (key: keyof LocalTaskFilters, value: LocalTaskFilters[keyof LocalTaskFilters]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset pagination
    router.push(`/projects/${projectId}/tasks?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({});
    router.push(`/projects/${projectId}/tasks`);
  };

  const statusOptions: { value: TaskStatus; label: { ar: string; en: string } }[] = [
    { value: 'TODO', label: { ar: 'قيد الانتظار', en: 'To Do' } },
    { value: 'IN_PROGRESS', label: { ar: 'قيد التنفيذ', en: 'In Progress' } },
    { value: 'REVIEW', label: { ar: 'قيد المراجعة', en: 'Review' } },
    { value: 'BLOCKED', label: { ar: 'محظور', en: 'Blocked' } },
    { value: 'COMPLETED', label: { ar: 'مكتمل', en: 'Completed' } },
  ];

  const priorityOptions: { value: TaskPriority; label: { ar: string; en: string } }[] = [
    { value: 'LOW', label: { ar: 'منخفض', en: 'Low' } },
    { value: 'MEDIUM', label: { ar: 'متوسط', en: 'Medium' } },
    { value: 'HIGH', label: { ar: 'عالي', en: 'High' } },
    { value: 'URGENT', label: { ar: 'عاجل', en: 'Urgent' } },
  ];

  const sortOptions = [
    { value: 'position', label: { ar: 'الترتيب', en: 'Position' } },
    { value: 'created_at', label: { ar: 'تاريخ الإنشاء', en: 'Created' } },
    { value: 'updated_at', label: { ar: 'آخر تحديث', en: 'Updated' } },
    { value: 'due_date', label: { ar: 'تاريخ الاستحقاق', en: 'Due Date' } },
    { value: 'priority', label: { ar: 'الأولوية', en: 'Priority' } },
    { value: 'progress', label: { ar: 'التقدم', en: 'Progress' } },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card border rounded-lg">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Input
          placeholder={isArabic ? 'البحث في المهام...' : 'Search tasks...'}
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value || undefined)}
          className="pl-9"
        />
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Status Filter */}
      <Select value={filters.status || ''} onValueChange={(v) => updateFilter('status', v || undefined)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={isArabic ? 'الحالة' : 'Status'} />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label[isArabic ? 'ar' : 'en']}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select value={filters.priority || ''} onValueChange={(v) => updateFilter('priority', v || undefined)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={isArabic ? 'الأولوية' : 'Priority'} />
        </SelectTrigger>
        <SelectContent>
          {priorityOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label[isArabic ? 'ar' : 'en']}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={filters.sort_by!} onValueChange={(v) => updateFilter('sort_by', v as LocalTaskFilters['sort_by'])} >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={isArabic ? 'ترتيب حسب' : 'Sort by'} />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label[isArabic ? 'ar' : 'en']}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.sort_order!} onValueChange={(v) => updateFilter('sort_order', v as LocalTaskFilters['sort_order'])} >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder={isArabic ? 'اتجاه' : 'Order'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">{isArabic ? 'تصاعدي' : 'Ascending'}</SelectItem>
          <SelectItem value="desc">{isArabic ? 'تنازلي' : 'Descending'}</SelectItem>
        </SelectContent>
      </Select>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 border-l pl-4">
        <Button
          variant={filters.overdue ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilter('overdue', !filters.overdue)}
          className={cn(filters.overdue && 'bg-destructive/10 text-destructive border-destructive/50')}
        >
          {isArabic ? 'متأخرة' : 'Overdue'}
        </Button>
        <Button
          variant={filters.due_soon_days ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilter('due_soon_days', filters.due_soon_days ? undefined : 3)}
          className={cn(filters.due_soon_days && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-500/50')}
        >
          {isArabic ? 'قريباً' : 'Due Soon'}
        </Button>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
          <X className="mr-1 h-3 w-3" />
          {isArabic ? 'مسح الفلاتر' : 'Clear Filters'}
        </Button>
      )}
    </div>
  );
}