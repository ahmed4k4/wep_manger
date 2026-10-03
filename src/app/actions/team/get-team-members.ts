/**
 * Team Management - Get Team Members Server Action
 * Lists project members with search, filters, and pagination
 */

'use server';

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { requireProjectMember, checkPermission } from '@/lib/authorization';
import type { ProjectMember, Profile, ProjectRole, UserRole, UserStatus } from '@/types/project';

export interface TeamMemberFilters {
  projectId: string;
  search?: string;
  role?: ProjectRole;
  status?: UserStatus;
  globalRole?: UserRole;
  page?: number;
  pageSize?: number;
  sortBy?: 'joined_at' | 'full_name' | 'email' | 'global_role';
  sortOrder?: 'asc' | 'desc';
}

export interface TeamMemberResult {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
  profile: Profile & {
    global_role: UserRole;
    status: UserStatus;
    assigned_tasks_count?: number;
    completed_tasks_count?: number;
    overdue_tasks_count?: number;
  };
}

export interface GetTeamMembersResponse {
  data: TeamMemberResult[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
}

/**
 * Get team members for a project with filters
 */
export async function getTeamMembers(
  filters: TeamMemberFilters
): Promise<GetTeamMembersResponse> {
  try {
    // Verify project membership
    const { user } = await requireProjectMember(filters.projectId);

    // Check permission to view members
    const canView = await checkPermission(user.id, 'team.view_members', filters.projectId);
    if (!canView) {
      return { data: [], count: 0, page: 1, pageSize: 20, totalPages: 0, error: 'Permission denied' };
    }

    const supabase = await createSupabaseServerClient();
    const {
      search,
      role,
      status,
      globalRole,
      page = 1,
      pageSize = 20,
      sortBy = 'joined_at',
      sortOrder = 'asc',
    } = filters;

    // Build query
    let query = supabase
      .from('project_members')
      .select(`
        id,
        project_id,
        user_id,
        role,
        joined_at,
        profile:profiles!project_members_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          global_role,
          status,
          created_at,
          updated_at,
          last_sign_in_at,
          phone,
          department,
          job_title
        )
      `, { count: 'exact' })
      .eq('project_id', filters.projectId);

    // Search filter
    if (search) {
      query = query.or(`profile.full_name.ilike.%${search}%,profile.email.ilike.%${search}%`);
    }

    // Project role filter
    if (role) {
      query = query.eq('role', role);
    }

    // Global role filter
    if (globalRole) {
      query = query.eq('profile.global_role', globalRole);
    }

    // Status filter
    if (status) {
      query = query.eq('profile.status', status);
    }

    // Sorting
    const validSortFields = ['joined_at', 'full_name', 'email', 'global_role'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'joined_at';
    const sortDirection = sortOrder === 'desc' ? false : true;

    if (sortField === 'full_name' || sortField === 'email' || sortField === 'global_role') {
      query = query.order(`profile.${sortField}`, { ascending: sortDirection });
    } else {
      query = query.order(sortField, { ascending: sortDirection });
    }

    // Pagination
    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching team members:', error);
      return { data: [], count: 0, page: 1, pageSize, totalPages: 0, error: error.message };
    }

    // Get task stats for each member
    const membersWithStats = await Promise.all(
      (data || []).map(async (member: any) => {
        const userId = member.user_id;

        // Get assigned tasks count
        const { count: assignedCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', userId)
          .eq('project_id', filters.projectId)
          .is('deleted_at', null);

        // Get completed tasks count
        const { count: completedCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', userId)
          .eq('project_id', filters.projectId)
          .eq('status', 'COMPLETED')
          .is('deleted_at', null);

        // Get overdue tasks count
        const { count: overdueCount } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', userId)
          .eq('project_id', filters.projectId)
          .lt('due_date', new Date().toISOString())
          .neq('status', 'COMPLETED')
          .is('deleted_at', null);

        return {
          ...member,
          profile: {
            ...member.profile,
            global_role: member.profile?.global_role || 'USER',
            status: member.profile?.status || 'active',
            assigned_tasks_count: assignedCount || 0,
            completed_tasks_count: completedCount || 0,
            overdue_tasks_count: overdueCount || 0,
          },
        };
      })
    );

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      data: membersWithStats,
      count: count || 0,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('getTeamMembers error:', error);
    return { data: [], count: 0, page: 1, pageSize: 20, totalPages: 0, error: 'Failed to fetch team members' };
  }
}

/**
 * Get all project members (no pagination) for dropdowns/selects
 */
export async function getAllProjectMembers(
  projectId: string
): Promise<{ data: (ProjectMember & { profile: Profile })[]; error?: string }> {
  try {
    const { user } = await requireProjectMember(projectId);
    const canView = await checkPermission(user.id, 'team.view_members', projectId);
    if (!canView) {
      return { data: [], error: 'Permission denied' };
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profile:profiles!project_members_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          global_role,
          status
        )
      `)
      .eq('project_id', projectId)
      .order('joined_at', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data as (ProjectMember & { profile: Profile })[], error: undefined };
  } catch (error) {
    console.error('getAllProjectMembers error:', error);
    return { data: [], error: 'Failed to fetch members' };
  }
}

/**
 * Get member workload for a project
 */
export async function getMemberWorkload(
  projectId: string
): Promise<{ data: Array<{ user_id: string; assigned: number; todo: number; in_progress: number; review: number; blocked: number; overdue: number; completed: number }>; error?: string }> {
  try {
    const { user } = await requireProjectMember(projectId);
    const canView = await checkPermission(user.id, 'team.view_workload', projectId);
    if (!canView) {
      return { data: [], error: 'Permission denied' };
    }

    const supabase = await createSupabaseServerClient();

    // Get all members
    const { data: members } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId);

    if (!members) return { data: [], error: undefined };

    // Get task stats for each member
    const workload = await Promise.all(
      members.map(async (member) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('status, due_date')
          .eq('project_id', projectId)
          .eq('assignee_id', member.user_id)
          .is('deleted_at', null);

        const now = new Date();
        return {
          user_id: member.user_id,
          assigned: tasks?.length || 0,
          todo: tasks?.filter(t => t.status === 'TODO').length || 0,
          in_progress: tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0,
          review: tasks?.filter(t => t.status === 'REVIEW').length || 0,
          blocked: tasks?.filter(t => t.status === 'BLOCKED').length || 0,
          overdue: tasks?.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'COMPLETED').length || 0,
          completed: tasks?.filter(t => t.status === 'COMPLETED').length || 0,
        };
      })
    );

    return { data: workload, error: undefined };
  } catch (error) {
    console.error('getMemberWorkload error:', error);
    return { data: [], error: 'Failed to fetch workload' };
  }
}