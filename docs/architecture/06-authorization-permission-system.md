# Authorization & Permission System

## Overview

This document defines the authorization architecture using a **Role-Based Access Control (RBAC)** model with **Resource-Level Permissions** and **Project-Scoped Access Control**. The system supports three user roles (Admin, Project Manager, User) with fine-grained permissions per project.

---

## 1. Permission Model

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Role** | Global role: ADMIN, PROJECT_MANAGER, USER |
| **Permission** | Atomic action: `tasks:create`, `projects:delete` |
| **Resource** | Entity being accessed: Project, Task, File, Note |
| **Scope** | Context: Global, Project, Own |
| **Policy** | Rule combining role + permission + scope |

### Permission Registry (`shared/constants/permissions.ts`)
```typescript
export const PERMISSIONS = {
  // Global permissions (Admin only)
  USERS: {
    LIST: 'users:list',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    IMPERSONATE: 'users:impersonate',
  },
  PROJECTS: {
    LIST_ALL: 'projects:list_all',
    CREATE: 'projects:create',
    UPDATE_ANY: 'projects:update_any',
    DELETE_ANY: 'projects:delete_any',
    ARCHIVE_ANY: 'projects:archive_any',
  },
  SETTINGS: {
    MANAGE: 'settings:manage',
    VIEW_LOGS: 'settings:view_logs',
  },

  // Project-scoped permissions
  PROJECT: {
    VIEW: 'project:view',
    UPDATE: 'project:update',
    DELETE: 'project:delete',
    ARCHIVE: 'project:archive',
    MANAGE_MEMBERS: 'project:manage_members',
    MANAGE_SETTINGS: 'project:manage_settings',
    VIEW_ACTIVITY: 'project:view_activity',
  },

  TASKS: {
    CREATE: 'tasks:create',
    VIEW: 'tasks:view',
    UPDATE: 'tasks:update',
    DELETE: 'tasks:delete',
    UPDATE_STATUS: 'tasks:update_status',
    UPDATE_ASSIGNEE: 'tasks:update_assignee',
    UPDATE_PRIORITY: 'tasks:update_priority',
    COMMENT: 'tasks:comment',
    VIEW_ALL: 'tasks:view_all',
  },

  MEMBERS: {
    INVITE: 'members:invite',
    REMOVE: 'members:remove',
    UPDATE_ROLE: 'members:update_role',
    VIEW: 'members:view',
  },

  FILES: {
    UPLOAD: 'files:upload',
    VIEW: 'files:view',
    DOWNLOAD: 'files:download',
    DELETE: 'files:delete',
    DELETE_OWN: 'files:delete_own',
  },

  NOTES: {
    CREATE: 'notes:create',
    VIEW: 'notes:view',
    UPDATE: 'notes:update',
    DELETE: 'notes:delete',
    UPDATE_OWN: 'notes:update_own',
    DELETE_OWN: 'notes:delete_own',
    VIEW_PRIVATE: 'notes:view_private',
  },

  COMMENTS: {
    CREATE: 'comments:create',
    UPDATE_OWN: 'comments:update_own',
    DELETE_OWN: 'comments:delete_own',
    DELETE_ANY: 'comments:delete_any',
  },

  ACTIVITY: {
    VIEW: 'activity:view',
  },

  NOTIFICATIONS: {
    VIEW: 'notifications:view',
    MARK_READ: 'notifications:mark_read',
  },
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS][keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]];
```

---

## 2. Role-Permission Mapping

### Global Role Permissions
```typescript
// shared/constants/rolePermissions.ts
import { PERMISSIONS } from './permissions';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    ...Object.values(PERMISSIONS.USERS),
    ...Object.values(PERMISSIONS.PROJECTS),
    ...Object.values(PERMISSIONS.SETTINGS),
  ],
  PROJECT_MANAGER: [
    PERMISSIONS.PROJECTS.CREATE,
  ],
  USER: [],
};
```

### Project Role Permissions
```typescript
// shared/constants/projectRolePermissions.ts
import { PERMISSIONS } from './permissions';

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, Permission[]> = {
  OWNER: [
    PERMISSIONS.PROJECT.VIEW,
    PERMISSIONS.PROJECT.UPDATE,
    PERMISSIONS.PROJECT.DELETE,
    PERMISSIONS.PROJECT.ARCHIVE,
    PERMISSIONS.PROJECT.MANAGE_MEMBERS,
    PERMISSIONS.PROJECT.MANAGE_SETTINGS,
    PERMISSIONS.PROJECT.VIEW_ACTIVITY,
    PERMISSIONS.TASKS.CREATE,
    PERMISSIONS.TASKS.VIEW,
    PERMISSIONS.TASKS.UPDATE,
    PERMISSIONS.TASKS.DELETE,
    PERMISSIONS.TASKS.UPDATE_STATUS,
    PERMISSIONS.TASKS.UPDATE_ASSIGNEE,
    PERMISSIONS.TASKS.UPDATE_PRIORITY,
    PERMISSIONS.TASKS.COMMENT,
    PERMISSIONS.TASKS.VIEW_ALL,
    PERMISSIONS.MEMBERS.INVITE,
    PERMISSIONS.MEMBERS.REMOVE,
    PERMISSIONS.MEMBERS.UPDATE_ROLE,
    PERMISSIONS.MEMBERS.VIEW,
    PERMISSIONS.FILES.UPLOAD,
    PERMISSIONS.FILES.VIEW,
    PERMISSIONS.FILES.DOWNLOAD,
    PERMISSIONS.FILES.DELETE,
    PERMISSIONS.NOTES.CREATE,
    PERMISSIONS.NOTES.VIEW,
    PERMISSIONS.NOTES.UPDATE,
    PERMISSIONS.NOTES.DELETE,
    PERMISSIONS.NOTES.VIEW_PRIVATE,
    PERMISSIONS.COMMENTS.CREATE,
    PERMISSIONS.COMMENTS.UPDATE_OWN,
    PERMISSIONS.COMMENTS.DELETE_OWN,
    PERMISSIONS.COMMENTS.DELETE_ANY,
    PERMISSIONS.ACTIVITY.VIEW,
    PERMISSIONS.NOTIFICATIONS.VIEW,
    PERMISSIONS.NOTIFICATIONS.MARK_READ,
  ],
  
  ADMIN: [
    PERMISSIONS.PROJECT.VIEW,
    PERMISSIONS.PROJECT.UPDATE,
    PERMISSIONS.PROJECT.ARCHIVE,
    PERMISSIONS.PROJECT.MANAGE_MEMBERS,
    PERMISSIONS.PROJECT.MANAGE_SETTINGS,
    PERMISSIONS.PROJECT.VIEW_ACTIVITY,
    PERMISSIONS.TASKS.CREATE,
    PERMISSIONS.TASKS.VIEW,
    PERMISSIONS.TASKS.UPDATE,
    PERMISSIONS.TASKS.DELETE,
    PERMISSIONS.TASKS.UPDATE_STATUS,
    PERMISSIONS.TASKS.UPDATE_ASSIGNEE,
    PERMISSIONS.TASKS.UPDATE_PRIORITY,
    PERMISSIONS.TASKS.COMMENT,
    PERMISSIONS.TASKS.VIEW_ALL,
    PERMISSIONS.MEMBERS.INVITE,
    PERMISSIONS.MEMBERS.REMOVE,
    PERMISSIONS.MEMBERS.VIEW,
    PERMISSIONS.FILES.UPLOAD,
    PERMISSIONS.FILES.VIEW,
    PERMISSIONS.FILES.DOWNLOAD,
    PERMISSIONS.FILES.DELETE,
    PERMISSIONS.NOTES.CREATE,
    PERMISSIONS.NOTES.VIEW,
    PERMISSIONS.NOTES.UPDATE,
    PERMISSIONS.NOTES.DELETE,
    PERMISSIONS.NOTES.VIEW_PRIVATE,
    PERMISSIONS.COMMENTS.CREATE,
    PERMISSIONS.COMMENTS.UPDATE_OWN,
    PERMISSIONS.COMMENTS.DELETE_OWN,
    PERMISSIONS.COMMENTS.DELETE_ANY,
    PERMISSIONS.ACTIVITY.VIEW,
    PERMISSIONS.NOTIFICATIONS.VIEW,
    PERMISSIONS.NOTIFICATIONS.MARK_READ,
  ],
  
  MEMBER: [
    PERMISSIONS.PROJECT.VIEW,
    PERMISSIONS.TASKS.CREATE,
    PERMISSIONS.TASKS.VIEW,
    PERMISSIONS.TASKS.UPDATE,
    PERMISSIONS.TASKS.UPDATE_STATUS,
    PERMISSIONS.TASKS.COMMENT,
    PERMISSIONS.MEMBERS.VIEW,
    PERMISSIONS.FILES.UPLOAD,
    PERMISSIONS.FILES.VIEW,
    PERMISSIONS.FILES.DOWNLOAD,
    PERMISSIONS.FILES.DELETE_OWN,
    PERMISSIONS.NOTES.CREATE,
    PERMISSIONS.NOTES.VIEW,
    PERMISSIONS.NOTES.UPDATE_OWN,
    PERMISSIONS.NOTES.DELETE_OWN,
    PERMISSIONS.COMMENTS.CREATE,
    PERMISSIONS.COMMENTS.UPDATE_OWN,
    PERMISSIONS.COMMENTS.DELETE_OWN,
    PERMISSIONS.ACTIVITY.VIEW,
    PERMISSIONS.NOTIFICATIONS.VIEW,
    PERMISSIONS.NOTIFICATIONS.MARK_READ,
  ],
  
  VIEWER: [
    PERMISSIONS.PROJECT.VIEW,
    PERMISSIONS.TASKS.VIEW,
    PERMISSIONS.MEMBERS.VIEW,
    PERMISSIONS.FILES.VIEW,
    PERMISSIONS.FILES.DOWNLOAD,
    PERMISSIONS.NOTES.VIEW,
    PERMISSIONS.COMMENTS.CREATE,
    PERMISSIONS.COMMENTS.UPDATE_OWN,
    PERMISSIONS.COMMENTS.DELETE_OWN,
    PERMISSIONS.ACTIVITY.VIEW,
    PERMISSIONS.NOTIFICATIONS.VIEW,
    PERMISSIONS.NOTIFICATIONS.MARK_READ,
  ],
};
```

---

## 3. Permission Service

### Core Service (`shared/services/permissionService.ts`)
```typescript
import { PERMISSIONS } from '@/shared/constants/permissions';
import { ROLE_PERMISSIONS } from '@/shared/constants/rolePermissions';
import { PROJECT_ROLE_PERMISSIONS } from '@/shared/constants/projectRolePermissions';
import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { projectMemberRepository } from '@/features/members/repositories/projectMemberRepository';
import { projectRepository } from '@/features/projects/repositories/projectRepository';

interface PermissionContext {
  projectId?: string;
  resourceId?: string;
  resourceOwnerId?: string;
}

export const permissionService = {
  async can(
    userId: string,
    permission: string,
    context: PermissionContext = {}
  ): Promise<boolean> {
    const user = await this.getUserWithRole(userId);
    if (!user) return false;
    
    if (this.isGlobalPermission(permission)) {
      return this.hasGlobalPermission(user.role, permission);
    }
    
    if (context.projectId) {
      return this.hasProjectPermission(userId, permission, context.projectId, context);
    }
    
    if (context.resourceOwnerId) {
      return this.hasOwnResourcePermission(userId, permission, context.resourceOwnerId);
    }
    
    return false;
  },
  
  async getProjectPermissions(userId: string, projectId: string): Promise<string[]> {
    const membership = await projectMemberRepository.findByProjectAndUser(projectId, userId);
    const project = await projectRepository.findById(projectId);
    
    if (!membership && project?.owner_id !== userId) {
      return [];
    }
    
    const projectRole = membership?.role || (project?.owner_id === userId ? 'OWNER' : null);
    if (!projectRole) return [];
    
    const user = await this.getUserWithRole(userId);
    if (user?.role === 'ADMIN') {
      return Object.values(PERMISSIONS).flatMap(Object.values);
    }
    
    return PROJECT_ROLE_PERMISSIONS[projectRole] || [];
  },
  
  async canAll(
    userId: string,
    permissions: string[],
    context: PermissionContext = {}
  ): Promise<boolean> {
    const results = await Promise.all(
      permissions.map(p => this.can(userId, p, context))
    );
    return results.every(r => r);
  },
  
  async canAny(
    userId: string,
    permissions: string[],
    context: PermissionContext = {}
  ): Promise<boolean> {
    const results = await Promise.all(
      permissions.map(p => this.can(userId, p, context))
    );
    return results.some(r => r);
  },
  
  async getProjectRole(userId: string, projectId: string): Promise<ProjectRole | null> {
    const membership = await projectMemberRepository.findByProjectAndUser(projectId, userId);
    if (membership) return membership.role;
    
    const project = await projectRepository.findById(projectId);
    if (project?.owner_id === userId) return 'OWNER';
    
    return null;
  },
  
  async getUserWithRole(userId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();
    return data;
  },
  
  isGlobalPermission(permission: string): boolean {
    return permission.startsWith('users:') || 
           permission.startsWith('projects:list_all') ||
           permission.startsWith('projects:create') ||
           permission.startsWith('settings:');
  },
  
  hasGlobalPermission(userRole: UserRole, permission: string): boolean {
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.includes(permission as any);
  },
  
  async hasProjectPermission(
    userId: string,
    permission: string,
    projectId: string,
    context: PermissionContext
  ): Promise<boolean> {
    const projectPermissions = await this.getProjectPermissions(userId, projectId);
    
    if (projectPermissions.includes(permission)) {
      if (permission.endsWith('_OWN') && context.resourceOwnerId) {
        return userId === context.resourceOwnerId;
      }
      return true;
    }
    
    const user = await this.getUserWithRole(userId);
    if (user?.role === 'ADMIN') return true;
    
    return false;
  },
  
  hasOwnResourcePermission(
    userId: string,
    permission: string,
    resourceOwnerId: string
  ): boolean {
    return userId === resourceOwnerId && permission.endsWith('_OWN');
  },
};
```

---

## 4. Authorization in Server Actions

### Pattern: Guard Clause
```typescript
// features/tasks/actions/createTask.ts
'use server';

import { permissionService } from '@/shared/services/permissionService';
import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { taskService } from '../services/taskService';
import { createTaskSchema } from '../schemas/createTask';

export async function createTaskAction(projectId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  
  const canCreate = await permissionService.can(user.id, 'tasks:create', { projectId });
  if (!canCreate) throw new ForbiddenError('Cannot create tasks in this project');
  
  const rawData = Object.fromEntries(formData.entries());
  const validated = createTaskSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }
  
  const task = await taskService.createTask(user.id, { ...validated.data, projectId });
  
  revalidatePath(`/projects/${projectId}`);
  return { success: true, task };
}
```

---

## 5. Authorization in Server Components

### Page-Level Authorization
```typescript
// app/(dashboard)/projects/[projectId]/page.tsx
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { permissionService } from '@/shared/services/permissionService';
import { getProjectWithDetails } from '@/features/projects/repositories/projectQueries';

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  
  if (!user) notFound();
  
  const canView = await permissionService.can(user.id, 'project:view', { projectId });
  if (!canView) notFound();
  
  const project = await getProjectWithDetails(projectId);
  if (!project) notFound();
  
  return <ProjectView project={project} userPermissions={await getUserPermissions(user.id, projectId)} />;
}

async function getUserPermissions(userId: string, projectId: string) {
  return {
    canManageMembers: await permissionService.can(userId, 'project:manage_members', { projectId }),
    canManageSettings: await permissionService.can(userId, 'project:manage_settings', { projectId }),
    canCreateTasks: await permissionService.can(userId, 'tasks:create', { projectId }),
    canViewActivity: await permissionService.can(userId, 'activity:view', { projectId }),
    canViewPrivateNotes: await permissionService.can(userId, 'notes:view_private', { projectId }),
  };
}
```

---

## 6. Authorization in Client Components

### Permission Hook
```typescript
// features/auth/hooks/usePermissions.ts
'use client';

import { useMemo } from 'react';
import { useCurrentUser } from './useCurrentUser';

interface ProjectPermissions {
  canCreateTasks: boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
  canViewActivity: boolean;
  canViewPrivateNotes: boolean;
  canDeleteTasks: boolean;
  canUpdateAnyTask: boolean;
  projectRole: ProjectRole | null;
}

export function useProjectPermissions(projectId: string): ProjectPermissions & { loading: boolean } {
  const { user, loading } = useCurrentUser();
  
  const permissions = useMemo(() => {
    if (!user) return emptyPermissions();
    return calculatePermissions(user, projectId);
  }, [user, projectId]);
  
  return { ...permissions, loading };
}

function calculatePermissions(user: User, projectId: string): ProjectPermissions {
  return {
    canCreateTasks: true,
    canManageMembers: false,
    canManageSettings: false,
    canViewActivity: true,
    canViewPrivateNotes: false,
    canDeleteTasks: false,
    canUpdateAnyTask: false,
    projectRole: 'MEMBER',
  };
}

function emptyPermissions(): ProjectPermissions {
  return {
    canCreateTasks: false,
    canManageMembers: false,
    canManageSettings: false,
    canViewActivity: false,
    canViewPrivateNotes: false,
    canDeleteTasks: false,
    canUpdateAnyTask: false,
    projectRole: null,
  };
}
```

### Conditional Rendering Component
```typescript
// shared/components/auth/PermissionGate.tsx
'use client';

import { ReactNode } from 'react';
import { useProjectPermissions } from '@/features/auth/hooks/usePermissions';

interface PermissionGateProps {
  permission: keyof ProjectPermissions;
  projectId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, projectId, children, fallback = null }: PermissionGateProps) {
  const { [permission]: hasPermission } = useProjectPermissions(projectId);
  
  if (!hasPermission) return <>{fallback}</>;
  
  return <>{children}</>;
}
```

---

## 7. Row Level Security (RLS) Policies

### Principle: Defense in Depth
Authorization is enforced at **three layers**:
1. **Application Layer** - Permission service in Server Actions
2. **API Layer** - Route Handler checks
3. **Database Layer** - RLS Policies (last line of defense)

### RLS Policy Examples

#### Projects Table
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can update projects" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Owners can delete projects" ON projects
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Admins and PMs can create projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER')
    )
  );
```

#### Tasks Table
```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'MEMBER')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Assignee or project admin can update tasks" ON tasks
  FOR UPDATE USING (
    assignee_id = auth.uid() OR
    created_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Project admin or creator can delete tasks" ON tasks
  FOR DELETE USING (
    created_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  );
```

#### Notes Table (Private vs Public)
```sql
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes" ON notes
  FOR SELECT USING (
    (is_private = false AND (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = notes.project_id AND user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM projects WHERE id = notes.project_id AND owner_id = auth.uid()
      )
    )) OR
    (is_private = true AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = notes.project_id AND user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    ))
  );

CREATE POLICY "Members can create notes" ON notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = notes.project_id AND user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'MEMBER')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = notes.project_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner or admin can update notes" ON notes
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = notes.project_id AND user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  );

CREATE POLICY "Owner or admin can delete notes" ON notes
  FOR DELETE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = notes.project_id AND user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  );
```

#### Files Table
```sql
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files" ON files
  FOR SELECT USING (
    (project_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = files.project_id AND user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM projects WHERE id = files.project_id AND owner_id = auth.uid()
      )
    )) OR
    (user_id IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Project members can upload files" ON files
  FOR INSERT WITH CHECK (
    (project_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = files.project_id AND user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN', 'MEMBER')
      ) OR
      EXISTS (
        SELECT 1 FROM projects WHERE id = files.project_id AND owner_id = auth.uid()
      )
    )) OR
    (user_id IS NOT NULL AND user_id = auth.uid())
  );

CREATE POLICY "Uploader or admin can delete files" ON files
  FOR DELETE USING (
    uploaded_by_id = auth.uid() OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = files.project_id AND user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    ))
  );
```

---

## 8. Special Cases

### Private Resources (User-Scoped)
```typescript
async function getPrivateNote(noteId: string) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  
  const note = await noteRepository.findById(noteId);
  if (!note || !note.isPrivate) throw new NotFoundError('Note');
  
  if (note.ownerId !== user.id) {
    const canViewPrivate = await permissionService.can(user.id, 'notes:view_private', {
      projectId: note.projectId,
    });
    if (!canViewPrivate) throw new ForbiddenError();
  }
  
  return note;
}
```

### Cross-Project Access (Admin)
```typescript
async function adminGetProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  
  const isAdmin = await permissionService.can(user.id, 'projects:list_all');
  if (!isAdmin) throw new ForbiddenError();
  
  return projectRepository.findById(projectId);
}
```

### Impersonation (Admin Only)
```typescript
async function impersonateUser(targetUserId: string) {
  const admin = await getCurrentUser();
  if (!admin) throw new ForbiddenError();
  
  const canImpersonate = await permissionService.can(admin.id, 'users:impersonate');
  if (!canImpersonate) throw new ForbiddenError();
  
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: targetUserEmail,
  });
  
  await activityService.log({
    userId: admin.id,
    action: 'USER_IMPERSONATED',
    entityType: 'user',
    entityId: targetUserId,
    metadata: { targetUserId },
  });
  
  return data;
}
```

---

## 9. Testing Permissions

### Unit Tests for Permission Service
```typescript
// shared/services/__tests__/permissionService.test.ts
import { permissionService } from '../permissionService';
import { PROJECT_ROLE_PERMISSIONS } from '@/shared/constants/projectRolePermissions';

describe('permissionService', () => {
  describe('getProjectPermissions', () => {
    it('returns OWNER permissions for project owner', async () => {
      const permissions = await permissionService.getProjectPermissions('user-1', 'project-1');
      expect(permissions).toEqual(expect.arrayContaining(PROJECT_ROLE_PERMISSIONS.OWNER));
    });
    
    it('returns MEMBER permissions for project member', async () => {
      const permissions = await permissionService.getProjectPermissions('user-2', 'project-1');
      expect(permissions).toEqual(expect.arrayContaining(PROJECT_ROLE_PERMISSIONS.MEMBER));
    });
    
    it('returns empty for non-member', async () => {
      const permissions = await permissionService.getProjectPermissions('user-3', 'project-1');
      expect(permissions).toEqual([]);
    });
  });
  
  describe('can', () => {
    it('allows ADMIN all permissions', async () => {
      const can = await permissionService.can('admin-user', 'projects:delete_any');
      expect(can).toBe(true);
    });
    
    it('denies USER global permissions', async () => {
      const can = await permissionService.can('regular-user', 'users:list');
      expect(can).toBe(false);
    });
  });
});
```

### Integration Tests for Server Actions
```typescript
// features/tasks/actions/__tests__/createTask.test.ts
import { createTaskAction } from '../createTask';
import { permissionService } from '@/shared/services/permissionService';

jest.mock('@/shared/services/permissionService');
jest.mock('@/features/auth/actions/getCurrentUser');

describe('createTaskAction', () => {
  it('throws ForbiddenError when user lacks permission', async () => {
    (permissionService.can as jest.Mock).mockResolvedValue(false);
    
    await expect(createTaskAction('project-1', new FormData()))
      .rejects.toThrow(ForbiddenError);
  });
  
  it('creates task when user has permission', async () => {
    (permissionService.can as jest.Mock).mockResolvedValue(true);
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user-1' });
    
    const formData = new FormData();
    formData.append('title', 'Test Task');
    
    const result = await createTaskAction('project-1', formData);
    expect(result.success).toBe(true);
  });
});
```

---

## Summary

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Application** | Permission Service | Business logic authorization |
| **Server Actions** | Guard clauses | Mutation protection |
| **Server Components** | Page-level checks | Data fetching protection |
| **Client Components** | PermissionGate | UI conditional rendering |
| **Database** | RLS Policies | Last line of defense |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*