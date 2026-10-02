# Notifications Architecture

## Overview

This document defines the notification system for real-time and asynchronous notifications across the platform, supporting in-app notifications, email, and future push notifications.

---

## Notification Types

| Type | Channel | Priority | Examples |
|------|---------|----------|----------|
| **In-App** | Database + Realtime | High | Mentions, Assignments, Comments |
| **Email** | SMTP (Resend/SendGrid) | Medium | Daily digest, Critical alerts |
| **Push** | Web Push / Mobile | High | Urgent actions, Deadlines |

---

## Notification Data Model

### Database Schema
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'MENTION', 'TASK_ASSIGNED', 'TASK_UPDATED', 'COMMENT_ADDED', etc.
  title text NOT NULL,
  message text NOT NULL,
  action_url text, -- Deep link to relevant entity
  action_label text, -- Button label
  metadata jsonb DEFAULT '{}', -- Flexible context
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX idx_notifications_project_user ON notifications(project_id, user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

### TypeScript Types
```typescript
// shared/types/notification.ts
export type NotificationType = 
  | 'MENTION'
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMMENT'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'PROJECT_INVITE'
  | 'PROJECT_UPDATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_ROLE_CHANGED'
  | 'FILE_UPLOADED'
  | 'NOTE_CREATED'
  | 'NOTE_COMMENT'
  | 'NOTE_MENTION'
  | 'SYSTEM_ALERT';

export interface Notification {
  id: string;
  userId: string;
  projectId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: Record<string, any>;
  readAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationParams {
  userId: string;
  projectId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}
```

---

## Notification Service

### Core Service
```typescript
// features/notifications/services/notificationService.ts
import { createServerClient } from '@/shared/lib/supabase/server';
import { CreateNotificationParams, NotificationType } from '@/shared/types/notification';

export const notificationService = {
  /**
   * Create a single notification
   */
  async create(params: CreateNotificationParams): Promise<void> {
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        project_id: params.projectId,
        type: params.type,
        title: params.title,
        message: params.message,
        action_url: params.actionUrl,
        action_label: params.actionLabel,
        metadata: params.metadata || {},
      });
    
    if (error) {
      console.error('Failed to create notification:', error);
    }
  },
  
  /**
   * Create notifications for multiple users (batch)
   */
  async createBatch(notifications: CreateNotificationParams[]): Promise<void> {
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('notifications')
      .insert(notifications.map(n => ({
        user_id: n.userId,
        project_id: n.projectId,
        type: n.type,
        title: n.title,
        message: n.message,
        action_url: n.actionUrl,
        action_label: n.actionLabel,
        metadata: n.metadata || {},
      })));
    
    if (error) {
      console.error('Failed to create notifications batch:', error);
    }
  },
  
  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      projectId?: string;
    } = {}
  ): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const supabase = createServerClient();
    
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (options.unreadOnly) query = query.is('read_at', null);
    if (options.projectId) query = query.eq('project_id', options.projectId);
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw new Error('Failed to fetch notifications');
    
    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    
    return { 
      notifications: data || [], 
      unreadCount: unreadCount || 0 
    };
  },
  
  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', notificationIds);
    
    if (error) throw new Error('Failed to mark notifications as read');
  },
  
  /**
   * Mark all as read for user
   */
  async markAllAsRead(userId: string, projectId?: string): Promise<void> {
    const supabase = createServerClient();
    
    let query = supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
    
    if (projectId) query = query.eq('project_id', projectId);
    
    const { error } = await query;
    
    if (error) throw new Error('Failed to mark all as read');
  },
  
  /**
   * Delete notification
   */
  async delete(userId: string, notificationId: string): Promise<void> {
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('id', notificationId);
    
    if (error) throw new Error('Failed to delete notification');
  },
  
  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const supabase = createServerClient();
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    
    if (error) return 0;
    return count || 0;
  },
};
```

---

## Notification Helpers

### Entity-Specific Notifications
```typescript
// features/notifications/helpers/taskNotifications.ts
import { notificationService } from '../services/notificationService';
import { NotificationType } from '@/shared/types/notification';

export const taskNotifications = {
  assigned: async (params: {
    assigneeId: string;
    assignerId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    assignerName: string;
  }) => {
    if (params.assigneeId === params.assignerId) return; // Don't notify self
    
    await notificationService.create({
      userId: params.assigneeId,
      projectId: params.projectId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `${params.assignerName} assigned you to "${params.taskTitle}"`,
      actionUrl: `/projects/${params.projectId}/tasks/${params.taskId}`,
      actionLabel: 'View Task',
      metadata: { 
        taskId: params.taskId,
        assignerId: params.assignerId,
      },
    });
  },
  
  statusChanged: async (params: {
    recipientId: string;
    actorId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    previousStatus: string;
    newStatus: string;
    actorName: string;
  }) => {
    if (params.recipientId === params.actorId) return;
    
    await notificationService.create({
      userId: params.recipientId,
      projectId: params.projectId,
      type: 'TASK_STATUS_CHANGED',
      title: 'Task Status Changed',
      message: `${params.actorName} changed status of "${params.taskTitle}" from ${params.previousStatus} to ${params.newStatus}`,
      actionUrl: `/projects/${params.projectId}/tasks/${params.taskId}`,
      actionLabel: 'View Task',
      metadata: { 
        taskId: params.taskId,
        previousStatus: params.previousStatus,
        newStatus: params.newStatus,
      },
    });
  },
  
  commentAdded: async (params: {
    recipientId: string;
    commenterId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    commentPreview: string;
    commenterName: string;
  }) => {
    if (params.recipientId === params.commenterId) return;
    
    await notificationService.create({
      userId: params.recipientId,
      projectId: params.projectId,
      type: 'TASK_COMMENT',
      title: 'New Comment',
      message: `${params.commenterName} commented on "${params.taskTitle}": ${params.commentPreview}`,
      actionUrl: `/projects/${params.projectId}/tasks/${params.taskId}#comments`,
      actionLabel: 'View Comment',
      metadata: { 
        taskId: params.taskId,
        commenterId: params.commenterId,
      },
    });
  },
  
  dueSoon: async (params: {
    assigneeId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    dueDate: Date;
  }) => {
    await notificationService.create({
      userId: params.assigneeId,
      projectId: params.projectId,
      type: 'TASK_DUE_SOON',
      title: 'Task Due Soon',
      message: `"${params.taskTitle}" is due on ${params.dueDate.toLocaleDateString()}`,
      actionUrl: `/projects/${params.projectId}/tasks/${params.taskId}`,
      actionLabel: 'View Task',
      metadata: { 
        taskId: params.taskId,
        dueDate: params.dueDate.toISOString(),
      },
    });
  },
  
  overdue: async (params: {
    assigneeId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    dueDate: Date;
  }) => {
    await notificationService.create({
      userId: params.assigneeId,
      projectId: params.projectId,
      type: 'TASK_OVERDUE',
      title: 'Task Overdue',
      message: `"${params.taskTitle}" was due on ${params.dueDate.toLocaleDateString()}`,
      actionUrl: `/projects/${params.projectId}/tasks/${params.taskId}`,
      actionLabel: 'View Task',
      metadata: { 
        taskId: params.taskId,
        dueDate: params.dueDate.toISOString(),
      },
    });
  },
};
```

```typescript
// features/notifications/helpers/projectNotifications.ts
import { notificationService } from '../services/notificationService';

export const projectNotifications = {
  invited: async (params: {
    inviteeEmail: string;
    inviteeId: string | null; // Null if not registered yet
    inviterId: string;
    projectId: string;
    projectName: string;
    role: string;
    inviterName: string;
  }) => {
    // If user exists, create in-app notification
    if (params.inviteeId) {
      await notificationService.create({
        userId: params.inviteeId,
        projectId: params.projectId,
        type: 'PROJECT_INVITE',
        title: 'Project Invitation',
        message: `${params.inviterName} invited you to "${params.projectName}" as ${params.role}`,
        actionUrl: `/projects/${params.projectId}`,
        actionLabel: 'View Project',
        metadata: { 
          inviterId: params.inviterId,
          role: params.role,
        },
      });
    }
    // Email sent separately via email service
  },
  
  memberAdded: async (params: {
    recipientId: string; // Existing member
    newMemberId: string;
    projectId: string;
    projectName: string;
    newMemberName: string;
    role: string;
  }) => {
    if (params.recipientId === params.newMemberId) return;
    
    await notificationService.create({
      userId: params.recipientId,
      projectId: params.projectId,
      type: 'MEMBER_ADDED',
      title: 'New Member',
      message: `${params.newMemberName} joined "${params.projectName}" as ${params.role}`,
      actionUrl: `/projects/${params.projectId}/members`,
      actionLabel: 'View Members',
      metadata: { 
        newMemberId: params.newMemberId,
        role: params.role,
      },
    });
  },
};
```

```typescript
// features/notifications/helpers/mentionNotifications.ts
import { notificationService } from '../services/notificationService';

export const mentionNotifications = {
  notifyMentions: async (params: {
    content: string; // The text content (comment, note, etc.)
    authorId: string;
    projectId: string;
    entityType: 'task' | 'note' | 'comment';
    entityId: string;
    entityTitle: string;
    entityUrl: string;
    authorName: string;
  }) => {
    // Extract @mentions from content
    const mentionRegex = /@(\w+)/g;
    const mentions = [...params.content.matchAll(mentionRegex)].map(m => m[1]);
    
    if (mentions.length === 0) return;
    
    // Look up user IDs for mentioned usernames
    // This would query the users table
    const mentionedUsers = await getUsersByUsernames(mentions);
    
    for (const user of mentionedUsers) {
      if (user.id === params.authorId) continue; // Don't notify self
      
      await notificationService.create({
        userId: user.id,
        projectId: params.projectId,
        type: `${params.entityType.toUpperCase()}_MENTION`,
        title: `You were mentioned`,
        message: `${params.authorName} mentioned you in ${params.entityType} "${params.entityTitle}"`,
        actionUrl: params.entityUrl,
        actionLabel: `View ${params.entityType}`,
        metadata: { 
          entityType: params.entityType,
          entityId: params.entityId,
          authorId: params.authorId,
        },
      });
    }
  },
};

async function getUsersByUsernames(usernames: string[]) {
  // Implementation would query users table
  // Return array of { id, username, full_name }
  return [];
}
```

---

## Real-time Notifications

### Supabase Realtime
```typescript
// features/notifications/hooks/useRealtimeNotifications.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@/shared/lib/supabase/browser';
import { Notification } from '@/shared/types/notification';

export function useRealtimeNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createBrowserClient();
  
  useEffect(() => {
    if (!userId) return;
    
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev].slice(0, 100));
          setUnreadCount(prev => prev + 1);
          
          // Show toast for high-priority notifications
          if (isHighPriority(newNotification.type)) {
            showNotificationToast(newNotification);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
          
          if (updated.read_at && !payload.old.read_at) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);
  
  const markAsRead = useCallback(async (ids: string[]) => {
    // Call server action
    await fetch('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }, []);
  
  const markAllAsRead = useCallback(async () => {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }, [userId]);
  
  return { notifications, unreadCount, markAsRead, markAllAsRead };
}

function isHighPriority(type: string): boolean {
  const highPriority = [
    'TASK_ASSIGNED',
    'MENTION',
    'TASK_DUE_SOON',
    'TASK_OVERDUE',
    'SYSTEM_ALERT',
  ];
  return highPriority.includes(type);
}

function showNotificationToast(notification: Notification) {
  // Use toast library
  // toast(notification.title, { description: notification.message });
}
```

---

## Email Notifications

### Email Service
```typescript
// features/notifications/services/emailService.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  async send(params: EmailParams): Promise<void> {
    try {
      await resend.emails.send({
        from: 'Archai Solutions <notifications@archai.solutions>',
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  },
  
  async sendBatch(emails: EmailParams[]): Promise<void> {
    await Promise.all(emails.map(e => this.send(e)));
  },
  
  // Template rendering
  renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '');
  },
};
```

### Email Templates
```typescript
// features/notifications/templates/emailTemplates.ts
export const emailTemplates = {
  taskAssigned: (data: {
    recipientName: string;
    assignerName: string;
    taskTitle: string;
    projectName: string;
    taskUrl: string;
  }) => ({
    subject: `New task assigned: ${data.taskTitle}`,
    html: `
      <h1>Hi ${data.recipientName},</h1>
      <p>${data.assignerName} assigned you to <strong>${data.taskTitle}</strong> in ${data.projectName}.</p>
      <a href="${data.taskUrl}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">View Task</a>
      <p style="margin-top: 24px; color: #666;">— The Archai Team</p>
    `,
  }),
  
  dailyDigest: (data: {
    userName: string;
    notifications: Array<{ title: string; message: string; url: string }>;
  }) => ({
    subject: `Your daily summary - ${new Date().toLocaleDateString()}`,
    html: `
      <h1>Hi ${data.userName},</h1>
      <p>Here's what happened today:</p>
      <ul>
        ${data.notifications.map(n => `
          <li><a href="${n.url}"><strong>${n.title}</strong></a>: ${n.message}</li>
        `).join('')}
      </ul>
    `,
  }),
  
  mention: (data: {
    recipientName: string;
    authorName: string;
    entityType: string;
    entityTitle: string;
    contentPreview: string;
    entityUrl: string;
  }) => ({
    subject: `${data.authorName} mentioned you in ${data.entityType}`,
    html: `
      <h1>Hi ${data.recipientName},</h1>
      <p>${data.authorName} mentioned you in a ${data.entityType}: <strong>${data.entityTitle}</strong></p>
      <blockquote>${data.contentPreview}</blockquote>
      <a href="${data.entityUrl}">View ${data.entityType}</a>
    `,
  }),
};
```

### Scheduled Email Jobs
```typescript
// scripts/send-daily-digest.ts
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/features/notifications/services/emailService';
import { emailTemplates } from '@/features/notifications/templates/emailTemplates';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function sendDailyDigests() {
  // Get users who want daily digests
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('email_digest', true);
  
  for (const user of users || []) {
    // Get unread notifications from last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (notifications && notifications.length > 0) {
      const email = emailTemplates.dailyDigest({
        userName: user.full_name,
        notifications: notifications.map(n => ({
          title: n.title,
          message: n.message,
          url: `${process.env.NEXT_PUBLIC_APP_URL}${n.action_url}`,
        })),
      });
      
      await emailService.send({
        to: user.email,
        ...email,
      });
  }
}
```

---

## Notification Preferences

### User Preferences
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
  "inApp": true,
  "email": true,
  "emailDigest": false,
  "push": false,
  "types": {
    "MENTION": { "inApp": true, "email": true },
    "TASK_ASSIGNED": { "inApp": true, "email": true },
    "TASK_UPDATED": { "inApp": true, "email": false },
    "TASK_COMMENT": { "inApp": true, "email": true },
    "TASK_DUE_SOON": { "inApp": true, "email": true },
    "PROJECT_INVITE": { "inApp": true, "email": true },
    "FILE_UPLOADED": { "inApp": false, "email": false },
  }
}';
```

### Preference Checking
```typescript
// features/notifications/lib/preferences.ts
import { NotificationType } from '@/shared/types/notification';

interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  emailDigest: boolean;
  push: boolean;
  types: Record<NotificationType, { inApp: boolean; email: boolean }>;
}

export function shouldSendNotification(
  preferences: NotificationPreferences,
  type: NotificationType,
  channel: 'inApp' | 'email' | 'push'
): boolean {
  // Global channel toggle
  if (!preferences[channel]) return false;
  
  // Type-specific toggle
  const typePrefs = preferences.types[type];
  if (typePrefs && !typePrefs[channel]) return false;
  
  return true;
}

// In notification creation
async function createNotificationWithPreferences(params: CreateNotificationParams) {
  // Get user preferences
  const { data: user } = await supabase
    .from('users')
    .select('notification_preferences')
    .eq('id', params.userId)
    .single();
  
  const prefs = user?.notification_preferences as NotificationPreferences;
  
  // In-app
  if (shouldSendNotification(prefs, params.type, 'inApp')) {
    await notificationService.create(params);
  }
  
  // Email (async, don't await)
  if (shouldSendNotification(prefs, params.type, 'email')) {
    sendEmailNotification(params).catch(console.error);
  }
}
```

---

## Notification Center UI

### Notification Bell
```typescript
// shared/components/ui/NotificationBell.tsx
'use client';

import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { useRealtimeNotifications } from '@/features/notifications/hooks/useRealtimeNotifications';
import { useTranslations } from 'next-intl';
import { formatRelativeTime } from '@/shared/lib/i18n/formatters';
import { Button } from '@/shared/ui/button';

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications(userId);
  const t = useTranslations('notifications');
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between p-2 border-b">
          <h3 className="font-medium">{t('title')}</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              {t('markAllRead')}
            </Button>
          )}
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {t('noNotifications')}
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map(notification => (
              <NotificationItem 
                key={notification.id} 
                notification={notification} 
                onRead={markAsRead}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationItem({ 
  notification, 
  onRead 
}: { 
  notification: Notification; 
  onRead: (ids: string[]) => void;
}) {
  const t = useTranslations('notifications');
  const isUnread = !notification.readAt;
  
  return (
    <DropdownMenuItem 
      className={`p-3 ${isUnread ? 'bg-primary/5' : ''}`}
      onClick={() => !isUnread ? undefined : onRead([notification.id])}
      onSelect={(e) => e.preventDefault()}
    >
      <div className="flex gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isUnread ? 'bg-primary' : 'bg-transparent border'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isUnread ? 'font-medium' : ''}`}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatRelativeTime(notification.createdAt, 'en')}
          </p>
        </div>
        {notification.actionUrl && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            asChild
          >
            <a href={notification.actionUrl}>{notification.actionLabel || t('view')}</a>
          </Button>
        )}
      </div>
    </DropdownMenuItem>
  );
}
```

### Full Notification Page
```typescript
// app/[locale]/notifications/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { DataDisplay } from '@/shared/components/ui/DataDisplay';
import { TableSkeleton } from '@/shared/components/ui/Skeletons';
import { NotificationItem } from '@/shared/components/ui/NotificationBell';
import { useTranslations } from 'next-intl';

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchUserNotifications(),
  });
  
  return (
    <div className="container px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {data?.unreadCount > 0 && (
          <Button onClick={markAllAsRead}>{t('markAllRead')}</Button>
        )}
      </div>
      
      <DataDisplay
        data={data?.notifications}
        error={error}
        isLoading={isLoading}
        skeleton={<TableSkeleton rows={10} columns={1} />}
        onRetry={() => refetch()}
      >
        {(notifications) => (
          <div className="space-y-2">
            {notifications.map(n => (
              <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
            ))}
          </div>
        )}
      </DataDisplay>
    </div>
  );
}
```

---

## Integration with Server Actions

### Example: Task Assignment with Notification
```typescript
// features/tasks/actions/assignTask.ts
'use server';

import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { permissionService } from '@/shared/services/permissionService';
import { taskService } from '../services/taskService';
import { taskNotifications } from '@/features/notifications/helpers/taskNotifications';
import { activityService } from '@/features/activity/services/activityService';
import { ok, err, Result } from '@/shared/lib/result';
import { ForbiddenError, NotFoundError, ServerError } from '@/shared/errors';

export async function assignTaskAction(
  taskId: string,
  assigneeId: string | null
): Promise<Result<Task, ForbiddenError | NotFoundError | ServerError>> {
  const user = await getCurrentUser();
  if (!user) return err(new AuthenticationError());
  
  const task = await taskService.findById(taskId);
  if (!task) return err(new NotFoundError('Task'));
  
  const canAssign = await permissionService.can(user.id, 'tasks:update_assignee', { 
    projectId: task.projectId 
  });
  if (!canAssign) return err(new ForbiddenError());
  
  const previousAssigneeId = task.assigneeId;
  
  // Update task
  const updatedTask = await taskService.updateTask(taskId, { assigneeId });
  
  // Log activity
  await activityService.log({
    userId: user.id,
    action: 'TASK_ASSIGNED',
    entityType: 'task',
    entityId: taskId,
    projectId: task.projectId,
    metadata: { 
      previousAssigneeId, 
      newAssigneeId: assigneeId,
    },
  });
  
  // Send notification to new assignee
  if (assigneeId && assigneeId !== user.id) {
    await taskNotifications.assigned({
      assigneeId,
      assignerId: user.id,
      projectId: task.projectId,
      taskId,
      taskTitle: task.title,
      assignerName: user.fullName || user.email,
    });
  }
  
  // Notify previous assignee if different
  if (previousAssigneeId && previousAssigneeId !== assigneeId && previousAssigneeId !== user.id) {
    await notificationService.create({
      userId: previousAssigneeId,
      projectId: task.projectId,
      type: 'TASK_UNASSIGNED',
      title: 'Task Unassigned',
      message: `You were unassigned from "${task.title}"`,
      actionUrl: `/projects/${task.projectId}/tasks/${taskId}`,
      actionLabel: 'View Task',
      metadata: { taskId, previousAssigneeId },
    });
  }
  
  revalidatePath(`/projects/${task.projectId}`);
  return ok(updatedTask);
}
```

---

## Testing Notifications

### Unit Tests
```typescript
// features/notifications/services/__tests__/notificationService.test.ts
import { notificationService } from '../notificationService';
import { createServerClient } from '@/shared/lib/supabase/server';

jest.mock('@/shared/lib/supabase/server');

describe('notificationService', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };
  
  (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  
  it('creates notification', async () => {
    await notificationService.create({
      userId: 'user-1',
      type: 'TASK_ASSIGNED',
      title: 'Test',
      message: 'Test message',
    });
    
    expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
    expect(mockSupabase.insert).toHaveBeenCalled();
  });
  
  it('fetches user notifications', async () => {
    mockSupabase.select.mockResolvedValueOnce({ 
      data: [{ id: '1', type: 'TASK_ASSIGNED' }], 
      error: null,
      count: 1,
    });
    
    const result = await notificationService.getUserNotifications('user-1');
    
    expect(result.notifications).toHaveLength(1);
  });
});
```

---

## Summary

| Aspect | Implementation |
|--------|----------------|
| **Storage** | `notifications` table with RLS |
| **Real-time** | Supabase Realtime per user |
| **Channels** | In-app, Email, Push (future) |
| **Preferences** | Per-user, per-type, per-channel |
| **Batching** | Batch inserts for performance |
| **Digests** | Daily email digests via cron |
| **Mentions** | Regex parsing + user lookup |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*