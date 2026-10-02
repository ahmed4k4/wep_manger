'use client';

/**
 * Notification Item Component
 * Individual notification display for dropdown and list
 */

import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { ExternalLink, FileText, Users, AlertTriangle, Bell } from 'lucide-react';
import type { NotificationWithRelations } from '@/lib/db/queries/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface NotificationItemProps {
  notification: NotificationWithRelations;
  formatTime: (dateString: string) => string;
  onClick?: () => void;
  compact?: boolean;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  TASK_ASSIGNED: FileText,
  TASK_UPDATED: FileText,
  TASK_STATUS_CHANGED: AlertTriangle,
  TASK_COMMENT: Bell,
  MEMBER_ADDED: Users,
  MEMBER_ROLE_CHANGED: Users,
  FILE_UPLOADED: FileText,
  PROJECT_INVITE: Users,
  PROJECT_UPDATED: FileText,
  NOTE_CREATED: FileText,
  NOTE_COMMENT: Bell,
  NOTE_MENTION: Bell,
  TASK_DUE_SOON: AlertTriangle,
  TASK_OVERDUE: AlertTriangle,
  SYSTEM_ALERT: AlertTriangle,
  MENTION: Bell,
};

const typeColors: Record<string, string> = {
  TASK_ASSIGNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  TASK_UPDATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  TASK_STATUS_CHANGED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  TASK_COMMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  MEMBER_ADDED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  MEMBER_ROLE_CHANGED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  FILE_UPLOADED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  PROJECT_INVITE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  PROJECT_UPDATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  NOTE_CREATED: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  NOTE_COMMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  NOTE_MENTION: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  TASK_DUE_SOON: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  TASK_OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  SYSTEM_ALERT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  MENTION: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

export function NotificationItem({ notification, formatTime, onClick, compact = false }: NotificationItemProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const isUnread = !notification.read_at;
  const Icon = typeIcons[notification.type] || Bell;
  const bgColor = typeColors[notification.type] || 'bg-gray-100 text-gray-700';

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
    // Navigate to action URL if present
    if (notification.action_url) {
      e.preventDefault();
      window.location.href = notification.action_url;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      TASK_ASSIGNED: { en: 'Task Assigned', ar: 'مهمة مُسندة' },
      TASK_UPDATED: { en: 'Task Updated', ar: 'مهمة مُحدثة' },
      TASK_STATUS_CHANGED: { en: 'Status Changed', ar: 'تم تغيير الحالة' },
      TASK_COMMENT: { en: 'New Comment', ar: 'تعليق جديد' },
      MEMBER_ADDED: { en: 'Member Added', ar: 'تم إضافة عضو' },
      MEMBER_ROLE_CHANGED: { en: 'Role Changed', ar: 'تم تغيير الدور' },
      FILE_UPLOADED: { en: 'File Uploaded', ar: 'تم رفع ملف' },
      PROJECT_INVITE: { en: 'Project Invite', ar: 'دعوة مشروع' },
      PROJECT_UPDATED: { en: 'Project Updated', ar: 'مشروع مُحدث' },
      NOTE_CREATED: { en: 'Note Created', ar: 'تم إنشاء ملاحظة' },
      NOTE_COMMENT: { en: 'Note Comment', ar: 'تعليق على ملاحظة' },
      NOTE_MENTION: { en: 'Note Mention', ar: 'منشور في ملاحظة' },
      TASK_DUE_SOON: { en: 'Due Soon', ar: 'قريب من الاستحقاق' },
      TASK_OVERDUE: { en: 'Overdue', ar: 'متأخر' },
      SYSTEM_ALERT: { en: 'System Alert', ar: 'تنبيه النظام' },
      MENTION: { en: 'Mention', ar: 'منشور' },
    };
    return labels[type]?.[isArabic ? 'ar' : 'en'] || type;
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full text-left p-3 transition-colors hover:bg-accent',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isUnread && 'bg-accent/50',
        compact && 'py-2'
      )}
      style={{ direction: isArabic ? 'rtl' : 'ltr' }}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', bgColor)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <p className={cn('font-medium text-sm truncate', isUnread && 'font-semibold')}>
                {notification.title}
              </p>
              {notification.project && (
                <span className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-muted rounded text-muted-foreground">
                  {notification.project.key}
                </span>
              )}
            </div>
            <span className={cn('flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap')}>
              {formatTime(notification.created_at)}
            </span>
          </div>

          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className={cn('text-xs px-2 py-0.5 rounded-full', bgColor)}>
              {getTypeLabel(notification.type)}
            </span>
            {notification.action_label && notification.action_url && (
              <span className="text-xs text-primary hover:underline cursor-pointer">
                {notification.action_label}
                <ExternalLink className="h-3 w-3 ml-1 inline" />
              </span>
            )}
          </div>
        </div>

        {/* Unread indicator */}
        {isUnread && !compact && (
          <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
        )}
      </div>
    </button>
  );
}