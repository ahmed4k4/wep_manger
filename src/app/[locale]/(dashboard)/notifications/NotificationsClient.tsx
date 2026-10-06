'use client';

/**
 * Notifications Client Component
 * Handles pagination, filtering, and real-time updates for notifications page
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Filter, X, ChevronLeft, ChevronRight, Check, Mail, Bell, AlertTriangle, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { NotificationWithRelations, NotificationType } from '@/lib/db/queries/notifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  markNotificationAsReadAction, 
  markNotificationsAsReadAction, 
  markAllNotificationsAsReadAction,
  getNotificationsAction,
  getUnreadNotificationCountAction,
} from '@/app/actions/notifications';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface NotificationsClientProps {
  initialNotifications: NotificationWithRelations[];
  initialUnreadCount: number;
  initialTotalCount: number;
  initialPage: number;
}

const NOTIFICATION_TYPES: { value: NotificationType; label: { en: string; ar: string } }[] = [
  { value: 'TASK_ASSIGNED', label: { en: 'Task Assigned', ar: 'مهمة مُسندة' } },
  { value: 'TASK_UPDATED', label: { en: 'Task Updated', ar: 'مهمة مُحدثة' } },
  { value: 'TASK_STATUS_CHANGED', label: { en: 'Status Changed', ar: 'تغيير الحالة' } },
  { value: 'TASK_COMMENT', label: { en: 'New Comment', ar: 'تعليق جديد' } },
  { value: 'MEMBER_ADDED', label: { en: 'Member Added', ar: 'إضافة عضو' } },
  { value: 'MEMBER_ROLE_CHANGED', label: { en: 'Role Changed', ar: 'تغيير الدور' } },
  { value: 'FILE_UPLOADED', label: { en: 'File Uploaded', ar: 'رفع ملف' } },
  { value: 'PROJECT_INVITE', label: { en: 'Project Invite', ar: 'دعوة مشروع' } },
  { value: 'PROJECT_UPDATED', label: { en: 'Project Updated', ar: 'تحديث مشروع' } },
  { value: 'NOTE_CREATED', label: { en: 'Note Created', ar: 'إنشاء ملاحظة' } },
  { value: 'NOTE_COMMENT', label: { en: 'Note Comment', ar: 'تعليق ملاحظة' } },
  { value: 'NOTE_MENTION', label: { en: 'Note Mention', ar: 'منشور ملاحظة' } },
  { value: 'TASK_DUE_SOON', label: { en: 'Due Soon', ar: 'قريب الاستحقاق' } },
  { value: 'TASK_OVERDUE', label: { en: 'Overdue', ar: 'متأخر' } },
  { value: 'SYSTEM_ALERT', label: { en: 'System Alert', ar: 'تنبيه نظام' } },
  { value: 'MENTION', label: { en: 'Mention', ar: 'منشور' } },
];

export function NotificationsClient({ 
  initialNotifications, 
  initialUnreadCount, 
  initialTotalCount, 
  initialPage 
}: NotificationsClientProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const t = useTranslations('notifications');
  
  const [notifications, setNotifications] = useState<NotificationWithRelations[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [page, setPage] = useState(initialPage);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  
  const handleFilterTypeChange = (value: string) => {
    setFilterType(value as NotificationType | 'all');
  };
  
  const handleFilterReadChange = (value: string) => {
    setFilterRead(value as 'all' | 'read' | 'unread');
  };
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(initialPage * pageSize < initialTotalCount);

  const formatTime = useCallback((dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: isArabic ? ar : enUS,
    });
  }, [isArabic]);

  const fetchNotifications = useCallback(async (pageNum: number, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const result = await getNotificationsAction({
        page: pageNum,
        page_size: pageSize,
        type: filterType === 'all' ? undefined : filterType,
        read: filterRead === 'all' ? undefined : filterRead === 'unread' ? false : true,
      });

      if (result.data) {
        if (append) {
          setNotifications(prev => [...prev, ...result.data!]);
        } else {
          setNotifications(result.data);
        }
        setTotalCount(result.count || 0);
        setHasMore(pageNum * pageSize < (result.count || 0));
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filterType, filterRead, pageSize]);

  const fetchUnreadCount = useCallback(async () => {
    const result = await getUnreadNotificationCountAction();
    if (result.count !== undefined) {
      setUnreadCount(result.count);
    }
  }, []);

  // The server component already fetched page 1 with the default filters, so we
  // must NOT refetch on mount (that would double every notifications page load).
  // We only refetch when the user actually changes a filter.
  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    setPage(1);
    fetchNotifications(1, false);
    fetchUnreadCount();
  }, [filterType, filterRead, fetchNotifications, fetchUnreadCount]);

  const handleMarkAsRead = async (notificationId: string) => {
    const result = await markNotificationAsReadAction(notificationId);
    if (!result.error) {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setSelectedIds(prev => prev.filter(id => id !== notificationId));
    }
  };

  const handleMarkSelectedAsRead = async () => {
    if (!selectedIds.length) return;
    
    const result = await markNotificationsAsReadAction(selectedIds);
    if (!result.error) {
      setNotifications(prev => prev.map(n => 
        selectedIds.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - selectedIds.length));
      setSelectedIds([]);
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsReadAction();
    if (!result.error) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      setSelectedIds([]);
    }
  };

  const handleSelectionChange = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(notifications.filter(n => !n.read_at).map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchNotifications(newPage, false);
  };

  const handleLoadMore = () => {
    fetchNotifications(page + 1, true);
  };

  const getTypeLabel = (type: NotificationType) => {
    return NOTIFICATION_TYPES.find(t => t.value === type)?.label[isArabic ? 'ar' : 'en'] || type;
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_UPDATED':
        return FileText;
      case 'TASK_STATUS_CHANGED':
      case 'TASK_DUE_SOON':
      case 'TASK_OVERDUE':
      case 'SYSTEM_ALERT':
        return AlertTriangle;
      case 'TASK_COMMENT':
      case 'NOTE_COMMENT':
      case 'NOTE_MENTION':
      case 'MENTION':
        return Bell;
      case 'MEMBER_ADDED':
      case 'MEMBER_ROLE_CHANGED':
      case 'PROJECT_INVITE':
        return Users;
      case 'FILE_UPLOADED':
      case 'PROJECT_UPDATED':
      case 'NOTE_CREATED':
        return FileText;
      default:
        return Bell;
    }
  };

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead} className="gap-1">
              <Check className="h-4 w-4" />
              {t('markAllRead')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card border rounded-lg">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={handleFilterTypeChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTypes')}</SelectItem>
              {NOTIFICATION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label[isArabic ? 'ar' : 'en']}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterRead} onValueChange={handleFilterReadChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('allStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatus')}</SelectItem>
              <SelectItem value="unread">{t('unread')}</SelectItem>
              <SelectItem value="read">{t('read')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleMarkSelectedAsRead} className="gap-1">
              <Check className="h-4 w-4" />
              {t('markSelectedRead')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noNotifications')}</h3>
            <p className="text-muted-foreground">{t('noNotificationsDesc')}</p>
          </div>
        ) : (
          <>
            {/* Selection header */}
            {(selectedIds.length > 0 || unreadCount > 0) && (
              <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === notifications.filter(n => !n.read_at).length && notifications.some(n => !n.read_at)}
                    onChange={e => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                    aria-label="Select all unread"
                  />
                  <span className="text-sm font-medium">
                    {selectedIds.length > 0 
                      ? t('selectedCount', { count: selectedIds.length })
                      : t('unreadCount', { count: unreadCount })
                    }
                  </span>
                </div>
                {selectedIds.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleMarkSelectedAsRead} className="gap-1">
                    <Check className="h-4 w-4" />
                    {t('markSelectedRead')}
                  </Button>
                )}
              </div>
            )}

            <div className="divide-y">
              {notifications.map(notification => {
                const Icon = getTypeIcon(notification.type);
                return (
                  <div key={notification.id} className="relative">
                    <label className="flex cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(notification.id)}
                        onChange={e => handleSelectionChange(notification.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className={cn(
                        'flex gap-4 p-4 transition-colors hover:bg-accent/50',
                        !notification.read_at && 'bg-accent/30',
                        'peer-checked:bg-primary/10 peer-checked:border-l-2 peer-checked:border-l-primary'
                      )}>
                        {/* Icon */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <p className={cn('font-medium truncate', !notification.read_at && 'font-semibold')}>
                                {notification.title}
                              </p>
                              {notification.project && (
                                <Badge variant="secondary" className="text-xs">
                                  {notification.project.key}
                                </Badge>
                              )}
                            </div>
                            <span className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                            {notification.action_label && notification.action_url && (
                              <a 
                                href={notification.action_url}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                onClick={e => e.stopPropagation()}
                              >
                                {notification.action_label}
                                <Mail className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Unread indicator */}
                        {!notification.read_at && (
                          <div className="flex-shrink-0 w-3 h-3 mt-1 rounded-full bg-primary peer-checked:hidden" />
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Load More / Pagination */}
            {hasMore && (
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('loading')}
                    </>
                  ) : (
                    t('loadMore')
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

