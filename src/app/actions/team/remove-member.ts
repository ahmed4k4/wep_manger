/**
 * Team Management - Remove Member Server Action
 */

'use server';

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { requireProjectAdmin, checkPermission, canRemoveMember } from '@/lib/authorization';
import type { ProjectRole } from '@/types/project';

export interface RemoveMemberInput {
  projectId: string;
  memberId: string; // The user_id of the member to remove
}

export interface RemoveMemberResult {
  success: boolean;
  error?: string;
  code?: string;
}

/**
 * Remove a member from a project
 */
export async function removeProjectMember(
  input: RemoveMemberInput
): Promise<RemoveMemberResult> {
  try {
    const { user, membership } = await requireProjectAdmin(input.projectId);

    // Check permission to remove members
    const canRemove = await checkPermission(user.id, 'team.remove_member', input.projectId);
    if (!canRemove) {
      return { success: false, error: 'Permission denied', code: 'FORBIDDEN' };
    }

    // Check if user can remove this specific member
    const canRemoveTarget = await canRemoveMember(user.id, input.projectId, input.memberId);
    if (!canRemoveTarget) {
      return { success: false, error: 'Cannot remove this member', code: 'FORBIDDEN' };
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

    // Prevent removing the project owner
    if (member.role === 'OWNER') {
      return { success: false, error: 'Cannot remove project owner', code: 'FORBIDDEN' };
    }

    // Prevent removing the last admin (if target is admin and no other admins)
    if (member.role === 'ADMIN') {
      const { count: adminCount } = await supabase
        .from('project_members')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', input.projectId)
        .in('role', ['OWNER', 'ADMIN']);

      if ((adminCount || 0) <= 1) {
        return { success: false, error: 'Cannot remove the last project admin', code: 'FORBIDDEN' };
      }
    }

    // Remove member
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', input.projectId)
      .eq('user_id', input.memberId);

    if (error) {
      console.error('Error removing member:', error);
      return { success: false, error: error.message, code: 'DATABASE_ERROR' };
    }

    // Log activity
    const adminClient = (await import('@/lib/db/supabase-server')).createSupabaseAdminClient();
    await adminClient.from('activity_logs').insert({
      project_id: input.projectId,
      user_id: user.id,
      action: 'MEMBER_REMOVED',
      entity_type: 'member',
      entity_id: member.id,
      metadata: {
        removed_user_id: input.memberId,
        removed_role: member.role,
        removed_by: user.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('removeProjectMember error:', error);
    if (error instanceof Error && error.name === 'AuthorizationError') {
      return { success: false, error: error.message, code: (error as any).code };
    }
    return { success: false, error: 'Failed to remove member', code: 'INTERNAL_ERROR' };
  }
}