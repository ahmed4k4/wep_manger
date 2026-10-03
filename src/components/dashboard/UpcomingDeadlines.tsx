/**
 * Upcoming Deadlines Component
 */

'use client';

import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/card';

interface UpcomingDeadline {
  id: string;
  title: string;
  due_date: string;
  type: 'task' | 'project';
  project_id: string;
  project_name: string;
  project_key: string;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface UpcomingDeadlinesProps {
  deadlines: UpcomingDeadline[];
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

function getDaysUntil(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function UpcomingDeadlines({ deadlines, className, limit = 10, title }: UpcomingDeadlinesProps) {
  const t = useTranslations('dashboard.upcomingDeadlines');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;
  
  const displayDeadlines = deadlines.slice(0, limit);
  
  if (displayDeadlines.length === 0) {
    return (
      <Card className={className}>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">{t('noDeadlines')}</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title || t('title')}</h3>
        {deadlines.length > limit && (
          <span className="text-sm text-muted-foreground">
            {t('showingOf', { showing: limit, total: deadlines.length })}
          </span>
        )}
      </div>
      <div className="divide-y">
        {displayDeadlines.map((deadline, index) => (
          <div
            key={deadline.id}
            className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
          >
            {/* Type indicator */}
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                deadline.type === 'task'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
              }`}
            >
              {deadline.type === 'task' ? (
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
                <p className="font-medium text-foreground truncate">{deadline.title}</p>
                <span className="font-mono text-xs px-2 py-0.5 bg-muted rounded shrink-0">
                  {deadline.project_key}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-1">
                {deadline.project_name}
              </p>
            </div>
            
            {/* Due date */}
            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-foreground">
                {format(new Date(deadline.due_date), 'MMM d, yyyy', { locale: dateLocale })}
              </p>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const days = getDaysUntil(deadline.due_date);
                  if (days === 0) return t('today');
                  if (days === 1) return t('tomorrow');
                  return t('inDays', { days });
                })()}
              </p>
            </div>
            
            {/* Assignee */}
            {deadline.assignee && (
              <div className="shrink-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                  {deadline.assignee.avatar_url ? (
                    <img src={deadline.assignee.avatar_url} alt="" className="w-full h-full rounded-full" />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {getInitials(deadline.assignee.full_name)}
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