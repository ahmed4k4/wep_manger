-- RBAC System Migration
-- Adds: Global user roles, user status, permissions matrix

-- ============================================================================
-- 1. ADD GLOBAL ROLE AND STATUS TO PROFILES
-- ============================================================================

-- Add global_role column (separate from project-specific roles)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS global_role VARCHAR(20) NOT NULL DEFAULT 'USER'
CHECK (global_role IN ('ADMIN', 'PROJECT_MANAGER', 'USER'));

-- Add status column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'inactive'));

-- Add extended profile fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);

-- Create index for global_role
CREATE INDEX IF NOT EXISTS idx_profiles_global_role ON public.profiles(global_role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- ============================================================================
-- 2. PERMISSIONS TABLE (for future extensibility)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'project', 'task', 'team', 'admin', 'file', 'note'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
-- Project permissions
('project.create', 'Create new projects', 'project'),
('project.read', 'View projects', 'project'),
('project.update', 'Update project details', 'project'),
('project.delete', 'Archive/delete projects', 'project'),
('project.manage_members', 'Add/remove project members', 'project'),
('project.manage_roles', 'Change member roles in project', 'project'),
('project.settings', 'Manage project settings', 'project'),

-- Task permissions
('task.create', 'Create tasks', 'task'),
('task.read', 'View tasks', 'task'),
('task.update', 'Update tasks', 'task'),
('task.delete', 'Archive/delete tasks', 'task'),
('task.assign', 'Assign tasks to members', 'task'),
('task.change_status', 'Change task status', 'task'),
('task.change_priority', 'Change task priority', 'task'),
('task.comment', 'Comment on tasks', 'task'),
('task.attach_files', 'Attach files to tasks', 'task'),
('task.manage_checklists', 'Manage task checklists', 'task'),
('task.manage_tags', 'Manage task tags', 'task'),

-- Team permissions
('team.view_members', 'View team members', 'team'),
('team.add_member', 'Add members to projects', 'team'),
('team.remove_member', 'Remove members from projects', 'team'),
('team.change_role', 'Change member project roles', 'team'),
('team.view_workload', 'View member workload', 'team'),

-- Admin permissions
('admin.create_user', 'Create new users', 'admin'),
('admin.update_user', 'Update any user', 'admin'),
('admin.disable_user', 'Disable/enable users', 'admin'),
('admin.reset_password', 'Reset user passwords', 'admin'),
('admin.change_global_role', 'Change user global roles', 'admin'),
('admin.view_all_projects', 'View all projects', 'admin'),
('admin.view_all_users', 'View all users', 'admin'),
('admin.system_settings', 'Manage system settings', 'admin'),

-- File permissions
('file.upload', 'Upload files', 'file'),
('file.download', 'Download files', 'file'),
('file.delete', 'Delete files', 'file'),
('file.manage', 'Manage file settings', 'file'),

-- Note permissions
('note.create', 'Create notes', 'note'),
('note.read', 'Read notes', 'note'),
('note.update', 'Update notes', 'note'),
('note.delete', 'Delete notes', 'note'),
('note.pin', 'Pin/unpin notes', 'note')

ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. ROLE PERMISSIONS MAPPING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role VARCHAR(20) NOT NULL,
    permission_name VARCHAR(100) NOT NULL REFERENCES public.permissions(name) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'project', 'own')),
    PRIMARY KEY (role, permission_name)
);

-- Insert default role permissions
-- ADMIN - global scope
INSERT INTO public.role_permissions (role, permission_name, scope) VALUES
('ADMIN', 'project.create', 'global'),
('ADMIN', 'project.read', 'global'),
('ADMIN', 'project.update', 'global'),
('ADMIN', 'project.delete', 'global'),
('ADMIN', 'project.manage_members', 'global'),
('ADMIN', 'project.manage_roles', 'global'),
('ADMIN', 'project.settings', 'global'),
('ADMIN', 'task.create', 'global'),
('ADMIN', 'task.read', 'global'),
('ADMIN', 'task.update', 'global'),
('ADMIN', 'task.delete', 'global'),
('ADMIN', 'task.assign', 'global'),
('ADMIN', 'task.change_status', 'global'),
('ADMIN', 'task.change_priority', 'global'),
('ADMIN', 'task.comment', 'global'),
('ADMIN', 'task.attach_files', 'global'),
('ADMIN', 'task.manage_checklists', 'global'),
('ADMIN', 'task.manage_tags', 'global'),
('ADMIN', 'team.view_members', 'global'),
('ADMIN', 'team.add_member', 'global'),
('ADMIN', 'team.remove_member', 'global'),
('ADMIN', 'team.change_role', 'global'),
('ADMIN', 'team.view_workload', 'global'),
('ADMIN', 'admin.create_user', 'global'),
('ADMIN', 'admin.update_user', 'global'),
('ADMIN', 'admin.disable_user', 'global'),
('ADMIN', 'admin.reset_password', 'global'),
('ADMIN', 'admin.change_global_role', 'global'),
('ADMIN', 'admin.view_all_projects', 'global'),
('ADMIN', 'admin.view_all_users', 'global'),
('ADMIN', 'admin.system_settings', 'global'),
('ADMIN', 'file.upload', 'global'),
('ADMIN', 'file.download', 'global'),
('ADMIN', 'file.delete', 'global'),
('ADMIN', 'file.manage', 'global'),
('ADMIN', 'note.create', 'global'),
('ADMIN', 'note.read', 'global'),
('ADMIN', 'note.update', 'global'),
('ADMIN', 'note.delete', 'global'),
('ADMIN', 'note.pin', 'global')

ON CONFLICT (role, permission_name) DO NOTHING;

-- PROJECT_MANAGER - project scope
INSERT INTO public.role_permissions (role, permission_name, scope) VALUES
('PROJECT_MANAGER', 'project.read', 'project'),
('PROJECT_MANAGER', 'project.update', 'project'),
('PROJECT_MANAGER', 'project.manage_members', 'project'),
('PROJECT_MANAGER', 'project.manage_roles', 'project'),
('PROJECT_MANAGER', 'project.settings', 'project'),
('PROJECT_MANAGER', 'task.create', 'project'),
('PROJECT_MANAGER', 'task.read', 'project'),
('PROJECT_MANAGER', 'task.update', 'project'),
('PROJECT_MANAGER', 'task.delete', 'project'),
('PROJECT_MANAGER', 'task.assign', 'project'),
('PROJECT_MANAGER', 'task.change_status', 'project'),
('PROJECT_MANAGER', 'task.change_priority', 'project'),
('PROJECT_MANAGER', 'task.comment', 'project'),
('PROJECT_MANAGER', 'task.attach_files', 'project'),
('PROJECT_MANAGER', 'task.manage_checklists', 'project'),
('PROJECT_MANAGER', 'task.manage_tags', 'project'),
('PROJECT_MANAGER', 'team.view_members', 'project'),
('PROJECT_MANAGER', 'team.add_member', 'project'),
('PROJECT_MANAGER', 'team.remove_member', 'project'),
('PROJECT_MANAGER', 'team.change_role', 'project'),
('PROJECT_MANAGER', 'team.view_workload', 'project'),
('PROJECT_MANAGER', 'file.upload', 'project'),
('PROJECT_MANAGER', 'file.download', 'project'),
('PROJECT_MANAGER', 'file.delete', 'project'),
('PROJECT_MANAGER', 'file.manage', 'project'),
('PROJECT_MANAGER', 'note.create', 'project'),
('PROJECT_MANAGER', 'note.read', 'project'),
('PROJECT_MANAGER', 'note.update', 'project'),
('PROJECT_MANAGER', 'note.delete', 'project'),
('PROJECT_MANAGER', 'note.pin', 'project')

ON CONFLICT (role, permission_name) DO NOTHING;

-- USER - project scope (limited)
INSERT INTO public.role_permissions (role, permission_name, scope) VALUES
('USER', 'project.read', 'project'),
('USER', 'task.create', 'project'),
('USER', 'task.read', 'project'),
('USER', 'task.update', 'own'),
('USER', 'task.change_status', 'own'),
('USER', 'task.comment', 'project'),
('USER', 'task.attach_files', 'own'),
('USER', 'task.manage_checklists', 'own'),
('USER', 'task.manage_tags', 'own'),
('USER', 'team.view_members', 'project'),
('USER', 'file.upload', 'project'),
('USER', 'file.download', 'project'),
('USER', 'note.create', 'project'),
('USER', 'note.read', 'project'),
('USER', 'note.update', 'own'),
('USER', 'note.delete', 'own')

ON CONFLICT (role, permission_name) DO NOTHING;

-- ============================================================================
-- 4. PROJECT MEMBERS - ADD PROJECT ROLE ENUM CHECK
-- ============================================================================

-- Ensure project_members role uses consistent enum
-- (Already uses OWNER, ADMIN, MEMBER, VIEWER - no change needed)

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON public.project_members(role);

-- ============================================================================
-- 5. FUNCTION: Check if user has permission
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_permission(
    p_user_id UUID,
    p_permission_name VARCHAR(100),
    p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_global_role VARCHAR(20);
    v_project_role VARCHAR(20);
    v_has_permission BOOLEAN := FALSE;
BEGIN
    -- Get user's global role
    SELECT global_role INTO v_global_role
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_global_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Admin has all permissions globally
    IF v_global_role = 'ADMIN' THEN
        RETURN TRUE;
    END IF;

    -- Check global permissions for the role
    SELECT EXISTS (
        SELECT 1 FROM public.role_permissions rp
        WHERE rp.role = v_global_role
        AND rp.permission_name = p_permission_name
        AND rp.scope = 'global'
    ) INTO v_has_permission;

    IF v_has_permission THEN
        RETURN TRUE;
    END IF;

    -- If project_id provided, check project-scoped permissions
    IF p_project_id IS NOT NULL THEN
        -- Get user's project role
        SELECT role INTO v_project_role
        FROM public.project_members
        WHERE project_id = p_project_id
        AND user_id = p_user_id;

        IF v_project_role IS NOT NULL THEN
            -- Check project-scoped permissions
            SELECT EXISTS (
                SELECT 1 FROM public.role_permissions rp
                WHERE rp.role = v_global_role
                AND rp.permission_name = p_permission_name
                AND rp.scope = 'project'
            ) INTO v_has_permission;

            IF v_has_permission THEN
                RETURN TRUE;
            END IF;

            -- Check own-scoped permissions (for tasks assigned to user, notes created by user, etc.)
            SELECT EXISTS (
                SELECT 1 FROM public.role_permissions rp
                WHERE rp.role = v_global_role
                AND rp.permission_name = p_permission_name
                AND rp.scope = 'own'
            ) INTO v_has_permission;

            IF v_has_permission THEN
                RETURN TRUE;
            END IF;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;

-- ============================================================================
-- 6. FUNCTION: Get user's project role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_project_role(
    p_project_id UUID,
    p_user_id UUID
)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role VARCHAR(20);
BEGIN
    SELECT role INTO v_role
    FROM public.project_members
    WHERE project_id = p_project_id
    AND user_id = p_user_id;

    RETURN v_role;
END;
$$;

-- ============================================================================
-- 7. FUNCTION: Check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_global_role VARCHAR(20);
BEGIN
    SELECT global_role INTO v_global_role
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN v_global_role = 'ADMIN';
END;
$$;

-- ============================================================================
-- 8. FUNCTION: Check if user is project manager (global or project-specific)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_project_manager(
    p_user_id UUID,
    p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_global_role VARCHAR(20);
    v_project_role VARCHAR(20);
BEGIN
    SELECT global_role INTO v_global_role
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_global_role = 'ADMIN' OR v_global_role = 'PROJECT_MANAGER' THEN
        RETURN TRUE;
    END IF;

    IF p_project_id IS NOT NULL THEN
        SELECT role INTO v_project_role
        FROM public.project_members
        WHERE project_id = p_project_id
        AND user_id = p_user_id;

        RETURN v_project_role IN ('OWNER', 'ADMIN');
    END IF;

    RETURN FALSE;
END;
$$;

-- ============================================================================
-- 9. MIGRATE EXISTING USERS TO NEW RBAC SYSTEM
-- ============================================================================

-- Update existing users based on their project membership
-- First user (oldest) becomes ADMIN if no admin exists
DO $$
DECLARE
    v_admin_exists BOOLEAN;
    v_oldest_user_id UUID;
BEGIN
    -- Check if any admin exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE global_role = 'ADMIN') INTO v_admin_exists;

    IF NOT v_admin_exists THEN
        -- Make the oldest user an admin
        SELECT id INTO v_oldest_user_id
        FROM public.profiles
        ORDER BY created_at ASC
        LIMIT 1;

        IF v_oldest_user_id IS NOT NULL THEN
            UPDATE public.profiles
            SET global_role = 'ADMIN'
            WHERE id = v_oldest_user_id;
        END IF;
    END IF;
END;
$$;

-- Update PROJECT_MANAGER for users who are OWNER/ADMIN in any project
UPDATE public.profiles p
SET global_role = 'PROJECT_MANAGER'
WHERE p.global_role = 'USER'
AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = p.id
    AND pm.role IN ('OWNER', 'ADMIN')
);

-- ============================================================================
-- 10. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Permissions table - everyone can read
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.permissions;
CREATE POLICY "Authenticated users can read permissions"
ON public.permissions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Role permissions - everyone can read
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can read role permissions"
ON public.role_permissions
FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================================================
-- 11. UPDATE PROFILES RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Members can view profiles in shared projects" ON public.profiles;

-- Users can view own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Users can update own profile (but not global_role or status)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid()
    AND (global_role IS NULL OR global_role = (SELECT global_role FROM public.profiles WHERE id = auth.uid()))
    AND (status IS NULL OR status = (SELECT status FROM public.profiles WHERE id = auth.uid()))
);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Project members can view profiles in shared projects
CREATE POLICY "Project members can view profiles in shared projects"
ON public.profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm1
        JOIN public.project_members pm2 ON pm2.project_id = pm1.project_id
        WHERE pm1.user_id = auth.uid()
        AND pm2.user_id = profiles.id
    )
);

-- ============================================================================
-- 12. UPDATE PROJECT MEMBERS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Project members can view members" ON public.project_members;
DROP POLICY IF EXISTS "Project admins can manage members" ON public.project_members;

-- All project members can view other members (needed for team page, mentions, etc.)
CREATE POLICY "Project members can view members"
ON public.project_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
);

-- Project admins/owners can manage members
CREATE POLICY "Project admins can manage members"
ON public.project_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('OWNER', 'ADMIN')
    )
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('OWNER', 'ADMIN')
    )
    OR public.is_admin(auth.uid())
);

-- ============================================================================
-- 13. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (email, full_name, avatar_url, locale, theme, notification_preferences, phone, department, job_title) ON public.profiles TO authenticated;