/**
 * Project Server Actions
 * Server-side mutations for projects - called from Client Components
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createProject as createProjectQuery,
  updateProject as updateProjectQuery,
  deleteProject as deleteProjectQuery,
  addProjectMember as addProjectMemberQuery,
  updateProjectMemberRole as updateProjectMemberRoleQuery,
  removeProjectMember as removeProjectMemberQuery,
  getUserProjectRole,
  hasProjectPermission,
} from '@/lib/db/queries/projects';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectMember,
} from '@/types/project';

// ============================================================================
// Project Actions
// ============================================================================

/**
 * Create a new project
 */
export async function createProjectAction(
  input: CreateProjectInput
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const { data, error } = await createProjectQuery(input);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/projects');
    return { success: true, projectId: data!.id };
  } catch (err) {
    return { success: false, error: 'Failed to create project' };
  }
}

/**
 * Update a project
 */
export async function updateProjectAction(
  projectId: string,
  input: UpdateProjectInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await updateProjectQuery(projectId, input);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/projects');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update project' };
  }
}

/**
 * Delete (archive) a project
 */
export async function deleteProjectAction(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await deleteProjectQuery(projectId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/projects');
    redirect('/projects');
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
      throw err;
    }
    return { success: false, error: 'Failed to delete project' };
  }
}

// ============================================================================
// Project Member Actions
// ============================================================================

/**
 * Add a member to a project
 */
export async function addProjectMemberAction(
  projectId: string,
  userId: string,
  role: ProjectMember['role'] = 'MEMBER'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(role)) return { success: false, error: 'Invalid project role' };
    // Verify current user has permission to add members
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const canAdd = await hasProjectPermission(projectId, userData.user.id, ['OWNER', 'ADMIN']);
    if (!canAdd) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const { error } = await addProjectMemberQuery(projectId, userId, role);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${projectId}/members`);
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to add member' };
  }
}

export async function addProjectMemberByEmailAction(
  projectId: string,
  email: string,
  role: ProjectMember['role'] = 'MEMBER'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { success: false, error: 'Unauthorized' };
    if (!(await hasProjectPermission(projectId, userData.user.id, ['OWNER', 'ADMIN']))) {
      return { success: false, error: 'Insufficient permissions' };
    }
    const actorRole = await getUserProjectRole(projectId, userData.user.id);
    if (actorRole === 'ADMIN' && role !== 'MEMBER' && role !== 'VIEWER') {
      return { success: false, error: 'Admins can only add members or viewers' };
    }
    if (role === 'OWNER') return { success: false, error: 'The project owner cannot be changed here' };

    const normalizedEmail = email.trim().toLowerCase();
    const admin = await createSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (profileError || !profile) return { success: false, error: 'No account was found for that email address' };

    const { error } = await addProjectMemberQuery(projectId, profile.id, role);
    if (error) return { success: false, error: error.code === '23505' ? 'This person is already a project member' : error.message };
    revalidatePath(`/projects/${projectId}/members`);
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to add member' };
  }
}

/**
 * Update a project member's role
 */
export async function updateProjectMemberRoleAction(
  projectId: string,
  memberId: string,
  role: ProjectMember['role']
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get current user's role
    const currentUserRole = await getUserProjectRole(projectId, userData.user.id);

    // Check permissions
    if (currentUserRole !== 'OWNER' && currentUserRole !== 'ADMIN') {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Owners can promote to any role, Admins can only promote to MEMBER/VIEWER
    if (currentUserRole === 'ADMIN' && role === 'OWNER') {
      return { success: false, error: 'Only owners can assign OWNER role' };
    }
    if (currentUserRole === 'ADMIN' && role !== 'MEMBER' && role !== 'VIEWER') {
      return { success: false, error: 'Admins can only assign MEMBER or VIEWER roles' };
    }

    // Cannot demote the project owner
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('id', memberId)
      .single();

    if (member?.role === 'OWNER') {
      return { success: false, error: 'Cannot change owner role' };
    }

    const { error } = await updateProjectMemberRoleQuery(memberId, role);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${projectId}/members`);
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update member role' };
  }
}

/**
 * Remove a member from a project
 */
export async function removeProjectMemberAction(
  projectId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check permissions
    const canRemove = await hasProjectPermission(projectId, userData.user.id, ['OWNER', 'ADMIN']);
    const { data: member } = await supabase
      .from('project_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('project_id', projectId)
      .single();

    if (!member) {
      return { success: false, error: 'Member not found' };
    }

    if (!canRemove && userData.user.id !== member.user_id) {
      // Users can only remove themselves (leave)
      return { success: false, error: 'Insufficient permissions' };
    }

    // Cannot remove the project owner
    if (member?.role === 'OWNER') {
      return { success: false, error: 'Cannot remove project owner' };
    }

    const { error } = await removeProjectMemberQuery(memberId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${projectId}/members`);
    revalidatePath(`/projects/${projectId}`);

    // If user removed themselves, redirect
    if (userData.user.id === member.user_id) {
      redirect('/projects');
    }

    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
      throw err;
    }
    return { success: false, error: 'Failed to remove member' };
  }
}
