/**
 * Activity Log Data Access Layer
 * Server-side queries for activity logging
 */

import { createSupabaseServerClient } from '../supabase-server';
import type { ActivityLog, ActivityLogFilters, PostgrestError } from '@/types/project';

// ============================================================================
// Activity Log Queries
// ============================================================================

export interface ActivityLogWithUser {
  id: string;
  project_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Log an activity
 */
export async function logActivity(input: {
  project_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
}): Promise<{ data: ActivityLog | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      project_id: input.project_id,
      user_id: input.user_id,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      metadata: input.metadata || {},
      ip_address: input.ip_address || null,
      user_agent: input.user_agent || null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as ActivityLog, error: null };
}

/**
 * Get activity logs with filters
 */
export async function getActivityLogs(
  filters: ActivityLogFilters
): Promise<{ data: ActivityLogWithUser[] | null; count: number | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    project_id,
    user_id,
    entity_type,
    entity_id,
    action,
    from_date,
    to_date,
    page = 1,
    page_size = 50,
  } = filters;

  let query = supabase
    .from('activity_logs')
    .select(
      `
      *,
      user:profiles!activity_logs_user_id_fkey(id, full_name, avatar_url)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (project_id) {
    query = query.eq('project_id', project_id);
  }

  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  if (entity_type) {
    query = query.eq('entity_type', entity_type);
  }

  if (entity_id) {
    query = query.eq('entity_id', entity_id);
  }

  if (action) {
    query = query.eq('action', action);
  }

  if (from_date) {
    query = query.gte('created_at', from_date);
  }

  if (to_date) {
    query = query.lte('created_at', to_date);
  }

  query = query.range((page - 1) * page_size, page * page_size - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, count: null, error };
  }

  return { data: data as ActivityLogWithUser[], count, error: null };
}

/**
 * Get recent activity for a project
 */
export async function getProjectRecentActivity(
  projectId: string,
  limit = 20
): Promise<{ data: ActivityLogWithUser[] | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('activity_logs')
    .select(
      `
      *,
      user:profiles!activity_logs_user_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error };
  }

  return { data: data as ActivityLogWithUser[], error: null };
}

/**
 * Get user's recent activity across projects
 */
export async function getUserRecentActivity(
  userId: string,
  limit = 20
): Promise<{ data: ActivityLogWithUser[] | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('activity_logs')
    .select(
      `
      *,
      user:profiles!activity_logs_user_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error };
  }

  return { data: data as ActivityLogWithUser[], error: null };
}