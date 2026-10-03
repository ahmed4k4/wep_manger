/**
 * Server-side Authorization Helpers
 * Used in Server Actions, API Routes, and Server Components
 * These functions verify permissions against the database
 */

import { cache } from 'react';
import { createSupabaseServerClient, createSupabaseAdminClient } from './db/supabase-server';
import { getAuthUser } from './db/auth-user';
import type { UserRole, UserStatus, ProjectRole, Profile } from '@/types/project';

// ============================================================================
// Authentication Helpers
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

/**
 * Get the current authenticated user with profile info
 * Throws if not authenticated
 */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser> => {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, global_role, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  if (profile.status !== 'active') {
    throw new Error('USER_INACTIVE');
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.global_role as UserRole,
    status: profile.status as UserStatus,
  };
});

/**
 * Get current user without throwing (returns null if not authenticated)
 */
export async function getOptionalUser(): Promise<AuthenticatedUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/**
 * Get user profile by ID (server-side, uses admin client for full access)
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

// ============================================================================
// Project Membership Helpers
// ============================================================================

export interface ProjectMembership {
  user_id: string;
  project_id: string;
  role: ProjectRole;
  joined_at: string;
  profile?: Profile;
}

/**
 * Get user's project membership
 */
export async function getProjectMembership(
  projectId: string,
  userId: string
): Promise<ProjectMembership | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      profile:profiles!project_members_user_id_fkey(*)
    `)
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as ProjectMembership;
}

/**
 * Get user's project role
 */
export async function getUserProjectRole(
  projectId: string,
  userId: string
): Promise<ProjectRole | null> {
  const membership = await getProjectMembership(projectId, userId);
  return membership?.role || null;
}

/**
 * Check if user is a member of a project
 */
export async function isProjectMember(
  projectId: string,
  userId: string
): Promise<boolean> {
  const membership = await getProjectMembership(projectId, userId);
  return membership !== null;
}

/**
 * Check if user is project admin/owner
 */
export async function isProjectAdmin(
  projectId: string,
  userId: string
): Promise<boolean> {
  const membership = await getProjectMembership(projectId, userId);
  return membership !== null && ['OWNER', 'ADMIN'].includes(membership.role);
}

/**
 * Check if user is project owner
 */
export async function isProjectOwner(
  projectId: string,
  userId: string
): Promise<boolean> {
  const membership = await getProjectMembership(projectId, userId);
  return membership !== null && membership.role === 'OWNER';
}

// ============================================================================
// Permission Checking (Server-side, uses database functions)
// ============================================================================

/**
 * Check if user has a specific permission
 * Uses the database function `user_has_permission`
 */
export async function checkPermission(
  userId: string,
  permission: string,
  projectId?: string
): Promise<boolean> {
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.rpc('user_has_permission', {
    p_user_id: userId,
    p_permission_name: permission,
    p_project_id: projectId,
  });

  if (error) {
    console.error('Permission check error:', error);
    return false;
  }

  return data === true;
}

/**
 * Check if user is admin (global)
 */
export const checkIsAdmin = cache(async (userId: string): Promise<boolean> => {
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.rpc('is_admin', {
    p_user_id: userId,
  });

  if (error) return false;
  return data === true;
});

/**
 * Check if user is project manager (global or project-specific)
 */
export const checkIsProjectManager = cache(
  async (userId: string, projectId?: string): Promise<boolean> => {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.rpc('is_project_manager', {
      p_user_id: userId,
      p_project_id: projectId,
    });

    if (error) return false;
    return data === true;
  }
);

// ============================================================================
// Authorization Functions (Throw on failure)
// ============================================================================

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly requiredPermission?: string,
    public readonly projectId?: string
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Require authentication
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getOptionalUser();
  if (!user) {
    throw new AuthorizationError('Authentication required', 'UNAUTHORIZED');
  }
  return user;
}

/**
 * Require specific permission
 */
export async function requirePermission(
  permission: string,
  projectId?: string
): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  const hasPermission = await checkPermission(user.id, permission, projectId);

  if (!hasPermission) {
    throw new AuthorizationError(
      `Permission denied: ${permission}`,
      'FORBIDDEN',
      permission,
      projectId
    );
  }

  return user;
}

/**
 * Require project membership
 */
export async function requireProjectMember(
  projectId: string
): Promise<{ user: AuthenticatedUser; membership: ProjectMembership }> {
  const user = await requireAuth();
  const membership = await getProjectMembership(projectId, user.id);

  if (!membership) {
    throw new AuthorizationError(
      'Not a member of this project',
      'NOT_PROJECT_MEMBER',
      undefined,
      projectId
    );
  }

  return { user, membership };
}

/**
 * Require project admin/owner
 */
export async function requireProjectAdmin(
  projectId: string
): Promise<{ user: AuthenticatedUser; membership: ProjectMembership }> {
  const { user, membership } = await requireProjectMember(projectId);

  if (!['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new AuthorizationError(
      'Project admin or owner role required',
      'FORBIDDEN',
      'project.manage_members',
      projectId
    );
  }

  return { user, membership };
}

/**
 * Require project owner
 */
export async function requireProjectOwner(
  projectId: string
): Promise<{ user: AuthenticatedUser; membership: ProjectMembership }> {
  const { user, membership } = await requireProjectMember(projectId);

  if (membership.role !== 'OWNER') {
    throw new AuthorizationError(
      'Project owner role required',
      'FORBIDDEN',
      'project.manage_members',
      projectId
    );
  }

  return { user, membership };
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  const isAdmin = await checkIsAdmin(user.id);

  if (!isAdmin) {
    throw new AuthorizationError(
      'Admin role required',
      'FORBIDDEN',
      'admin.system_settings'
    );
  }

  return user;
}

/**
 * Check if user can access a project (member or admin)
 */
export async function canAccessProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const isAdmin = await checkIsAdmin(userId);
  if (isAdmin) return true;

  return isProjectMember(projectId, userId);
}

/**
 * Check if user can manage a project
 */
export async function canManageProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const isAdmin = await checkIsAdmin(userId);
  if (isAdmin) return true;

  return isProjectAdmin(projectId, userId);
}

/**
 * Check if user can manage project members
 */
export async function canManageProjectMembers(
  userId: string,
  projectId: string
): Promise<boolean> {
  const isAdmin = await checkIsAdmin(userId);
  if (isAdmin) return true;

  const membership = await getProjectMembership(projectId, userId);
  return membership !== null && ['OWNER', 'ADMIN'].includes(membership.role);
}

/**
 * Check if user can change another member's role
 */
export async function canChangeMemberRole(
  actorUserId: string,
  projectId: string,
  targetRole: ProjectRole
): Promise<boolean> {
  const isAdmin = await checkIsAdmin(actorUserId);
  if (isAdmin) return true;

  const actorMembership = await getProjectMembership(projectId, actorUserId);
  if (!actorMembership) return false;

  // Can only assign roles lower than or equal to own role (except OWNER)
  if (actorMembership.role === 'OWNER') return true;

  const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  };

  return PROJECT_ROLE_HIERARCHY[actorMembership.role] >= PROJECT_ROLE_HIERARCHY[targetRole];
}

/**
 * Check if user can remove a member
 */
export async function canRemoveMember(
  actorUserId: string,
  projectId: string,
  targetUserId: string
): Promise<boolean> {
  const isAdmin = await checkIsAdmin(actorUserId);
  if (isAdmin) return true;

  // Users cannot remove themselves
  if (actorUserId === targetUserId) return false;

  const actorMembership = await getProjectMembership(projectId, actorUserId);
  const targetMembership = await getProjectMembership(projectId, targetUserId);

  if (!actorMembership || !targetMembership) return false;

  // Can only remove members with lower role
  const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  };

  return PROJECT_ROLE_HIERARCHY[actorMembership.role] > PROJECT_ROLE_HIERARCHY[targetMembership.role];
}

/**
 * Check if user can access a task
 */
export async function canAccessTask(
  userId: string,
  taskId: string
): Promise<boolean> {
  const adminClient = createSupabaseAdminClient();

  // Get task with project
  const { data: task } = await adminClient
    .from('tasks')
    .select('project_id, assignee_id, created_by')
    .eq('id', taskId)
    .single();

  if (!task) return false;

  // Admin can access all
  const isAdmin = await checkIsAdmin(userId);
  if (isAdmin) return true;

  // Project member can access
  const isMember = await isProjectMember(task.project_id, userId);
  if (isMember) return true;

  return false;
}

/**
 * Check if user can manage a task
 */
export async function canManageTask(
  userId: string,
  taskId: string
): Promise<boolean> {
  const adminClient = createSupabaseAdminClient();

  const { data: task } = await adminClient
    .from('tasks')
    .select('project_id, assignee_id, created_by')
    .eq('id', taskId)
    .single();

  if (!task) return false;

  // Admin can manage all
  const isAdmin = await checkIsAdmin(userId);
  if (isAdmin) return true;

  // Project admin/owner can manage
  const isProjectAdminResult = await isProjectAdmin(task.project_id, userId);
  if (isProjectAdminResult) return true;

  // Assignee can manage
  if (task.assignee_id === userId) return true;

  // Creator can manage
  if (task.created_by === userId) return true;

  return false;
}

/**
 * Check if user can assign a task
 */
export async function canAssignTask(
  userId: string,
  projectId: string
): Promise<boolean> {
  const isAdmin = await checkIsAdmin(userId);
  if (isAdmin) return true;

  return isProjectAdmin(projectId, userId);
}

// ============================================================================
// Server Action Wrapper with Authorization
// ============================================================================

export interface ServerActionOptions<TInput, TOutput> {
  permission?: string;
  projectId?: (input: TInput) => string | undefined;
  requireAuth?: boolean;
  validate?: (input: TInput) => Promise<{ success: boolean; error?: string }>;
  handler: (input: TInput, user: AuthenticatedUser) => Promise<TOutput>;
}

/**
 * Create a server action with built-in authorization
 */
export function createAuthorizedAction<TInput, TOutput>(
  options: ServerActionOptions<TInput, TOutput>
) {
  return async (input: TInput): Promise<{ success: boolean; data?: TOutput; error?: string; code?: string }> => {
    try {
      // Authenticate
      const user = options.requireAuth !== false ? await requireAuth() : await getOptionalUser();
      if (options.requireAuth !== false && !user) {
        return { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' };
      }

      // Validate input
      if (options.validate) {
        const validation = await options.validate(input);
        if (!validation.success) {
          return { success: false, error: validation.error, code: 'VALIDATION_ERROR' };
        }
      }

      // Check permission
      if (options.permission && user) {
        const projectId = options.projectId ? options.projectId(input) : undefined;
        const hasPermission = await checkPermission(user.id, options.permission, projectId);

        if (!hasPermission) {
          return {
            success: false,
            error: `Permission denied: ${options.permission}`,
            code: 'FORBIDDEN',
          };
        }
      }

      // Execute handler
      if (!user) {
        return { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' };
      }

      const data = await options.handler(input, user);
      return { success: true, data };
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return { success: false, error: error.message, code: error.code };
      }
      console.error('Server action error:', error);
      return { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' };
    }
  };
}

// ============================================================================
// Admin-only Actions Helper
// ============================================================================

export function createAdminAction<TInput, TOutput>(
  handler: (input: TInput, user: AuthenticatedUser) => Promise<TOutput>,
  validate?: (input: TInput) => Promise<{ success: boolean; error?: string }>
) {
  return createAuthorizedAction<TInput, TOutput>({
    permission: 'admin.system_settings',
    requireAuth: true,
    validate,
    handler,
  });
}

// ============================================================================
// Project-scoped Actions Helper
// ============================================================================

export function createProjectAction<TInput extends { projectId: string }, TOutput>(
  permission: string,
  handler: (input: TInput, user: AuthenticatedUser, membership: ProjectMembership) => Promise<TOutput>,
  validate?: (input: TInput) => Promise<{ success: boolean; error?: string }>
) {
  return createAuthorizedAction<TInput, TOutput>({
    permission,
    projectId: (input) => input.projectId,
    requireAuth: true,
    validate,
    handler: async (input, user) => {
      const membership = await getProjectMembership(input.projectId, user.id);
      if (!membership) {
        throw new AuthorizationError('Not a member of this project', 'NOT_PROJECT_MEMBER', undefined, input.projectId);
      }
      return handler(input, user, membership);
    },
  });
}