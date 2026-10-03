/**
 * RBAC Permission System
 * Core permission definitions and checking functions
 */

// ============================================================================
// Types
// ============================================================================

export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'USER';
export type UserStatus = 'active' | 'inactive';
export type PermissionScope = 'global' | 'project' | 'own';

export interface Permission {
  name: string;
  description: string;
  category: string;
}

export interface RolePermission {
  role: UserRole;
  permission: string;
  scope: PermissionScope;
}

// ============================================================================
// Permission Categories
// ============================================================================

export const PERMISSION_CATEGORIES = {
  project: 'Project',
  task: 'Task',
  team: 'Team',
  admin: 'Admin',
  file: 'File',
  note: 'Note',
} as const;

export type PermissionCategory = keyof typeof PERMISSION_CATEGORIES;

// ============================================================================
// All Permissions (matches database)
// ============================================================================

export const ALL_PERMISSIONS: Permission[] = [
  // Project
  { name: 'project.create', description: 'Create new projects', category: 'project' },
  { name: 'project.read', description: 'View projects', category: 'project' },
  { name: 'project.update', description: 'Update project details', category: 'project' },
  { name: 'project.delete', description: 'Archive/delete projects', category: 'project' },
  { name: 'project.manage_members', description: 'Add/remove project members', category: 'project' },
  { name: 'project.manage_roles', description: 'Change member roles in project', category: 'project' },
  { name: 'project.settings', description: 'Manage project settings', category: 'project' },

  // Task
  { name: 'task.create', description: 'Create tasks', category: 'task' },
  { name: 'task.read', description: 'View tasks', category: 'task' },
  { name: 'task.update', description: 'Update tasks', category: 'task' },
  { name: 'task.delete', description: 'Archive/delete tasks', category: 'task' },
  { name: 'task.assign', description: 'Assign tasks to members', category: 'task' },
  { name: 'task.change_status', description: 'Change task status', category: 'task' },
  { name: 'task.change_priority', description: 'Change task priority', category: 'task' },
  { name: 'task.comment', description: 'Comment on tasks', category: 'task' },
  { name: 'task.attach_files', description: 'Attach files to tasks', category: 'task' },
  { name: 'task.manage_checklists', description: 'Manage task checklists', category: 'task' },
  { name: 'task.manage_tags', description: 'Manage task tags', category: 'task' },

  // Team
  { name: 'team.view_members', description: 'View team members', category: 'team' },
  { name: 'team.add_member', description: 'Add members to projects', category: 'team' },
  { name: 'team.remove_member', description: 'Remove members from projects', category: 'team' },
  { name: 'team.change_role', description: 'Change member project roles', category: 'team' },
  { name: 'team.view_workload', description: 'View member workload', category: 'team' },

  // Admin
  { name: 'admin.create_user', description: 'Create new users', category: 'admin' },
  { name: 'admin.update_user', description: 'Update any user', category: 'admin' },
  { name: 'admin.disable_user', description: 'Disable/enable users', category: 'admin' },
  { name: 'admin.reset_password', description: 'Reset user passwords', category: 'admin' },
  { name: 'admin.change_global_role', description: 'Change user global roles', category: 'admin' },
  { name: 'admin.view_all_projects', description: 'View all projects', category: 'admin' },
  { name: 'admin.view_all_users', description: 'View all users', category: 'admin' },
  { name: 'admin.system_settings', description: 'Manage system settings', category: 'admin' },

  // File
  { name: 'file.upload', description: 'Upload files', category: 'file' },
  { name: 'file.download', description: 'Download files', category: 'file' },
  { name: 'file.delete', description: 'Delete files', category: 'file' },
  { name: 'file.manage', description: 'Manage file settings', category: 'file' },

  // Note
  { name: 'note.create', description: 'Create notes', category: 'note' },
  { name: 'note.read', description: 'Read notes', category: 'note' },
  { name: 'note.update', description: 'Update notes', category: 'note' },
  { name: 'note.delete', description: 'Delete notes', category: 'note' },
  { name: 'note.pin', description: 'Pin/unpin notes', category: 'note' },
];

// ============================================================================
// Default Role Permissions (matches database)
// ============================================================================

export const ROLE_PERMISSIONS: RolePermission[] = [
  // ADMIN - global scope
  { role: 'ADMIN', permission: 'project.create', scope: 'global' },
  { role: 'ADMIN', permission: 'project.read', scope: 'global' },
  { role: 'ADMIN', permission: 'project.update', scope: 'global' },
  { role: 'ADMIN', permission: 'project.delete', scope: 'global' },
  { role: 'ADMIN', permission: 'project.manage_members', scope: 'global' },
  { role: 'ADMIN', permission: 'project.manage_roles', scope: 'global' },
  { role: 'ADMIN', permission: 'project.settings', scope: 'global' },
  { role: 'ADMIN', permission: 'task.create', scope: 'global' },
  { role: 'ADMIN', permission: 'task.read', scope: 'global' },
  { role: 'ADMIN', permission: 'task.update', scope: 'global' },
  { role: 'ADMIN', permission: 'task.delete', scope: 'global' },
  { role: 'ADMIN', permission: 'task.assign', scope: 'global' },
  { role: 'ADMIN', permission: 'task.change_status', scope: 'global' },
  { role: 'ADMIN', permission: 'task.change_priority', scope: 'global' },
  { role: 'ADMIN', permission: 'task.comment', scope: 'global' },
  { role: 'ADMIN', permission: 'task.attach_files', scope: 'global' },
  { role: 'ADMIN', permission: 'task.manage_checklists', scope: 'global' },
  { role: 'ADMIN', permission: 'task.manage_tags', scope: 'global' },
  { role: 'ADMIN', permission: 'team.view_members', scope: 'global' },
  { role: 'ADMIN', permission: 'team.add_member', scope: 'global' },
  { role: 'ADMIN', permission: 'team.remove_member', scope: 'global' },
  { role: 'ADMIN', permission: 'team.change_role', scope: 'global' },
  { role: 'ADMIN', permission: 'team.view_workload', scope: 'global' },
  { role: 'ADMIN', permission: 'admin.create_user', scope: 'global' },
  { role: 'ADMIN', permission: 'admin.update_user', scope: 'global' },
  { role: 'ADMIN', permission: 'admin.disable_user', scope: 'global' },
  { role: 'ADMIN', permission: 'admin.reset_password', scope: 'global' },
  { role: 'ADMIN', permission: 'admin.change_global_role', scope: 'global' },
  { role: 'ADMIN', permission: 'admin.view_all_projects', scope: 'global' },
  { role: 'ADMIN', permission: 'admin.view_all_users', scope: 'global' },
  { role: 'ADMIN', permission: 'admin.system_settings', scope: 'global' },
  { role: 'ADMIN', permission: 'file.upload', scope: 'global' },
  { role: 'ADMIN', permission: 'file.download', scope: 'global' },
  { role: 'ADMIN', permission: 'file.delete', scope: 'global' },
  { role: 'ADMIN', permission: 'file.manage', scope: 'global' },
  { role: 'ADMIN', permission: 'note.create', scope: 'global' },
  { role: 'ADMIN', permission: 'note.read', scope: 'global' },
  { role: 'ADMIN', permission: 'note.update', scope: 'global' },
  { role: 'ADMIN', permission: 'note.delete', scope: 'global' },
  { role: 'ADMIN', permission: 'note.pin', scope: 'global' },

  // PROJECT_MANAGER - project scope
  { role: 'PROJECT_MANAGER', permission: 'project.read', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'project.update', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'project.manage_members', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'project.manage_roles', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'project.settings', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.create', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.read', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.update', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.delete', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.assign', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.change_status', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.change_priority', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.comment', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.attach_files', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.manage_checklists', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'task.manage_tags', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'team.view_members', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'team.add_member', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'team.remove_member', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'team.change_role', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'team.view_workload', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'file.upload', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'file.download', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'file.delete', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'file.manage', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'note.create', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'note.read', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'note.update', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'note.delete', scope: 'project' },
  { role: 'PROJECT_MANAGER', permission: 'note.pin', scope: 'project' },

  // USER - project scope (limited)
  { role: 'USER', permission: 'project.read', scope: 'project' },
  { role: 'USER', permission: 'task.create', scope: 'project' },
  { role: 'USER', permission: 'task.read', scope: 'project' },
  { role: 'USER', permission: 'task.update', scope: 'own' },
  { role: 'USER', permission: 'task.change_status', scope: 'own' },
  { role: 'USER', permission: 'task.comment', scope: 'project' },
  { role: 'USER', permission: 'task.attach_files', scope: 'own' },
  { role: 'USER', permission: 'task.manage_checklists', scope: 'own' },
  { role: 'USER', permission: 'task.manage_tags', scope: 'own' },
  { role: 'USER', permission: 'team.view_members', scope: 'project' },
  { role: 'USER', permission: 'file.upload', scope: 'project' },
  { role: 'USER', permission: 'file.download', scope: 'project' },
  { role: 'USER', permission: 'note.create', scope: 'project' },
  { role: 'USER', permission: 'note.read', scope: 'project' },
  { role: 'USER', permission: 'note.update', scope: 'own' },
  { role: 'USER', permission: 'note.delete', scope: 'own' },
];

// ============================================================================
// Permission Checking Functions (Client-side)
// ============================================================================

/**
 * Check if a role has a specific permission with given scope
 */
export function roleHasPermission(
  role: UserRole,
  permission: string,
  scope: PermissionScope = 'project'
): boolean {
  return ROLE_PERMISSIONS.some(
    rp => rp.role === role && rp.permission === permission && rp.scope === scope
  );
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): RolePermission[] {
  return ROLE_PERMISSIONS.filter(rp => rp.role === role);
}

/**
 * Get permissions grouped by category for a role
 */
export function getPermissionsByCategory(role: UserRole): Record<string, RolePermission[]> {
  const permissions = getPermissionsForRole(role);
  const grouped: Record<string, RolePermission[]> = {};

  for (const perm of permissions) {
    const category = ALL_PERMISSIONS.find(p => p.name === perm.permission)?.category || 'other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(perm);
  }

  return grouped;
}

/**
 * Check if user can perform action on resource
 * Client-side check (should be verified server-side too)
 */
export interface PermissionCheckContext {
  userRole: UserRole;
  userId: string;
  resourceOwnerId?: string; // For 'own' scope checks
  projectId?: string; // For project-scoped checks
}

export function can(
  context: PermissionCheckContext,
  permission: string
): boolean {
  const { userRole, userId, resourceOwnerId, projectId } = context;

  // ADMIN has all permissions globally
  if (userRole === 'ADMIN') return true;

  // Check global scope
  if (roleHasPermission(userRole, permission, 'global')) return true;

  // Check project scope
  if (projectId && roleHasPermission(userRole, permission, 'project')) return true;

  // Check own scope
  if (resourceOwnerId && userId === resourceOwnerId && roleHasPermission(userRole, permission, 'own')) {
    return true;
  }

  return false;
}

// ============================================================================
// Convenience Functions
// ============================================================================

export const permissions = {
  // Project
  canCreateProject: (role: UserRole) => roleHasPermission(role, 'project.create', 'global'),
  canReadProject: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'project.read', 'global') || (projectId ? roleHasPermission(role, 'project.read', 'project') : false),
  canUpdateProject: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'project.update', 'global') || (projectId ? roleHasPermission(role, 'project.update', 'project') : false),
  canDeleteProject: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'project.delete', 'global') || (projectId ? roleHasPermission(role, 'project.delete', 'project') : false),
  canManageProjectMembers: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'project.manage_members', 'global') || (projectId ? roleHasPermission(role, 'project.manage_members', 'project') : false),
  canManageProjectRoles: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'project.manage_roles', 'global') || (projectId ? roleHasPermission(role, 'project.manage_roles', 'project') : false),
  canManageProjectSettings: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'project.settings', 'global') || (projectId ? roleHasPermission(role, 'project.settings', 'project') : false),

  // Task
  canCreateTask: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'task.create', 'global') || (projectId ? roleHasPermission(role, 'task.create', 'project') : false),
  canReadTask: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'task.read', 'global') || (projectId ? roleHasPermission(role, 'task.read', 'project') : false),
  canUpdateTask: (role: UserRole, isOwner: boolean, projectId?: string) => 
    roleHasPermission(role, 'task.update', 'global') || 
    (projectId ? roleHasPermission(role, 'task.update', 'project') : false) || 
    (isOwner && roleHasPermission(role, 'task.update', 'own')),
  canDeleteTask: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'task.delete', 'global') || (projectId ? roleHasPermission(role, 'task.delete', 'project') : false),
  canAssignTask: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'task.assign', 'global') || (projectId ? roleHasPermission(role, 'task.assign', 'project') : false),
  canChangeTaskStatus: (role: UserRole, isOwner: boolean, projectId?: string) => 
    roleHasPermission(role, 'task.change_status', 'global') || 
    (projectId ? roleHasPermission(role, 'task.change_status', 'project') : false) || 
    (isOwner && roleHasPermission(role, 'task.change_status', 'own')),
  canChangeTaskPriority: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'task.change_priority', 'global') || (projectId ? roleHasPermission(role, 'task.change_priority', 'project') : false),
  canCommentOnTask: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'task.comment', 'global') || (projectId ? roleHasPermission(role, 'task.comment', 'project') : false),
  canAttachFilesToTask: (role: UserRole, isOwner: boolean, projectId?: string) => 
    roleHasPermission(role, 'task.attach_files', 'global') || 
    (projectId ? roleHasPermission(role, 'task.attach_files', 'project') : false) || 
    (isOwner && roleHasPermission(role, 'task.attach_files', 'own')),
  canManageChecklists: (role: UserRole, isOwner: boolean, projectId?: string) => 
    roleHasPermission(role, 'task.manage_checklists', 'global') || 
    (projectId ? roleHasPermission(role, 'task.manage_checklists', 'project') : false) || 
    (isOwner && roleHasPermission(role, 'task.manage_checklists', 'own')),
  canManageTags: (role: UserRole, isOwner: boolean, projectId?: string) => 
    roleHasPermission(role, 'task.manage_tags', 'global') || 
    (projectId ? roleHasPermission(role, 'task.manage_tags', 'project') : false) || 
    (isOwner && roleHasPermission(role, 'task.manage_tags', 'own')),

  // Team
  canViewMembers: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'team.view_members', 'global') || (projectId ? roleHasPermission(role, 'team.view_members', 'project') : false),
  canAddMember: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'team.add_member', 'global') || (projectId ? roleHasPermission(role, 'team.add_member', 'project') : false),
  canRemoveMember: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'team.remove_member', 'global') || (projectId ? roleHasPermission(role, 'team.remove_member', 'project') : false),
  canChangeMemberRole: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'team.change_role', 'global') || (projectId ? roleHasPermission(role, 'team.change_role', 'project') : false),
  canViewWorkload: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'team.view_workload', 'global') || (projectId ? roleHasPermission(role, 'team.view_workload', 'project') : false),

  // Admin
  canCreateUser: (role: UserRole) => roleHasPermission(role, 'admin.create_user', 'global'),
  canUpdateUser: (role: UserRole) => roleHasPermission(role, 'admin.update_user', 'global'),
  canDisableUser: (role: UserRole) => roleHasPermission(role, 'admin.disable_user', 'global'),
  canResetPassword: (role: UserRole) => roleHasPermission(role, 'admin.reset_password', 'global'),
  canChangeGlobalRole: (role: UserRole) => roleHasPermission(role, 'admin.change_global_role', 'global'),
  canViewAllProjects: (role: UserRole) => roleHasPermission(role, 'admin.view_all_projects', 'global'),
  canViewAllUsers: (role: UserRole) => roleHasPermission(role, 'admin.view_all_users', 'global'),
  canManageSystemSettings: (role: UserRole) => roleHasPermission(role, 'admin.system_settings', 'global'),

  // File
  canUploadFile: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'file.upload', 'global') || (projectId ? roleHasPermission(role, 'file.upload', 'project') : false),
  canDownloadFile: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'file.download', 'global') || (projectId ? roleHasPermission(role, 'file.download', 'project') : false),
  canDeleteFile: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'file.delete', 'global') || (projectId ? roleHasPermission(role, 'file.delete', 'project') : false),
  canManageFile: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'file.manage', 'global') || (projectId ? roleHasPermission(role, 'file.manage', 'project') : false),

  // Note
  canCreateNote: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'note.create', 'global') || (projectId ? roleHasPermission(role, 'note.create', 'project') : false),
  canReadNote: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'note.read', 'global') || (projectId ? roleHasPermission(role, 'note.read', 'project') : false),
  canUpdateNote: (role: UserRole, isOwner: boolean, projectId?: string) => 
    roleHasPermission(role, 'note.update', 'global') || 
    (projectId ? roleHasPermission(role, 'note.update', 'project') : false) || 
    (isOwner && roleHasPermission(role, 'note.update', 'own')),
  canDeleteNote: (role: UserRole, isOwner: boolean, projectId?: string) => 
    roleHasPermission(role, 'note.delete', 'global') || 
    (projectId ? roleHasPermission(role, 'note.delete', 'project') : false) || 
    (isOwner && roleHasPermission(role, 'note.delete', 'own')),
  canPinNote: (role: UserRole, projectId?: string) => 
    roleHasPermission(role, 'note.pin', 'global') || (projectId ? roleHasPermission(role, 'note.pin', 'project') : false),
};

// ============================================================================
// Role Hierarchy
// ============================================================================

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 3,
  PROJECT_MANAGER: 2,
  USER: 1,
};

export function isRoleHigherOrEqual(role: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
}

export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function isProjectManager(role: UserRole): boolean {
  return role === 'PROJECT_MANAGER' || role === 'ADMIN';
}

// ============================================================================
// Project Role (separate from global role)
// ============================================================================

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export function isProjectRoleHigherOrEqual(role: ProjectRole, minimumRole: ProjectRole): boolean {
  return PROJECT_ROLE_HIERARCHY[role] >= PROJECT_ROLE_HIERARCHY[minimumRole];
}

export function canManageProjectMember(actorRole: ProjectRole, targetRole: ProjectRole): boolean {
  // Can only manage members with lower role
  return PROJECT_ROLE_HIERARCHY[actorRole] > PROJECT_ROLE_HIERARCHY[targetRole];
}

export function canChangeToRole(actorRole: ProjectRole, newRole: ProjectRole): boolean {
  // Can only assign roles lower than or equal to own role (except OWNER)
  if (actorRole === 'OWNER') return true;
  return PROJECT_ROLE_HIERARCHY[actorRole] >= PROJECT_ROLE_HIERARCHY[newRole];
}