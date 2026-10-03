/**
 * KPI Cards Component
 * Displays key performance indicators for the dashboard
 */

'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

interface KPICardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray';
  className?: string;
}

const iconColors = {
  blue: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  green: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  orange: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  red: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  purple: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  gray: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30',
};

export function KPICard({
  label,
  value,
  icon,
  trend,
  color = 'blue',
  className,
}: KPICardProps) {
  const t = useTranslations('dashboard.kpis');
  
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            {t(label)}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground">
              {formatNumber(value)}
            </p>
            {trend && (
              <span
                className={`text-sm font-medium ${
                  trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {trend && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t(trend.label)}
            </p>
          )}
        </div>
        <div
          className={`p-3 rounded-xl shrink-0 ${iconColors[color]}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

interface KPICardsGridProps {
  kpis: {
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    archived_projects: number;
    total_tasks: number;
    in_progress_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
    team_members: number;
    total_files: number;
  };
  className?: string;
}

export function KPICardsGrid({ kpis, className }: KPICardsGridProps) {
  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 ${className}`}
      role="region"
      aria-label="Key Performance Indicators"
    >
      <KPICard
        label="totalProjects"
        value={kpis.total_projects}
        color="blue"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      />
      <KPICard
        label="activeProjects"
        value={kpis.active_projects}
        color="green"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <KPICard
        label="completedProjects"
        value={kpis.completed_projects}
        color="purple"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        }
      />
      <KPICard
        label="totalTasks"
        value={kpis.total_tasks}
        color="orange"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        }
      />
      <KPICard
        label="inProgressTasks"
        value={kpis.in_progress_tasks}
        color="blue"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <KPICard
        label="completedTasks"
        value={kpis.completed_tasks}
        color="green"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        }
      />
      <KPICard
        label="overdueTasks"
        value={kpis.overdue_tasks}
        color="red"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
      />
      <KPICard
        label="teamMembers"
        value={kpis.team_members}
        color="purple"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />
      <KPICard
        label="totalFiles"
        value={kpis.total_files}
        color="gray"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        }
      />
    </div>
  );
}