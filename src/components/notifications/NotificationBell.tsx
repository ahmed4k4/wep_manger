'use client';

/**
 * Notification Bell Component
 * Displays unread count and opens notification dropdown
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuShortcut
} from '@/components/ui/dropdown-menu';
import { NotificationWithRelations } from '@/lib/db/queries/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { NotificationItem } from './NotificationItem';
import { markNotificationAsReadAction, markNotificationsAsReadAction, markAllNotificationsAsReadAction, getRecentNotificationsAction, getUnreadNotificationCountAction } from '@/app/actions/notifications';

interface NotificationBellProps {
  initialUnreadCount?: number;
  initialNotifications?: NotificationWithRelations[];
}

export function NotificationBell({ initialUnreadCount = 0, initialNotifications = [] }: NotificationBellProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationWithRelations[]>(initialNotifications);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatTime = useCallback((dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: isArabic ? ar : enUS,
    });
  }, [isArabic]);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getRecentNotificationsAction(10);
      if (result.data) {
        setNotifications(result.data);
      }
      // Also fetch unread count
      const countResult = await getUnreadNotificationCountAction();
      if (countResult.count !== undefined) {
        setUnreadCount(countResult.count);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // The server layout already provides the unread count, so we must NOT fetch
  // on mount (that fired 2 client requests on every navigation). We only poll
  // while the tab is visible to keep the badge fresh without constant load.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (interval) return;
      interval = setInterval(fetchNotifications, 60000);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    const result = await markNotificationAsReadAction(notificationId);
    if (!result.error) {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsReadAction();
    if (!result.error) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = (notification: NotificationWithRelations) => {
    if (!notification.read_at) {
      handleMarkAsRead(notification.id);
    }
    // Close dropdown - handled by dropdown menu
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => {
            fetchNotifications();
            setIsOpen(true);
          }}
          aria-label={isArabic ? 'الإشعارات' : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        ref={dropdownRef}
        className="w-80 max-h-[500px] overflow-hidden"
        align={isArabic ? 'start' : 'end'}
        sideOffset={5}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <DropdownMenuLabel className="font-semibold">
            {isArabic ? 'الإشعارات' : 'Notifications'}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleMarkAllAsRead}
            >
              {isArabic ? 'تعليم الكل كمقروء' : 'Mark all as read'}
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {isArabic ? 'لا توجد إشعارات' : 'No notifications'}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  formatTime={formatTime}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <DropdownMenuSeparator />
        )}

        <DropdownMenuItem
          onClick={() => {
            window.location.href = `/${locale}/notifications`;
            setIsOpen(false);
          }}
          className="text-center text-sm font-medium"
          inset
        >
          {isArabic ? 'عرض جميع الإشعارات' : 'View all notifications'}
          <DropdownMenuShortcut>{isArabic ? 'Ctrl+N' : 'Ctrl+N'}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
