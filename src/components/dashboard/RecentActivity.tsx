/**
 * Recent Activity Timeline Component
 */

'use client';

import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface RecentActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  project?: {
    id: string;
    name: string;
    key: string;
  };
  metadata?: Record<string, unknown>;
}

interface RecentActivityProps {
  activities: RecentActivityItem[];
  className?: string;
  limit?: number;
}

function getActionLabel(action: string, t: ReturnType<typeof useTranslations>): string {
  const actionMap: Record<string, string> = {
    PROJECT_CREATED: 'activity.projectCreated',
    PROJECT_UPDATED: 'activity.projectUpdated',
    PROJECT_ARCHIVED: 'activity.projectArchived',
    PROJECT_DELETED: 'activity.projectDeleted',
    TASK_CREATED: 'activity.taskCreated',
    TASK_UPDATED: 'activity.taskUpdated',
    TASK_STATUS_CHANGED: 'activity.taskStatusChanged',
    TASK_ASSIGNED: 'activity.taskAssigned',
    TASK_PRIORITY_CHANGED: 'activity.taskPriorityChanged',
    TASK_DELETED: 'activity.taskDeleted',
    MEMBER_INVITED: 'activity.memberInvited',
    MEMBER_JOINED: 'activity.memberJoined',
    MEMBER_ROLE_CHANGED: 'activity.memberRoleChanged',
    MEMBER_REMOVED: 'activity.memberRemoved',
    FILE_UPLOADED: 'activity.fileUploaded',
    FILE_DOWNLOADED: 'activity.fileDownloaded',
    FILE_DELETED: 'activity.fileDeleted',
    NOTE_CREATED: 'activity.noteCreated',
    NOTE_UPDATED: 'activity.noteUpdated',
    NOTE_DELETED: 'activity.noteDeleted',
    COMMENT_CREATED: 'activity.commentCreated',
    COMMENT_UPDATED: 'activity.commentUpdated',
    COMMENT_DELETED: 'activity.commentDeleted',
  };
  
  return t(actionMap[action] || 'activity.unknown', { action });
}

function getEntityLabel(entityType: string, t: ReturnType<typeof useTranslations>): string {
  const entityMap: Record<string, string> = {
    project: 'entities.project',
    task: 'entities.task',
    member: 'entities.member',
    file: 'entities.file',
    note: 'entities.note',
    comment: 'entities.comment',
  };
  
  return t(entityMap[entityType] || 'entities.unknown', { entityType });
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

export function RecentActivity({ activities, className, limit = 10 }: RecentActivityProps) {
  const t = useTranslations('dashboard.recentActivity');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? ar : enUS;
  
  const displayActivities = activities.slice(0, limit);
  
  if (displayActivities.length === 0) {
    return (
      <div className={className}>
        <p className="text-center text-muted-foreground py-8">{t('noActivity')}</p>
      </div>
    );
  }
  
  return (
    <div className={className} role="list" aria-label={t('label')}>
      <div className="space-y-4">
        {displayActivities.map((activity, index) => (
          <div
            key={activity.id}
            className="flex gap-3"
            role="listitem"
          >
            {/* Timeline indicator */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className="w-2 h-2 rounded-full bg-primary"
                style={{
                  boxShadow: '0 0 0 3px var(--background)',
                }}
              />
              {index < displayActivities.length - 1 && (
                <div className="w-0.5 h-full bg-border mt-1 flex-1" />
              )}
            </div>
            
            {/* Activity content */}
            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {activity.user.avatar_url ? (
                    <img
                      src={activity.user.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {getInitials(activity.user.full_name)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.user.full_name || t('unknownUser')}</span>
                    {' '}
                    {getActionLabel(activity.action, t)}
                    {' '}
                    <span className="font-medium text-primary">
                      {getEntityLabel(activity.entity_type, t)}
                    </span>
                    {activity.project && (
                      <>
                        {' '}
                        {t('inProject')}
                        {' '}
                        <span className="font-medium text-primary">
                          {activity.project.name} ({activity.project.key})
                        </span>
                      </>
                    )}
                  </p>
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {JSON.stringify(activity.metadata)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}