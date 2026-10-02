/**
 * Project Data Access Layer
 * Server-side queries for projects - used in Server Components and Server Actions
 */

import { createSupabaseServerClient, createSupabaseAdminClient } from '../supabase-server';
import type {
  Project,
  ProjectMember,
  Profile,
  ProjectStats,
  ProjectFilters,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectWithRelations,
  ProjectMemberWithProfile,
  PostgrestError,
} from '@/types/project';
import { notifyUsers } from './workflow-notifications';

// ============================================================================
// Project Queries
// ============================================================================

/**
 * Get all projects for the current user (owner or member)
 */
export async function getUserProjects(
  filters: ProjectFilters = {}
): Promise<{ data: ProjectWithRelations[]; count: number; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: [], count: 0, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const {
    status,
    search,
    page = 1,
    page_size = 20,
    sort_by = 'updated_at',
    sort_order = 'desc',
  } = filters;

  let query = supabase
    .from('projects')
    .select(
      `
      *,
      owner:profiles!projects_owner_id_fkey(*),
      members:project_members(
        *,
        profile:profiles!project_members_user_id_fkey(*)
      )
    `,
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .or(`owner_id.eq.${userData.user.id},project_members.user_id.eq.${userData.user.id}`);

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  query = query.order(sort_by, { ascending: sort_order === 'asc' });
  query = query.range((page - 1) * page_size, page * page_size - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: [], count: 0, error };
  }

  return { data: data as ProjectWithRelations[], count: count || 0, error: null };
}

/**
 * Get a single project by ID with full relations
 */
export async function getProjectById(
  projectId: string
): Promise<{ data: ProjectWithRelations | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      owner:profiles!projects_owner_id_fkey(*),
      members:project_members(
        *,
        profile:profiles!project_members_user_id_fkey(*)
      )
    `
    )
    .eq('id', projectId)
    .is('deleted_at', null)
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as ProjectWithRelations, error: null };
}

/**
 * Get project statistics (task counts, member count, etc.)
 */
export async function getProjectStats(
  projectId: string
): Promise<{ data: ProjectStats | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  // Aggregate from tasks under the caller's RLS context. Materialized views
  // cannot enforce row-level security and could expose cross-project counts.
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('status, priority, progress, due_date')
    .eq('project_id', projectId)
    .is('deleted_at', null);

  if (error) return { data: null, error };
  const rows = tasks || [];
  const count = (predicate: (task: (typeof rows)[number]) => boolean) =>
    rows.filter(predicate).length;
  const today = new Date().toISOString().slice(0, 10);

  // Get member count separately
  const { count: memberCount } = await supabase
    .from('project_members')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  return {
    data: {
      total_tasks: rows.length,
      todo_count: count((task) => task.status === 'TODO'),
      in_progress_count: count((task) => task.status === 'IN_PROGRESS'),
      review_count: count((task) => task.status === 'REVIEW'),
      blocked_count: count((task) => task.status === 'BLOCKED'),
      completed_count: count((task) => task.status === 'COMPLETED'),
      urgent_count: count((task) => task.priority === 'URGENT'),
      high_count: count((task) => task.priority === 'HIGH'),
      avg_progress: rows.length
        ? rows.reduce((sum, task) => sum + (task.progress || 0), 0) / rows.length
        : 0,
      overdue_count: count((task) =>
        Boolean(task.due_date && task.due_date < today && task.status !== 'COMPLETED')
      ),
      member_count: memberCount || 0,
    },
    error: null,
  };
}

/**
 * Create a new project
 */
export async function createProject(
  input: CreateProjectInput
): Promise<{ data: Project | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: input.name,
      key: input.key.toUpperCase(),
      description: input.description || null,
      owner_id: userData.user.id,
      status: 'ACTIVE',
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // Add owner as project member
  await supabase.from('project_members').insert({
    project_id: data.id,
    user_id: userData.user.id,
    role: 'OWNER',
    invited_by: userData.user.id,
    accepted_at: new Date().toISOString(),
  });

  // Log activity (using admin client for system operations)
  await logProjectActivity(data.id, userData.user.id, 'PROJECT_CREATED', 'project', data.id, {
    name: data.name,
    key: data.key,
  });

  return { data: data as Project, error: null };
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
): Promise<{ data: Project | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  // Get current project for activity log
  const { data: currentProject } = await supabase
    .from('projects')
    .select('name, key, status, description')
    .eq('id', projectId)
    .single();

  const { data, error } = await supabase
    .from('projects')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // Log activity
  await logProjectActivity(
    projectId,
    userData.user.id,
    'PROJECT_UPDATED',
    'project',
    projectId,
    {
      previous: currentProject,
      current: data,
    }
  );
  const { data: members } = await supabase.from('project_members').select('user_id').eq('project_id', projectId).neq('user_id', userData.user.id);
  await notifyUsers({ userIds: members?.map((member) => member.user_id) || [], actorId: userData.user.id, projectId, type: 'PROJECT_UPDATED', title: `Project Updated: ${data.name}`, message: `Project details for ${data.name} were updated`, actionUrl: `/projects/${projectId}/overview`, actionLabel: 'View Project', metadata: { project_id: projectId } });

  return { data: data as Project, error: null };
}

/**
 * Soft delete a project (archive)
 */
export async function deleteProject(
  projectId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  // Get project for activity log
  const { data: project } = await supabase
    .from('projects')
    .select('name, key')
    .eq('id', projectId)
    .single();

  const { error } = await supabase
    .from('projects')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'ARCHIVED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    return { error };
  }

  // Log activity
  await logProjectActivity(
    projectId,
    userData.user.id,
    'PROJECT_ARCHIVED',
    'project',
    projectId,
    {
      name: project?.name,
      key: project?.key,
    }
  );
  const { data: members } = await supabase.from('project_members').select('user_id').eq('project_id', projectId).neq('user_id', userData.user.id);
  await notifyUsers({ userIds: members?.map((member) => member.user_id) || [], actorId: userData.user.id, projectId, type: 'PROJECT_UPDATED', title: `Project Archived: ${project?.name || 'Project'}`, message: 'This project has been archived.', actionUrl: '/projects', actionLabel: 'View Projects', metadata: { project_id: projectId } });

  return { error: null };
}

/**
 * Check if user is a member of a project
 */
export async function isProjectMember(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  return !!data;
}

/**
 * Get user's role in a project
 */
export async function getUserProjectRole(
  projectId: string,
  userId: string
): Promise<ProjectMember['role'] | null> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  return data?.role || null;
}

/**
 * Check if user has specific permission in project
 */
export async function hasProjectPermission(
  projectId: string,
  userId: string,
  requiredRoles: ProjectMember['role'][]
): Promise<boolean> {
  const role = await getUserProjectRole(projectId, userId);
  return role ? requiredRoles.includes(role) : false;
}

// ============================================================================
// Project Member Queries
// ============================================================================

/**
 * Get all members of a project
 */
export async function getProjectMembers(
  projectId: string
): Promise<{ data: ProjectMemberWithProfile[]; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('project_members')
    .select(
      `
      *,
      profile:profiles!project_members_user_id_fkey(*)
    `
    )
    .eq('project_id', projectId)
    .order('role', { ascending: false })
    .order('joined_at', { ascending: true });

  if (error) {
    return { data: [], error };
  }

  // Sort by role hierarchy: OWNER > ADMIN > MEMBER > VIEWER
  const roleOrder: Record<ProjectMember['role'], number> = {
    OWNER: 0,
    ADMIN: 1,
    MEMBER: 2,
    VIEWER: 3,
  };

  const sorted = (data as ProjectMemberWithProfile[]).sort(
    (a, b) => roleOrder[a.role] - roleOrder[b.role]
  );

  return { data: sorted, error: null };
}

/**
 * Add a member to a project
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectMember['role'] = 'MEMBER'
): Promise<{ data: ProjectMember | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: currentUser } = await supabase.auth.getUser();

  if (!currentUser.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: userId,
      role,
      invited_by: currentUser.user.id,
      invited_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // Log activity
  await logProjectActivity(
    projectId,
    currentUser.user.id,
    'MEMBER_INVITED',
    'member',
    data.id,
    {
      invited_user_id: userId,
      role,
    }
  );
  const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).maybeSingle();
  await notifyUsers({ userIds: [userId], actorId: currentUser.user.id, projectId, type: 'MEMBER_ADDED', title: `Added to Project: ${project?.name || 'Project'}`, message: `You were added to ${project?.name || 'the project'} as ${role}`, actionUrl: `/projects/${projectId}/overview`, actionLabel: 'View Project', metadata: { added_by: currentUser.user.id, role } });

  return { data: data as ProjectMember, error: null };
}

/**
 * Update a project member's role
 */
export async function updateProjectMemberRole(
  memberId: string,
  role: ProjectMember['role']
): Promise<{ data: ProjectMember | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: currentUser } = await supabase.auth.getUser();

  if (!currentUser.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  // Get current member for activity log
  const { data: currentMember } = await supabase
    .from('project_members')
    .select('project_id, user_id, role')
    .eq('id', memberId)
    .single();

  const { data, error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // Log activity
  await logProjectActivity(
    currentMember!.project_id,
    currentUser.user.id,
    'MEMBER_ROLE_CHANGED',
    'member',
    memberId,
    {
      target_user_id: currentMember!.user_id,
      previous_role: currentMember!.role,
      new_role: role,
    }
  );
  const { data: project } = await supabase.from('projects').select('name').eq('id', currentMember!.project_id).maybeSingle();
  await notifyUsers({ userIds: [currentMember!.user_id], actorId: currentUser.user.id, projectId: currentMember!.project_id, type: 'MEMBER_ROLE_CHANGED', title: `Project role updated: ${project?.name || 'Project'}`, message: `Your role in ${project?.name || 'the project'} changed to ${role}`, actionUrl: `/projects/${currentMember!.project_id}/members`, actionLabel: 'View Members', metadata: { role, member_id: memberId } });

  return { data: data as ProjectMember, error: null };
}

/**
 * Remove a member from a project
 */
export async function removeProjectMember(
  memberId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: currentUser } = await supabase.auth.getUser();

  if (!currentUser.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  // Get member for activity log
  const { data: member } = await supabase
    .from('project_members')
    .select('project_id, user_id, role')
    .eq('id', memberId)
    .single();

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    return { error };
  }

  // Log activity
  await logProjectActivity(
    member!.project_id,
    currentUser.user.id,
    'MEMBER_REMOVED',
    'member',
    memberId,
    {
      removed_user_id: member!.user_id,
      role: member!.role,
    }
  );
  const { data: project } = await supabase.from('projects').select('name').eq('id', member!.project_id).maybeSingle();
  if (member!.user_id !== currentUser.user.id) await notifyUsers({ userIds: [member!.user_id], actorId: currentUser.user.id, projectId: member!.project_id, type: 'MEMBER_ROLE_CHANGED', title: `Removed from Project: ${project?.name || 'Project'}`, message: `You were removed from ${project?.name || 'the project'}`, actionUrl: '/projects', actionLabel: 'View Projects', metadata: { removed_by: currentUser.user.id } });

  return { error: null };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function logProjectActivity(
  projectId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const adminClient = (await import('../supabase-server')).createSupabaseAdminClient();
  await adminClient.from('activity_logs').insert({
    project_id: projectId,
    user_id: userId,
    action: action as any,
    entity_type: entityType as any,
    entity_id: entityId,
    metadata,
  });
}
