/**
 * Overdue Items Section Component
 */

'use client';

import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/card';

interface OverdueItem {
  id: string;
  title: string;
  due_date: string;
  type: 'task' | 'project';
  project_id: string;
  project_name: string;
  project_key: string;
  days_overdue: number;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface OverdueSectionProps {
  items: OverdueItem[];
  className?: string;
  limit?: number;
  title?: string;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getOverdueText(days: number, t: ReturnType<typeof useTranslations>): string {
  if (days === 1) return t('oneDayAgo');
  if (days < 7) return t('daysAgo', { days });
  if (days < 30) return t('weeksAgo', { weeks: Math.floor(days / 7) });
  return t('monthsAgo', { months: Math.floor(days / 30) });
}

export function OverdueSection({ items, className, limit = 10, title }: OverdueSectionProps) {
  const t = useTranslations('dashboard.overdue');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;
  
  const displayItems = items.slice(0, limit);
  
  if (displayItems.length === 0) {
    return (
      <Card className={className}>
        <div className="p-6 text-center">
          <svg className="w-12 h-12 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium text-foreground">{t('allCaughtUp')}</p>
          <p className="text-muted-foreground mt-1">{t('noOverdueItems')}</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {title || t('title')}
        </h3>
        {items.length > limit && (
          <span className="text-sm text-muted-foreground">
            {t('showingOf', { showing: limit, total: items.length })}
          </span>
        )}
      </div>
      <div className="divide-y">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="p-4 flex items-center gap-4 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            {/* Type indicator with red accent */}
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                item.type === 'task'
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
              }`}
            >
              {item.type === 'task' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-foreground truncate">{item.title}</p>
                <span className="font-mono text-xs px-2 py-0.5 bg-muted rounded shrink-0">
                  {item.project_key}
                </span>
                <span
                  className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full shrink-0"
                >
                  {t('overdue', { days: item.days_overdue })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-1">
                {item.project_name}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {getOverdueText(item.days_overdue, t)}
              </p>
            </div>
            
            {/* Due date */}
            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-foreground">
                {format(new Date(item.due_date), 'MMM d, yyyy', { locale: dateLocale })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('wasDue')}
              </p>
            </div>
            
            {/* Assignee */}
            {item.assignee && (
              <div className="shrink-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                  {item.assignee.avatar_url ? (
                    <img src={item.assignee.avatar_url} alt="" className="w-full h-full rounded-full" />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {getInitials(item.assignee.full_name)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}