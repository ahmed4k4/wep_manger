/**
 * Team Management - Update Member Role Server Action
 */

'use server';

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { requireProjectAdmin, checkPermission, canChangeMemberRole } from '@/lib/authorization';
import type { ProjectRole } from '@/types/project';

export interface UpdateMemberRoleInput {
  projectId: string;
  memberId: string; // The user_id of the member to update
  role: ProjectRole;
}

export interface UpdateMemberRoleResult {
  success: boolean;
  data?: {
    id: string;
    project_id: string;
    user_id: string;
    role: ProjectRole;
    joined_at: string;
  };
  error?: string;
  code?: string;
}

/**
 * Update a member's project role
 */
export async function updateProjectMemberRole(
  input: UpdateMemberRoleInput
): Promise<UpdateMemberRoleResult> {
  try {
    const { user, membership } = await requireProjectAdmin(input.projectId);

    // Check permission to change roles
    const canChange = await checkPermission(user.id, 'team.change_role', input.projectId);
    if (!canChange) {
      return { success: false, error: 'Permission denied', code: 'FORBIDDEN' };
    }

    // Check if user can assign this role
    const canAssign = await canChangeMemberRole(user.id, input.projectId, input.role);
    if (!canAssign) {
      return { success: false, error: 'Cannot assign this role', code: 'INVALID_ROLE' };
    }

    const supabase = await createSupabaseServerClient();

    // Check if member exists
    const { data: member } = await supabase
      .from('project_members')
      .select('id, user_id, role')
      .eq('project_id', input.projectId)
      .eq('user_id', input.memberId)
      .single();

    if (!member) {
      return { success: false, error: 'Member not found', code: 'NOT_FOUND' };
    }

    // Prevent changing the project owner's role
    if (member.role === 'OWNER') {
      return { success: false, error: 'Cannot change project owner role', code: 'FORBIDDEN' };
    }

    // Prevent demoting the last admin
    if (member.role === 'ADMIN' && input.role !== 'ADMIN' && input.role !== 'OWNER') {
      const { count: adminCount } = await supabase
        .from('project_members')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', input.projectId)
        .in('role', ['OWNER', 'ADMIN']);

      if ((adminCount || 0) <= 1) {
        return { success: false, error: 'Cannot demote the last project admin', code: 'FORBIDDEN' };
      }
    }

    // Update role
    const { data, error } = await supabase
      .from('project_members')
      .update({ role: input.role })
      .eq('project_id', input.projectId)
      .eq('user_id', input.memberId)
      .select('id, project_id, user_id, role, joined_at')
      .single();

    if (error) {
      console.error('Error updating member role:', error);
      return { success: false, error: error.message, code: 'DATABASE_ERROR' };
    }

    // Log activity
    const adminClient = (await import('@/lib/db/supabase-server')).createSupabaseAdminClient();
    await adminClient.from('activity_logs').insert({
      project_id: input.projectId,
      user_id: user.id,
      action: 'MEMBER_ROLE_CHANGED',
      entity_type: 'member',
      entity_id: data.id,
      metadata: {
        target_user_id: input.memberId,
        previous_role: member.role,
        new_role: input.role,
        changed_by: user.id,
      },
    });

    return { success: true, data };
  } catch (error) {
    console.error('updateProjectMemberRole error:', error);
    if (error instanceof Error && error.name === 'AuthorizationError') {
      return { success: false, error: error.message, code: (error as any).code };
    }
    return { success: false, error: 'Failed to update member role', code: 'INTERNAL_ERROR' };
  }
}