/**
 * User Profile Server Actions
 * Get user profile with stats, assigned projects, tasks, etc.
 */

'use server';

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getCurrentUser, checkPermission } from '@/lib/authorization';
import type { Profile, ProjectRole, TaskStatus, Project, TaskWithRelations } from '@/types/project';

export interface UserProfileData extends Profile {
  assigned_projects_count: number;
  assigned_tasks_count: number;
  completed_tasks_count: number;
  overdue_tasks_count: number;
  projects: (Project & { role: ProjectRole })[];
  recent_tasks: TaskWithRelations[];
}

export interface GetUserProfileResponse {
  success: boolean;
  data?: UserProfileData;
  error?: string;
  code?: string;
}

/**
 * Get current user's full profile with stats
 */
export async function getCurrentUserProfile(): Promise<GetUserProfileResponse> {
  try {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();

    // Get profile with extended fields
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found', code: 'NOT_FOUND' };
    }

    // Get assigned projects
    const { data: projectMembers } = await supabase
      .from('project_members')
      .select(`
        project_id,
        role,
        project:projects!project_members_project_id_fkey(
          id,
          name,
          key,
          description,
          status,
          owner_id,
          created_at,
          updated_at,
          deleted_at
        )
      `)
      .eq('user_id', user.id);

    const projects: (Project & { role: ProjectRole })[] = (projectMembers || [])
      .map(pm => {
        const project = Array.isArray(pm.project) ? pm.project[0] : pm.project;
        return {
          ...project,
          role: pm.role as ProjectRole,
        };
      })
      .filter((p): p is Project & { role: ProjectRole } => p !== null && !p.deleted_at);

    // Get assigned tasks count
    const { count: assignedCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', user.id)
      .is('deleted_at', null);

    // Get completed tasks count
    const { count: completedCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', user.id)
      .eq('status', 'COMPLETED')
      .is('deleted_at', null);

    // Get overdue tasks count
    const { count: overdueCount } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', user.id)
      .lt('due_date', new Date().toISOString())
      .neq('status', 'COMPLETED')
      .is('deleted_at', null);

    // Get recent tasks (last 10)
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(id, name, key),
        assignee:profiles!tasks_assignee_id_fkey(id, email, full_name, avatar_url, global_role, status),
        creator:profiles!tasks_created_by_fkey(id, email, full_name, avatar_url, global_role, status),
        reporter:profiles!tasks_reporter_id_fkey(id, email, full_name, avatar_url, global_role, status),
        comments:task_comments(count),
        attachments:task_attachments(count)
      `)
      .eq('assignee_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Transform recent tasks
    const transformedTasks = (recentTasks || []).map((task: any) => ({
      ...task,
      assignee: task.assignee?.[0] || null,
      creator: task.creator?.[0] || null,
      reporter: task.reporter?.[0] || null,
      project: task.project?.[0] || null,
      comments_count: task.comments?.[0]?.count || 0,
      attachments_count: task.attachments?.[0]?.count || 0,
    })) as TaskWithRelations[];

    const userProfile: UserProfileData = {
      ...profile,
      global_role: profile.global_role || 'USER',
      status: profile.status || 'active',
      assigned_projects_count: projects.length,
      assigned_tasks_count: assignedCount || 0,
      completed_tasks_count: completedCount || 0,
      overdue_tasks_count: overdueCount || 0,
      projects,
      recent_tasks: transformedTasks,
    };

    return { success: true, data: userProfile };
  } catch (error) {
    console.error('getCurrentUserProfile error:', error);
    return { success: false, error: 'Failed to fetch profile', code: 'INTERNAL_ERROR' };
  }
}

/**
 * Get any user's profile (admin or project member)
 */
export async function getUserProfile(
  targetUserId: string
): Promise<GetUserProfileResponse> {
  try {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();

    // Check if user is viewing their own profile
    const isOwnProfile = user.id === targetUserId;

    // If not own profile, check if admin or shares a project
    if (!isOwnProfile) {
      const isAdmin = await checkPermission(user.id, 'admin.view_all_users');
      if (!isAdmin) {
        // Check if they share any project
        const { data: sharedProjects } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id);

        const projectIds = sharedProjects?.map(p => p.project_id) || [];

        if (projectIds.length > 0) {
          const { data: targetMembership } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', targetUserId)
            .in('project_id', projectIds)
            .limit(1);

          if (!targetMembership) {
            return { success: false, error: 'Permission denied', code: 'FORBIDDEN' };
          }
        } else {
          return { success: false, error: 'Permission denied', code: 'FORBIDDEN' };
        }
      }
    }

    // Get profile with extended fields
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profile not found', code: 'NOT_FOUND' };
    }

    // Get assigned projects (only projects shared with current user or all if admin)
    const isAdmin = await checkPermission(user.id, 'admin.view_all_projects');
    let projectQuery = supabase
      .from('project_members')
      .select(`
        project_id,
        role,
        project:projects!project_members_project_id_fkey(
          id,
          name,
          key,
          description,
          status,
          owner_id,
          created_at,
          updated_at,
          deleted_at
        )
      `)
      .eq('user_id', targetUserId);

    if (!isAdmin && !isOwnProfile) {
      const { data: sharedProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = sharedProjects?.map(p => p.project_id) || [];
      if (projectIds.length > 0) {
        projectQuery = projectQuery.in('project_id', projectIds);
      } else {
        projectQuery = projectQuery.eq('project_id', '00000000-0000-0000-0000-000000000000'); // No results
      }
    }

    const { data: projectMembers } = await projectQuery;

    const projects: (Project & { role: ProjectRole })[] = (projectMembers || [])
      .map(pm => {
        const project = Array.isArray(pm.project) ? pm.project[0] : pm.project;
        return {
          ...project,
          role: pm.role as ProjectRole,
        };
      })
      .filter((p): p is Project & { role: ProjectRole } => p !== null && !p.deleted_at);

    // Get assigned tasks count (only in shared projects or all if admin)
    let assignedQuery = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', targetUserId)
      .is('deleted_at', null);

    if (!isAdmin && !isOwnProfile) {
      const { data: sharedProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = sharedProjects?.map(p => p.project_id) || [];
      if (projectIds.length > 0) {
        assignedQuery = assignedQuery.in('project_id', projectIds);
      } else {
        assignedQuery = assignedQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
      }
    }

    const { count: assignedCount } = await assignedQuery;

    // Get completed tasks count
    let completedQuery = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', targetUserId)
      .eq('status', 'COMPLETED')
      .is('deleted_at', null);

    if (!isAdmin && !isOwnProfile) {
      const { data: sharedProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = sharedProjects?.map(p => p.project_id) || [];
      if (projectIds.length > 0) {
        completedQuery = completedQuery.in('project_id', projectIds);
      } else {
        completedQuery = completedQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
      }
    }

    const { count: completedCount } = await completedQuery;

    // Get overdue tasks count
    let overdueQuery = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', targetUserId)
      .lt('due_date', new Date().toISOString())
      .neq('status', 'COMPLETED')
      .is('deleted_at', null);

    if (!isAdmin && !isOwnProfile) {
      const { data: sharedProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = sharedProjects?.map(p => p.project_id) || [];
      if (projectIds.length > 0) {
        overdueQuery = overdueQuery.in('project_id', projectIds);
      } else {
        overdueQuery = overdueQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
      }
    }

    const { count: overdueCount } = await overdueQuery;

    // Get recent tasks
    let tasksQuery = supabase
      .from('tasks')
      .select(`
        *,
        project:projects(id, name, key),
        assignee:profiles!tasks_assignee_id_fkey(id, email, full_name, avatar_url, global_role, status),
        creator:profiles!tasks_created_by_fkey(id, email, full_name, avatar_url, global_role, status),
        reporter:profiles!tasks_reporter_id_fkey(id, email, full_name, avatar_url, global_role, status),
        comments:task_comments(count),
        attachments:task_attachments(count)
      `)
      .eq('assignee_id', targetUserId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!isAdmin && !isOwnProfile) {
      const { data: sharedProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = sharedProjects?.map(p => p.project_id) || [];
      if (projectIds.length > 0) {
        tasksQuery = tasksQuery.in('project_id', projectIds);
      } else {
        tasksQuery = tasksQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
      }
    }

    const { data: recentTasks } = await tasksQuery;

    const transformedTasks = (recentTasks || []).map((task: any) => ({
      ...task,
      assignee: task.assignee?.[0] || null,
      creator: task.creator?.[0] || null,
      reporter: task.reporter?.[0] || null,
      project: task.project?.[0] || null,
      comments_count: task.comments?.[0]?.count || 0,
      attachments_count: task.attachments?.[0]?.count || 0,
    })) as TaskWithRelations[];

    const userProfile: UserProfileData = {
      ...profile,
      global_role: profile.global_role || 'USER',
      status: profile.status || 'active',
      assigned_projects_count: projects.length,
      assigned_tasks_count: assignedCount || 0,
      completed_tasks_count: completedCount || 0,
      overdue_tasks_count: overdueCount || 0,
      projects,
      recent_tasks: transformedTasks,
    };

    return { success: true, data: userProfile };
  } catch (error) {
    console.error('getUserProfile error:', error);
    return { success: false, error: 'Failed to fetch profile', code: 'INTERNAL_ERROR' };
  }
}

/**
 * Get user's assigned projects
 */
export async function getUserAssignedProjects(
  targetUserId?: string
): Promise<{ success: boolean; data?: (Project & { role: ProjectRole })[]; error?: string }> {
  try {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();

    const userId = targetUserId || user.id;

    // Check permission
    if (userId !== user.id) {
      const isAdmin = await checkPermission(user.id, 'admin.view_all_users');
      if (!isAdmin) {
        return { success: false, error: 'Permission denied', data: [] };
      }
    }

    const { data: projectMembers } = await supabase
      .from('project_members')
      .select(`
        project_id,
        role,
        project:projects!project_members_project_id_fkey(
          id,
          name,
          key,
          description,
          status,
          owner_id,
          created_at,
          updated_at,
          deleted_at
        )
      `)
      .eq('user_id', userId);

    const projects: (Project & { role: ProjectRole })[] = (projectMembers || [])
      .map(pm => {
        const project = Array.isArray(pm.project) ? pm.project[0] : pm.project;
        return {
          ...project,
          role: pm.role as ProjectRole,
        };
      })
      .filter((p): p is Project & { role: ProjectRole } => p !== null && !p.deleted_at);

    return { success: true, data: projects };
  } catch (error) {
    console.error('getUserAssignedProjects error:', error);
    return { success: false, error: 'Failed to fetch projects', data: [] };
  }
}

/**
 * Get user's assigned tasks with filters
 */
export async function getUserAssignedTasks(
  targetUserId?: string,
  filters?: {
    status?: TaskStatus;
    projectId?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{ success: boolean; data?: TaskWithRelations[]; count?: number; error?: string }> {
  try {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();

    const userId = targetUserId || user.id;

    // Check permission
    if (userId !== user.id) {
      const isAdmin = await checkPermission(user.id, 'admin.view_all_users');
      if (!isAdmin) {
        return { success: false, error: 'Permission denied', data: [], count: 0 };
      }
    }

    const { status, projectId, page = 1, pageSize = 20 } = filters || {};

    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:projects(id, name, key),
        assignee:profiles!tasks_assignee_id_fkey(id, email, full_name, avatar_url, global_role, status),
        creator:profiles!tasks_created_by_fkey(id, email, full_name, avatar_url, global_role, status),
        reporter:profiles!tasks_reporter_id_fkey(id, email, full_name, avatar_url, global_role, status),
        comments:task_comments(count),
        attachments:task_attachments(count)
      `, { count: 'exact' })
      .eq('assignee_id', userId)
      .is('deleted_at', null);

    if (status) {
      query = query.eq('status', status);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    query = query.order('updated_at', { ascending: false });
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message, data: [], count: 0 };
    }

    const transformedTasks = (data || []).map((task: any) => ({
      ...task,
      assignee: task.assignee?.[0] || null,
      creator: task.creator?.[0] || null,
      reporter: task.reporter?.[0] || null,
      project: task.project?.[0] || null,
      comments_count: task.comments?.[0]?.count || 0,
      attachments_count: task.attachments?.[0]?.count || 0,
    })) as TaskWithRelations[];

    return { success: true, data: transformedTasks, count: count || 0 };
  } catch (error) {
    console.error('getUserAssignedTasks error:', error);
    return { success: false, error: 'Failed to fetch tasks', data: [], count: 0 };
  }
}

/**
 * Get user's completed tasks
 */
export async function getUserCompletedTasks(
  targetUserId?: string,
  filters?: {
    projectId?: string;
    page?: number;
    pageSize?: number;
  }
) {
  return getUserAssignedTasks(targetUserId, { ...filters, status: 'COMPLETED' });
}

/**
 * Get user's overdue tasks
 */
export async function getUserOverdueTasks(
  targetUserId?: string,
  filters?: {
    projectId?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{ success: boolean; data?: TaskWithRelations[]; count?: number; error?: string }> {
  try {
    const user = await getCurrentUser();
    const supabase = await createSupabaseServerClient();

    const userId = targetUserId || user.id;

    // Check permission
    if (userId !== user.id) {
      const isAdmin = await checkPermission(user.id, 'admin.view_all_users');
      if (!isAdmin) {
        return { success: false, error: 'Permission denied', data: [], count: 0 };
      }
    }

    const { projectId, page = 1, pageSize = 20 } = filters || {};

    let query = supabase
      .from('tasks')
      .select(`
        *,
        project:projects(id, name, key),
        assignee:profiles!tasks_assignee_id_fkey(id, email, full_name, avatar_url, global_role, status),
        creator:profiles!tasks_created_by_fkey(id, email, full_name, avatar_url, global_role, status),
        reporter:profiles!tasks_reporter_id_fkey(id, email, full_name, avatar_url, global_role, status),
        comments:task_comments(count),
        attachments:task_attachments(count)
      `, { count: 'exact' })
      .eq('assignee_id', userId)
      .lt('due_date', new Date().toISOString())
      .neq('status', 'COMPLETED')
      .is('deleted_at', null);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    query = query.order('due_date', { ascending: true });
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message, data: [], count: 0 };
    }

    const transformedTasks = (data || []).map((task: any) => ({
      ...task,
      assignee: task.assignee?.[0] || null,
      creator: task.creator?.[0] || null,
      reporter: task.reporter?.[0] || null,
      project: task.project?.[0] || null,
      comments_count: task.comments?.[0]?.count || 0,
      attachments_count: task.attachments?.[0]?.count || 0,
    })) as TaskWithRelations[];

    return { success: true, data: transformedTasks, count: count || 0 };
  } catch (error) {
    console.error('getUserOverdueTasks error:', error);
    return { success: false, error: 'Failed to fetch overdue tasks', data: [], count: 0 };
  }
}