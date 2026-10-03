/**
 * Team Management - Add Member Server Action
 */

'use server';

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { requireProjectAdmin, checkPermission, canChangeMemberRole } from '@/lib/authorization';
import type { ProjectRole, Profile } from '@/types/project';

export interface AddMemberInput {
  projectId: string;
  userId: string;
  role?: ProjectRole;
}

export interface AddMemberResult {
  success: boolean;
  data?: {
    id: string;
    project_id: string;
    user_id: string;
    role: ProjectRole;
    joined_at: string;
    profile: Profile;
  };
  error?: string;
  code?: string;
}

/**
 * Add a member to a project
 */
export async function addProjectMember(
  input: AddMemberInput
): Promise<AddMemberResult> {
  try {
    // Verify project admin permissions
    const { user, membership } = await requireProjectAdmin(input.projectId);

    // Check permission to add members
    const canAdd = await checkPermission(user.id, 'team.add_member', input.projectId);
    if (!canAdd) {
      return { success: false, error: 'Permission denied', code: 'FORBIDDEN' };
    }

    // Check if user can assign the requested role
    const targetRole = input.role || 'MEMBER';
    const canAssignRole = await canChangeMemberRole(user.id, input.projectId, targetRole);
    if (!canAssignRole) {
      return { success: false, error: 'Cannot assign this role', code: 'INVALID_ROLE' };
    }

    const supabase = await createSupabaseServerClient();

    // Check if user exists
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, global_role, status')
      .eq('id', input.userId)
      .single();

    if (!targetProfile) {
      return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
    }

    if (targetProfile.status !== 'active') {
      return { success: false, error: 'User is not active', code: 'USER_INACTIVE' };
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', input.projectId)
      .eq('user_id', input.userId)
      .single();

    if (existingMember) {
      return { success: false, error: 'User is already a member of this project', code: 'ALREADY_MEMBER' };
    }

    // Add member
    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: input.projectId,
        user_id: input.userId,
        role: targetRole,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      })
      .select(`
        *,
        profile:profiles!project_members_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          global_role,
          status,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      console.error('Error adding member:', error);
      return { success: false, error: error.message, code: 'DATABASE_ERROR' };
    }

    // Log activity
    const adminClient = (await import('@/lib/db/supabase-server')).createSupabaseAdminClient();
    await adminClient.from('activity_logs').insert({
      project_id: input.projectId,
      user_id: user.id,
      action: 'MEMBER_INVITED',
      entity_type: 'member',
      entity_id: data.id,
      metadata: {
        added_user_id: input.userId,
        role: targetRole,
        added_by: user.id,
      },
    });

    return {
      success: true,
      data: {
        id: data.id,
        project_id: data.project_id,
        user_id: data.user_id,
        role: data.role,
        joined_at: data.joined_at,
        profile: data.profile,
      },
    };
  } catch (error) {
    console.error('addProjectMember error:', error);
    if (error instanceof Error && error.name === 'AuthorizationError') {
      return { success: false, error: error.message, code: (error as any).code };
    }
    return { success: false, error: 'Failed to add member', code: 'INTERNAL_ERROR' };
  }
}

/**
 * Invite a user to a project (sends invitation email)
 */
export async function inviteProjectMember(
  input: AddMemberInput & { email?: string }
): Promise<AddMemberResult> {
  try {
    const { user, membership } = await requireProjectAdmin(input.projectId);

    const canAdd = await checkPermission(user.id, 'team.add_member', input.projectId);
    if (!canAdd) {
      return { success: false, error: 'Permission denied', code: 'FORBIDDEN' };
    }

    const targetRole = input.role || 'MEMBER';
    const canAssignRole = await canChangeMemberRole(user.id, input.projectId, targetRole);
    if (!canAssignRole) {
      return { success: false, error: 'Cannot assign this role', code: 'INVALID_ROLE' };
    }

    const supabase = await createSupabaseServerClient();

    let targetUserId = input.userId;

    // If email provided, find or create user
    if (input.email && !input.userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', input.email)
        .single();

      if (profile) {
        targetUserId = profile.id;
      } else {
        // User doesn't exist - would need to send invitation
        // For now, return error
        return { success: false, error: 'User not found. Please ask them to sign up first.', code: 'USER_NOT_FOUND' };
      }
    }

    if (!targetUserId) {
      return { success: false, error: 'User ID or email required', code: 'VALIDATION_ERROR' };
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', input.projectId)
      .eq('user_id', targetUserId)
      .single();

    if (existingMember) {
      return { success: false, error: 'User is already a member of this project', code: 'ALREADY_MEMBER' };
    }

    // Add member with invited status
    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: input.projectId,
        user_id: targetUserId,
        role: targetRole,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        accepted_at: null, // Will be set when user accepts
      })
      .select(`
        *,
        profile:profiles!project_members_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url,
          global_role,
          status,
          created_at,
          updated_at
        )
      `)
      .single();

    if (error) {
      console.error('Error inviting member:', error);
      return { success: false, error: error.message, code: 'DATABASE_ERROR' };
    }

    // Log activity
    const adminClient = (await import('@/lib/db/supabase-server')).createSupabaseAdminClient();
    await adminClient.from('activity_logs').insert({
      project_id: input.projectId,
      user_id: user.id,
      action: 'MEMBER_INVITED',
      entity_type: 'member',
      entity_id: data.id,
      metadata: {
        invited_user_id: targetUserId,
        role: targetRole,
        invited_by: user.id,
      },
    });

    // TODO: Send invitation email/notification

    return {
      success: true,
      data: {
        id: data.id,
        project_id: data.project_id,
        user_id: data.user_id,
        role: data.role,
        joined_at: data.joined_at,
        profile: data.profile,
      },
    };
  } catch (error) {
    console.error('inviteProjectMember error:', error);
    if (error instanceof Error && error.name === 'AuthorizationError') {
      return { success: false, error: error.message, code: (error as any).code };
    }
    return { success: false, error: 'Failed to invite member', code: 'INTERNAL_ERROR' };
  }
}