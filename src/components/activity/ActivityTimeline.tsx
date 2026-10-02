/**
 * Activity Timeline Component
 * Displays activity logs in a chronological timeline
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Clock, User, Plus, Edit, Trash2, CheckCircle, AlertTriangle, FileText, Users, FolderOpen, MessageSquare } from 'lucide-react';
import { ActivityLogWithUser } from '@/lib/db/queries/activity';
import { cn } from '@/lib/utils';

interface ActivityTimelineProps {
  activities: ActivityLogWithUser[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const actionIcons: Record<string, React.ReactNode> = {
  PROJECT_CREATED: <Plus className="h-4 w-4 text-green-500" />,
  PROJECT_UPDATED: <Edit className="h-4 w-4 text-blue-500" />,
  PROJECT_ARCHIVED: <Archive className="h-4 w-4 text-orange-500" />,
  PROJECT_DELETED: <Trash2 className="h-4 w-4 text-red-500" />,
  TASK_CREATED: <Plus className="h-4 w-4 text-green-500" />,
  TASK_UPDATED: <Edit className="h-4 w-4 text-blue-500" />,
  TASK_STATUS_CHANGED: <CheckCircle className="h-4 w-4 text-purple-500" />,
  TASK_ASSIGNED: <User className="h-4 w-4 text-indigo-500" />,
  TASK_PRIORITY_CHANGED: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  TASK_DELETED: <Trash2 className="h-4 w-4 text-red-500" />,
  TASK_COMPLETED: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  MEMBER_INVITED: <UserPlus className="h-4 w-4 text-blue-500" />,
  MEMBER_JOINED: <UserCheck className="h-4 w-4 text-green-500" />,
  MEMBER_ROLE_CHANGED: <Edit className="h-4 w-4 text-blue-500" />,
  MEMBER_REMOVED: <UserMinus className="h-4 w-4 text-red-500" />,
  FILE_UPLOADED: <FileText className="h-4 w-4 text-blue-500" />,
  FILE_DOWNLOADED: <Download className="h-4 w-4 text-gray-500" />,
  FILE_DELETED: <Trash2 className="h-4 w-4 text-red-500" />,
  NOTE_CREATED: <FileText className="h-4 w-4 text-green-500" />,
  NOTE_UPDATED: <Edit className="h-4 w-4 text-blue-500" />,
  NOTE_DELETED: <Trash2 className="h-4 w-4 text-red-500" />,
  NOTE_PRIVACY_CHANGED: <Shield className="h-4 w-4 text-purple-500" />,
  COMMENT_CREATED: <MessageSquare className="h-4 w-4 text-indigo-500" />,
  COMMENT_UPDATED: <Edit className="h-4 w-4 text-blue-500" />,
  COMMENT_DELETED: <Trash2 className="h-4 w-4 text-red-500" />,
};

const actionLabels: Record<string, { en: string; ar: string }> = {
  PROJECT_CREATED: { en: 'created project', ar: 'أنشأ المشروع' },
  PROJECT_UPDATED: { en: 'updated project', ar: 'حدث المشروع' },
  PROJECT_ARCHIVED: { en: 'archived project', ar: 'أرشف المشروع' },
  PROJECT_DELETED: { en: 'deleted project', ar: 'حذف المشروع' },
  TASK_CREATED: { en: 'created task', ar: 'أنشأ مهمة' },
  TASK_UPDATED: { en: 'updated task', ar: 'حدث مهمة' },
  TASK_STATUS_CHANGED: { en: 'changed task status', ar: 'غير حالة المهمة' },
  TASK_ASSIGNED: { en: 'assigned task', ar: 'عين مهمة' },
  TASK_PRIORITY_CHANGED: { en: 'changed task priority', ar: 'غير أولوية المهمة' },
  TASK_DELETED: { en: 'deleted task', ar: 'حذف مهمة' },
  TASK_COMPLETED: { en: 'completed task', ar: 'أكمل مهمة' },
  MEMBER_INVITED: { en: 'invited member', ar: 'دعا عضو' },
  MEMBER_JOINED: { en: 'member joined', ar: 'انضم عضو' },
  MEMBER_ROLE_CHANGED: { en: 'changed member role', ar: 'غير دور العضو' },
  MEMBER_REMOVED: { en: 'removed member', ar: 'أزال عضو' },
  FILE_UPLOADED: { en: 'uploaded file', ar: 'رفع ملف' },
  FILE_DOWNLOADED: { en: 'downloaded file', ar: 'حمل ملف' },
  FILE_DELETED: { en: 'deleted file', ar: 'حذف ملف' },
  NOTE_CREATED: { en: 'created note', ar: 'أنشأ ملاحظة' },
  NOTE_UPDATED: { en: 'updated note', ar: 'حدث ملاحظة' },
  NOTE_DELETED: { en: 'deleted note', ar: 'حذف ملاحظة' },
  NOTE_PRIVACY_CHANGED: { en: 'changed note privacy', ar: 'غير خصوصية الملاحظة' },
  COMMENT_CREATED: { en: 'added comment', ar: 'أضاف تعليق' },
  COMMENT_UPDATED: { en: 'updated comment', ar: 'حدث تعليق' },
  COMMENT_DELETED: { en: 'deleted comment', ar: 'حذف تعليق' },
};

function formatAction(action: string, locale: string): string {
  const labels = actionLabels[action];
  if (labels) {
    return locale === 'ar' ? labels.ar : labels.en;
  }
  // Fallback: convert SNAKE_CASE to readable format
  return action.replace(/_/g, ' ').toLowerCase();
}

function getEntityLabel(entityType: string, locale: string): string {
  const labels: Record<string, { en: string; ar: string }> = {
    project: { en: 'Project', ar: 'مشروع' },
    task: { en: 'Task', ar: 'مهمة' },
    member: { en: 'Member', ar: 'عضو' },
    file: { en: 'File', ar: 'ملف' },
    note: { en: 'Note', ar: 'ملاحظة' },
    comment: { en: 'Comment', ar: 'تعليق' },
    user: { en: 'User', ar: 'مستخدم' },
  };
  const label = labels[entityType];
  return label ? (locale === 'ar' ? label.ar : label.en) : entityType;
}

function ActivityItem({ activity, locale }: { activity: ActivityLogWithUser; locale: string }) {
  const isArabic = locale === 'ar';
  const Icon = actionIcons[activity.action] || <Clock className="h-4 w-4 text-gray-500" />;
  const actionText = formatAction(activity.action, locale);
  const entityLabel = getEntityLabel(activity.entity_type, locale);
  const actorName = activity.user?.full_name || 'Unknown User';
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
    locale: isArabic ? ar : enUS,
  });

  return (
    <div className={cn('flex gap-3', isArabic ? 'flex-row-reverse' : 'flex-row')}>
      {/* Timeline line */}
      <div className="relative flex-shrink-0 w-8">
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />
        <div className={cn('relative flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border z-10', isArabic ? 'ml-auto' : 'mr-auto')}>
          {Icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0">
            {activity.user?.avatar_url && (
              <img
                src={activity.user.avatar_url}
                alt={actorName}
                className="h-8 w-8 rounded-full"
              />
            )}
            {!activity.user?.avatar_url && (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{actorName}</span>
              {' '}
              <span className="text-foreground/70">{actionText}</span>
              {' '}
              <span className="font-medium capitalize">{entityLabel}</span>
            </p>
            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {JSON.stringify(activity.metadata)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Missing icons - inline definitions
function Archive({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}
function UserPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
function UserCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="20 6 23 9 17 15" />
    </svg>
  );
}
function UserMinus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="11" x2="13" y2="11" />
    </svg>
  );
}
function Download({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function Shield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function ActivityTimeline({ activities, isLoading, hasMore, onLoadMore }: ActivityTimelineProps) {
  const locale = useLocale();

  if (isLoading && activities.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p>{locale === 'ar' ? 'لا توجد أنشطة مسجلة' : 'No activity recorded yet'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} locale={locale} />
      ))}

      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          className="w-full py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors border-t"
          disabled={isLoading}
        >
          {isLoading
            ? locale === 'ar'
              ? 'جاري التحميل...'
              : 'Loading...'
            : locale === 'ar'
              ? 'عرض المزيد'
              : 'Load more'}
        </button>
      )}
    </div>
  );
}