/**
 * Project Activity Tab
 * Timeline of project activity with filtering
 */

'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Filter, MoreHorizontal, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/project';
import type { ActivityLogWithUser } from '@/lib/db/queries/activity';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ProjectActivityTabProps {
  projectId: string;
  project: Project;
  initialActivity?: ActivityLogWithUser[];
}

const labels = {
  activity: { ar: 'النشاط', en: 'Activity' },
  allActions: { ar: 'كل الإجراءات', en: 'All Actions' },
  noActivity: { ar: 'لا يوجد نشاط', en: 'No activity' },
  loading: { ar: 'جاري التحميل...', en: 'Loading...' },
  error: { ar: 'خطأ في التحميل', en: 'Error loading activity' },
  retry: { ar: 'إعادة المحاولة', en: 'Retry' },
  refresh: { ar: 'تحديث', en: 'Refresh' },
};

const actionOptions = [
  { value: '', label: { ar: 'كل الإجراءات', en: 'All Actions' } },
  { value: 'PROJECT_CREATED', label: { ar: 'تم إنشاء المشروع', en: 'Project Created' } },
  { value: 'PROJECT_UPDATED', label: { ar: 'تم تحديث المشروع', en: 'Project Updated' } },
  { value: 'TASK_CREATED', label: { ar: 'تم إنشاء مهمة', en: 'Task Created' } },
  { value: 'TASK_UPDATED', label: { ar: 'تم تحديث مهمة', en: 'Task Updated' } },
  { value: 'TASK_STATUS_CHANGED', label: { ar: 'تم تغيير حالة مهمة', en: 'Task Status Changed' } },
  { value: 'TASK_DELETED', label: { ar: 'تم حذف مهمة', en: 'Task Deleted' } },
  { value: 'COMMENT_CREATED', label: { ar: 'تم إضافة تعليق', en: 'Comment Added' } },
  { value: 'FILE_UPLOADED', label: { ar: 'تم رفع ملف', en: 'File Uploaded' } },
  { value: 'MEMBER_INVITED', label: { ar: 'تم دعوة عضو', en: 'Member Invited' } },
  { value: 'MEMBER_JOINED', label: { ar: 'انضم عضو', en: 'Member Joined' } },
  { value: 'MEMBER_ROLE_CHANGED', label: { ar: 'تم تغيير دور عضو', en: 'Member Role Changed' } },
  { value: 'NOTE_CREATED', label: { ar: 'تم إنشاء ملاحظة', en: 'Note Created' } },
];

export function ProjectActivityTab({ projectId, project, initialActivity = [] }: ProjectActivityTabProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const dateLocale = isArabic ? ar : enUS;
  const projectPath = `/${locale}/projects/${project.id}`;

  const [activity, setActivity] = useState<ActivityLogWithUser[]>(initialActivity);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchActivity = useCallback(async (pageNum = 1, append = false) => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual activity fetch action
      // const result = await getProjectActivityAction(projectId, { page: pageNum, action: actionFilter });
      // if (result.success) {
      //   if (append) setActivity((prev) => [...prev, ...result.data!]);
      //   else setActivity(result.data || []);
      //   setHasMore(result.data!.length === 20);
      // }
      setActivity([]);
      setHasMore(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error[isArabic ? 'ar' : 'en']);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, actionFilter, isArabic]);

  const handleLoadMore = () => {
    fetchActivity(page + 1, true);
  };

  const getActionLabel = (action: string) => {
    const opt = actionOptions.find((o) => o.value === action);
    return opt ? opt.label[isArabic ? 'ar' : 'en'] : action;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'PROJECT_CREATED':
      case 'PROJECT_UPDATED':
        return <span className="text-blue-500">📁</span>;
      case 'TASK_CREATED':
      case 'TASK_UPDATED':
      case 'TASK_STATUS_CHANGED':
      case 'TASK_DELETED':
        return <span className="text-green-500">✓</span>;
      case 'COMMENT_CREATED':
        return <span className="text-purple-500">💬</span>;
      case 'FILE_UPLOADED':
        return <span className="text-orange-500">📎</span>;
      case 'MEMBER_INVITED':
      case 'MEMBER_JOINED':
      case 'MEMBER_ROLE_CHANGED':
        return <span className="text-pink-500">👤</span>;
      case 'NOTE_CREATED':
        return <span className="text-yellow-500">📝</span>;
      default:
        return <span>•</span>;
    }
  };

  if (isLoading && activity.length === 0) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-10 w-32 bg-muted rounded" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-card border rounded-xl">
              <div className="h-10 w-10 bg-muted rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="h-3 w-1/4 bg-muted rounded mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && activity.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchActivity(1, false)}>
            {labels.retry[isArabic ? 'ar' : 'en']}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{labels.activity[isArabic ? 'ar' : 'en']}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={labels.allActions[isArabic ? 'ar' : 'en']} />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label[isArabic ? 'ar' : 'en']}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchActivity(1, false)}>
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">{labels.refresh[isArabic ? 'ar' : 'en']}</span>
          </Button>
        </div>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardContent className="p-0">
          {activity.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <RefreshCw className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p className="text-lg font-medium">{labels.noActivity[isArabic ? 'ar' : 'en']}</p>
            </div>
          ) : (
            <div className="divide-y">
              {activity.map((entry) => (
                <ActivityEntry
                  key={entry.id}
                  entry={entry}
                  isArabic={isArabic}
                  dateLocale={dateLocale}
                  getActionLabel={getActionLabel}
                  getActionIcon={getActionIcon}
                />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="p-4 border-t text-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
                {isLoading ? labels.loading[isArabic ? 'ar' : 'en'] : labels.refresh[isArabic ? 'ar' : 'en']}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityEntry({
  entry,
  isArabic,
  dateLocale,
  getActionLabel,
  getActionIcon,
}: {
  entry: ActivityLogWithUser;
  isArabic: boolean;
  dateLocale: any;
  getActionLabel: (action: string) => string;
  getActionIcon: (action: string) => React.ReactNode;
}) {
  const user = entry.user;
  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  
  const taskTitle = entry.metadata?.task_title as string | undefined;
  const fileName = entry.metadata?.file_name as string | undefined;

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-accent/50 transition-colors">
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.avatar_url || undefined} alt={user?.full_name || ''} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-background flex items-center justify-center">
          {getActionIcon(entry.action)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{user?.full_name || (isArabic ? 'مستخدم مجهول' : 'Unknown user')}</span>
          <span className="text-muted-foreground ml-1">
            {getActionLabel(entry.action)}
          </span>
          {taskTitle && (
            <span className="text-muted-foreground ml-1">: &ldquo;{taskTitle}&rdquo;</span>
          )}
          {fileName && (
            <span className="text-muted-foreground ml-1">: {fileName}</span>
          )}
        </p>
        <time className="text-xs text-muted-foreground" dateTime={entry.created_at}>
          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: dateLocale })}
        </time>
      </div>
    </div>
  );
}
