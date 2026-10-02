/**
 * Notifications Page
 * Full page view of all notifications with filtering and pagination
 */

import { Metadata } from 'next';
import { getNotificationsAction, getUnreadNotificationCountAction } from '@/app/actions/notifications';
import { NotificationsClient } from './NotificationsClient';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'View and manage your notifications',
};

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  // Fetch initial data on server
  const [notificationsResult, unreadCountResult] = await Promise.all([
    getNotificationsAction({ page: 1, page_size: 20 }),
    getUnreadNotificationCountAction(),
  ]);

  return (
    <NotificationsClient
      initialNotifications={notificationsResult.data}
      initialUnreadCount={unreadCountResult.count}
      initialTotalCount={notificationsResult.count}
      initialPage={1}
    />
  );
}