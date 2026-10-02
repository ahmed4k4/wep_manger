/**
 * Project Sidebar Navigation
 * Client component for project navigation
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Settings,
  Kanban,
  FileText,
  MessageSquare,
  FolderOpen,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Project } from '@/types/project';

interface ProjectSidebarProps {
  project: Project;
}

const navigationItems = [
  {
    key: 'overview',
    labelKey: 'overview',
    href: '/overview',
    icon: LayoutDashboard,
  },
  {
    key: 'board',
    labelKey: 'board',
    href: '/board',
    icon: Kanban,
  },
  {
    key: 'tasks',
    labelKey: 'tasks',
    href: '/tasks',
    icon: ClipboardList,
  },
  {
    key: 'members',
    labelKey: 'members',
    href: '/members',
    icon: Users,
  },
  {
    key: 'files',
    labelKey: 'files',
    href: '/files',
    icon: FolderOpen,
  },
  {
    key: 'notes',
    labelKey: 'notes',
    href: '/notes',
    icon: FileText,
  },
  {
    key: 'activity',
    labelKey: 'activity',
    href: '/activity',
    icon: MessageSquare,
  },
  {
    key: 'settings',
    labelKey: 'settings',
    href: '/settings',
    icon: Settings,
  },
] as const;

const labels: Record<string, { ar: string; en: string }> = {
  overview: { ar: 'نظرة عامة', en: 'Overview' },
  board: { ar: 'لوحة المهام', en: 'Board' },
  tasks: { ar: 'المهام', en: 'Tasks' },
  members: { ar: 'الأعضاء', en: 'Members' },
  files: { ar: 'الملفات', en: 'Files' },
  notes: { ar: 'الملاحظات', en: 'Notes' },
  activity: { ar: 'النشاط', en: 'Activity' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
};

export function ProjectSidebar({ project }: ProjectSidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const isArabic = locale === 'ar';

  return (
    <nav className="space-y-1" aria-label="Project navigation">
      <div className="px-3 py-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isArabic ? 'المشروع' : 'Project'}
        </h3>
      </div>

      {navigationItems.map((item) => {
        const isActive = pathname === `/projects/${project.id}${item.href}` ||
          (item.href !== '/overview' && pathname.startsWith(`/projects/${project.id}${item.href}`));

        const label = labels[item.labelKey]?.[isArabic ? 'ar' : 'en'] || item.labelKey;

        return (
          <Link
            key={item.key}
            href={`/projects/${project.id}${item.href}`}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}

      <Separator className="my-4" />

      <div className="px-3 py-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isArabic ? 'معلومات المشروع' : 'Project Info'}
        </h3>
      </div>

      <div className="px-3 space-y-1">
        <ProjectInfoItem
          label={isArabic ? 'المفتاح' : 'Key'}
          value={project.key}
          iconClass="font-mono text-primary"
        />
        <ProjectInfoItem
          label={isArabic ? 'الحالة' : 'Status'}
          value={
            <span
              className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                project.status === 'ACTIVE' &&
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                project.status === 'ARCHIVED' &&
                  'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
                project.status === 'ON_HOLD' &&
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              )}
            >
              {project.status}
            </span>
          }
        />
        <ProjectInfoItem
          label={isArabic ? 'تاريخ الإنشاء' : 'Created'}
          value={new Date(project.created_at).toLocaleDateString(locale)}
        />
      </div>
    </nav>
  );
}

function ProjectInfoItem({
  label,
  value,
  iconClass,
}: {
  label: string;
  value: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', iconClass)}>{value}</span>
    </div>
  );
}