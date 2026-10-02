/**
 * Notification Data Access Layer
 * Server-side queries for notifications - used in Server Components and Server Actions
 */

import { createSupabaseServerClient, createSupabaseAdminClient } from '../supabase-server';
import type {
  Notification,
  NotificationType,
  Profile,
  Project,
  Task,
  ProjectMember,
  PostgrestError,
} from '@/types/project';

// Re-export NotificationType for client components
export type { NotificationType } from '@/types/project';

// ============================================================================
// Types
// ============================================================================

export interface NotificationFilters {
  user_id?: string;
  project_id?: string;
  type?: NotificationType;
  read?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'read_at';
  sort_order?: 'asc' | 'desc';
}

export interface NotificationWithRelations extends Notification {
  project?: Pick<Project, 'id' | 'name' | 'key'>;
  actor?: Profile;
}

export interface CreateNotificationInput {
  user_id: string;
  project_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string | null;
  action_label?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateNotificationsInput {
  user_ids: string[];
  project_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string | null;
  action_label?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get notifications for a user with pagination and filters
 */
export async function getNotifications(
  filters: NotificationFilters = {}
): Promise<{ data: NotificationWithRelations[]; count: number | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    user_id,
    project_id,
    type,
    read,
    page = 1,
    page_size = 20,
    sort_by = 'created_at',
    sort_order = 'desc',
  } = filters;

  let query = supabase
    .from('notifications')
    .select(
      `
      *,
      project:projects!notifications_project_id_fkey(id, name, key),
      actor:profiles!notifications_user_id_fkey(id, full_name, avatar_url)
      `,
      { count: 'exact' }
    )
    .eq('user_id', user_id)
    .order(sort_by, { ascending: sort_order === 'asc' })
    .range((page - 1) * page_size, page * page_size - 1);

  if (project_id) {
    query = query.eq('project_id', project_id);
  }

  if (type) {
    query = query.eq('type', type);
  }

  if (read !== undefined) {
    if (read) {
      query = query.not('read_at', 'is', null);
    } else {
      query = query.is('read_at', null);
    }
  }

  const { data, error, count } = await query;

  return { data: (data as NotificationWithRelations[]) || [], count, error };
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string, projectId?: string): Promise<{ count: number; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { count, error } = await query;

  return { count: count || 0, error };
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string, projectId?: string): Promise<{ data: NotificationStats | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('notifications')
    .select('type, read_at')
    .eq('user_id', userId);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { data: null, error };
  }

  const stats: NotificationStats = {
    total: data.length,
    unread: data.filter(n => !n.read_at).length,
    by_type: data.reduce((acc, n) => {
      const type = n.type as NotificationType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>),
  };

  return { data: stats, error: null };
}

/**
 * Create a single notification
 * Uses admin client to bypass RLS for system-generated notifications
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<{ data: Notification | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseAdminClient();

  // Check for duplicate notification (same user, type, entity within last minute)
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', input.user_id)
    .eq('type', input.type)
    .eq('title', input.title)
    .gte('created_at', new Date(Date.now() - 60000).toISOString())
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { data: null, error: { code: 'DUPLICATE', message: 'Duplicate notification', details: {} } as PostgrestError };
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.user_id,
      project_id: input.project_id,
      type: input.type,
      title: input.title,
      message: input.message,
      action_url: input.action_url,
      action_label: input.action_label,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  return { data: data as Notification | null, error };
}

/**
 * Create notifications for multiple users (bulk)
 * Efficiently inserts notifications for multiple recipients
 */
export async function createNotificationsForUsers(
  input: CreateNotificationsInput
): Promise<{ data: Notification[] | null; error: PostgrestError | null }> {
  if (!input.user_ids.length) {
    return { data: [], error: null };
  }

  const supabase = await createSupabaseAdminClient();

  // Check for duplicates for each user
  const notificationsToInsert = input.user_ids.map(userId => ({
    user_id: userId,
    project_id: input.project_id,
    type: input.type,
    title: input.title,
    message: input.message,
    action_url: input.action_url,
    action_label: input.action_label,
    metadata: input.metadata || {},
  }));

  // Use upsert with onConflict to prevent duplicates
  // Note: This requires a unique constraint on (user_id, type, title, created_at) which we don't have
  // So we check manually first
  const recentThreshold = new Date(Date.now() - 60000).toISOString();
  
  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('user_id, type, title')
    .in('user_id', input.user_ids)
    .eq('type', input.type)
    .eq('title', input.title)
    .gte('created_at', recentThreshold);

  const recentKeys = new Set(
    (recentNotifications || []).map(n => `${n.user_id}-${n.type}-${n.title}`)
  );

  const uniqueNotifications = notificationsToInsert.filter(
    n => !recentKeys.has(`${n.user_id}-${n.type}-${n.title}`)
  );

  if (!uniqueNotifications.length) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert(uniqueNotifications)
    .select();

  return { data: data as Notification[] | null, error };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<{ data: Notification | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .single();

  return { data: data as Notification | null, error };
}

/**
 * Mark multiple notifications as read
 */
export async function markNotificationsAsRead(
  notificationIds: string[],
  userId: string
): Promise<{ data: Notification[] | null; error: PostgrestError | null }> {
  if (!notificationIds.length) {
    return { data: [], error: null };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', notificationIds)
    .eq('user_id', userId)
    .select();

  return { data: data as Notification[] | null, error };
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string,
  projectId?: string
): Promise<{ data: Notification[] | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query.select();

  return { data: data as Notification[] | null, error };
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId);

  return { error };
}

/**
 * Get recent notifications for dropdown (limited)
 */
export async function getRecentNotifications(
  userId: string,
  limit = 10
): Promise<{ data: NotificationWithRelations[] | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('notifications')
    .select(
      `
      *,
      project:projects!notifications_project_id_fkey(id, name, key),
      actor:profiles!notifications_user_id_fkey(id, full_name, avatar_url)
      `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data as NotificationWithRelations[] | null, error };
}