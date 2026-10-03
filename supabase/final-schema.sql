-- ============================================================================
-- PROJECT MANAGEMENT PLATFORM — AUTHORITATIVE DATABASE SCHEMA
-- Single source of truth. Safe to run on a CLEAN Supabase/PostgreSQL database.
-- Supersedes all previous migration files (consolidated 2026-10-03).
--
-- Sections:
--   1. Extensions          7.  Row Level Security policies
--   2. Enums               8.  Views & materialized views
--   3. Tables              9.  Realtime publication
--   4. Functions          10.  Storage buckets & policies
--   5. Indexes            11.  Grants
--   6. Triggers           12.  Seed / reference data
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 2. ENUMS
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('ACTIVE', 'ARCHIVED', 'ON_HOLD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE project_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'MENTION', 'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_STATUS_CHANGED',
        'TASK_COMMENT', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'PROJECT_INVITE',
        'PROJECT_UPDATED', 'MEMBER_ADDED', 'MEMBER_ROLE_CHANGED', 'FILE_UPLOADED',
        'NOTE_CREATED', 'NOTE_COMMENT', 'NOTE_MENTION', 'SYSTEM_ALERT'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE activity_action AS ENUM (
        'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_ARCHIVED', 'PROJECT_DELETED',
        'TASK_CREATED', 'TASK_UPDATED', 'TASK_STATUS_CHANGED', 'TASK_ASSIGNED',
        'TASK_PRIORITY_CHANGED', 'TASK_DELETED',
        'MEMBER_INVITED', 'MEMBER_JOINED', 'MEMBER_ROLE_CHANGED', 'MEMBER_REMOVED',
        'FILE_UPLOADED', 'FILE_UPDATED', 'FILE_DOWNLOADED', 'FILE_DELETED',
        'NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_DELETED', 'NOTE_PRIVACY_CHANGED',
        'COMMENT_CREATED', 'COMMENT_UPDATED', 'COMMENT_DELETED',
        'USER_PROFILE_UPDATED', 'USER_AVATAR_CHANGED', 'USER_LOGIN', 'USER_LOGOUT',
        'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM ('project', 'task', 'member', 'file', 'note', 'comment', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- 3.1 PROFILES ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    full_name text,
    avatar_url text,
    role user_role NOT NULL DEFAULT 'USER',
    global_role VARCHAR(20) NOT NULL DEFAULT 'USER'
        CHECK (global_role IN ('ADMIN', 'PROJECT_MANAGER', 'USER')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    locale text DEFAULT 'en',
    theme text DEFAULT 'system',
    notification_preferences jsonb NOT NULL DEFAULT '{}',
    last_sign_in_at TIMESTAMPTZ,
    phone VARCHAR(50),
    department VARCHAR(100),
    job_title VARCHAR(100),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.2 PROJECTS --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    key text NOT NULL UNIQUE,
    description text,
    status project_status NOT NULL DEFAULT 'ACTIVE',
    owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT chk_projects_key_format CHECK (key ~ '^[A-Z][A-Z0-9]{1,9}$')
);

-- 3.3 PROJECT_MEMBERS -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role project_role NOT NULL DEFAULT 'MEMBER',
    joined_at timestamptz NOT NULL DEFAULT now(),
    invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    invited_at timestamptz,
    accepted_at timestamptz,
    CONSTRAINT uq_project_members_unique UNIQUE (project_id, user_id)
);

-- 3.4 TASKS -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    status task_status NOT NULL DEFAULT 'TODO',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    start_date date,
    due_date date,
    completed_at timestamptz,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT chk_tasks_dates CHECK (
        due_date IS NULL OR start_date IS NULL OR due_date >= start_date
    )
);

-- 3.5 PROJECT_FILES ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    storage_path text NOT NULL UNIQUE,
    mime_type text NOT NULL,
    size bigint NOT NULL,
    checksum text,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 3.6 TASK_ATTACHMENTS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_id uuid NOT NULL REFERENCES public.project_files(id) ON DELETE CASCADE,
    uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_task_attachments_unique UNIQUE (task_id, file_id)
);

-- 3.7 TASK_COMMENTS ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    parent_id uuid REFERENCES public.task_comments(id) ON DELETE CASCADE,
    is_system boolean NOT NULL DEFAULT FALSE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 3.8 USER_FILES ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    storage_path text NOT NULL UNIQUE,
    mime_type text NOT NULL,
    size bigint NOT NULL,
    checksum text,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 3.9 PROJECT_NOTES ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    is_pinned boolean NOT NULL DEFAULT FALSE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 3.10 USER_NOTES -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    is_pinned boolean NOT NULL DEFAULT FALSE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 3.11 NOTIFICATIONS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_url text,
    action_label text,
    metadata jsonb NOT NULL DEFAULT '{}',
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.12 ACTIVITY_LOGS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action activity_action NOT NULL,
    entity_type entity_type NOT NULL,
    entity_id uuid NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    ip_address inet,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3.13 TAGS -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- 3.14 TASK_TAGS ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_tags (
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- 3.15 TASK_CHECKLISTS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id)
);

-- 3.16 PERMISSIONS ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.17 ROLE_PERMISSIONS -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role VARCHAR(20) NOT NULL,
    permission_name VARCHAR(100) NOT NULL REFERENCES public.permissions(name) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'project', 'own')),
    PRIMARY KEY (role, permission_name)
);

-- 3.18 USER_SEARCHES --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.19 USER_SETTINGS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    department VARCHAR(100),
    job_title VARCHAR(100),
    theme VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    locale VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ar')),
    notification_preferences JSONB NOT NULL DEFAULT '{
        "task_assignments": true, "comments": true, "deadlines": true,
        "project_updates": true, "files": true
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.20 SYSTEM_SETTINGS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. FUNCTIONS (created after all referenced tables)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Alias kept for backward compatibility with older triggers.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Global admin check. SECURITY DEFINER avoids recursive profiles RLS.
-- Recognises both the legacy `role` enum and the newer `global_role` column.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT auth.role() = 'service_role' OR (
        p_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = p_user_id
              AND (role = 'ADMIN' OR global_role = 'ADMIN')
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT auth.role() = 'service_role' OR (
        p_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = p_project_id AND user_id = p_user_id
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_project_role(p_project_id uuid, p_user_id uuid)
RETURNS project_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT CASE WHEN auth.role() = 'service_role' OR p_user_id = auth.uid() THEN
        (SELECT role FROM public.project_members
         WHERE project_id = p_project_id AND user_id = p_user_id LIMIT 1)
        ELSE NULL::project_role END;
$$;

CREATE OR REPLACE FUNCTION public.has_project_permission(
    p_project_id uuid, p_user_id uuid, p_required_roles project_role[]
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT auth.role() = 'service_role' OR (
        p_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = p_project_id AND user_id = p_user_id
              AND role = ANY(p_required_roles)
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_project_member_count(p_project_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT CASE
        WHEN auth.role() = 'service_role' OR public.is_admin(auth.uid())
             OR public.is_project_member(p_project_id, auth.uid())
        THEN (SELECT COUNT(*)::integer FROM public.project_members WHERE project_id = p_project_id)
        ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(
    p_user_id UUID, p_permission_name VARCHAR(100), p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_global_role VARCHAR(20);
    v_project_role VARCHAR(20);
    v_has_permission BOOLEAN := FALSE;
BEGIN
    SELECT global_role INTO v_global_role FROM public.profiles WHERE id = p_user_id;
    IF v_global_role IS NULL THEN RETURN FALSE; END IF;
    IF v_global_role = 'ADMIN' THEN RETURN TRUE; END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.role_permissions rp
        WHERE rp.role = v_global_role AND rp.permission_name = p_permission_name AND rp.scope = 'global'
    ) INTO v_has_permission;
    IF v_has_permission THEN RETURN TRUE; END IF;

    IF p_project_id IS NOT NULL THEN
        SELECT role::text INTO v_project_role FROM public.project_members
        WHERE project_id = p_project_id AND user_id = p_user_id;
        IF v_project_role IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM public.role_permissions rp
                WHERE rp.role = v_global_role AND rp.permission_name = p_permission_name AND rp.scope = 'project'
            ) INTO v_has_permission;
            IF v_has_permission THEN RETURN TRUE; END IF;
            SELECT EXISTS (
                SELECT 1 FROM public.role_permissions rp
                WHERE rp.role = v_global_role AND rp.permission_name = p_permission_name AND rp.scope = 'own'
            ) INTO v_has_permission;
            IF v_has_permission THEN RETURN TRUE; END IF;
        END IF;
    END IF;
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_project_manager(p_user_id UUID, p_project_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_global_role VARCHAR(20); v_project_role VARCHAR(20);
BEGIN
    SELECT global_role INTO v_global_role FROM public.profiles WHERE id = p_user_id;
    IF v_global_role IN ('ADMIN', 'PROJECT_MANAGER') THEN RETURN TRUE; END IF;
    IF p_project_id IS NOT NULL THEN
        SELECT role::text INTO v_project_role FROM public.project_members
        WHERE project_id = p_project_id AND user_id = p_user_id;
        RETURN v_project_role IN ('OWNER', 'ADMIN');
    END IF;
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.global_role IS DISTINCT FROM OLD.global_role)
       AND auth.role() <> 'service_role'
       AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only a global admin may change a profile role';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_single_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.role = 'OWNER' THEN
        IF EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = NEW.project_id AND role = 'OWNER' AND user_id <> NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Project can only have one OWNER';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, global_role)
    VALUES (
        NEW.id, NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        'USER', 'USER'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_project_owner_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.project_members (project_id, user_id, role, joined_at, accepted_at)
    VALUES (NEW.id, NEW.owner_id, 'OWNER', now(), now())
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'OWNER';
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_completed_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED' THEN
        NEW.completed_at = now();
        NEW.progress = 100;
    ELSIF NEW.status <> 'COMPLETED' AND OLD.status = 'COMPLETED' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.project_task_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_workload;
END;
$$;

-- ---- storage path helpers --------------------------------------------------
CREATE OR REPLACE FUNCTION public.storage_project_id_from_path(p_name text)
RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN split_part(p_name, '/', 1) = 'projects'
             AND split_part(p_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 2)::uuid
        WHEN split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 1)::uuid
        ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.storage_user_id_from_path(p_name text)
RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN split_part(p_name, '/', 1) = 'users'
             AND split_part(p_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 2)::uuid
        WHEN split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 1)::uuid
        ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.storage_user_file_project_id_from_path(p_name text)
RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN split_part(p_name, '/', 1) = 'users'
             AND split_part(p_name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 4)::uuid
        WHEN split_part(p_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 2)::uuid
        ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.storage_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'ADMIN' OR global_role = 'ADMIN'));
$$;

CREATE OR REPLACE FUNCTION public.storage_is_project_member(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT public.storage_is_admin() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.storage_is_project_admin(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT public.storage_is_admin() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
          AND pm.role IN ('OWNER', 'ADMIN')
    );
$$;

CREATE OR REPLACE FUNCTION public.storage_can_upload_project_file(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT public.storage_is_admin() OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
          AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
    );
$$;

-- ---- workflow integrity functions -----------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_task_assignee_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    actor_project_role public.project_role;
    assignee_project_role public.project_role;
BEGIN
    IF auth.role() = 'service_role' THEN RETURN NEW; END IF;

    IF public.is_admin(auth.uid()) THEN
        actor_project_role := 'ADMIN'::public.project_role;
    ELSE
        SELECT role INTO actor_project_role FROM public.project_members
        WHERE project_id = NEW.project_id AND user_id = auth.uid();
    END IF;

    IF actor_project_role IS NULL THEN
        RAISE EXCEPTION 'Task must belong to a project the current user belongs to' USING ERRCODE = '42501';
    END IF;

    IF NEW.assignee_id IS NOT NULL THEN
        SELECT role INTO assignee_project_role FROM public.project_members
        WHERE project_id = NEW.project_id AND user_id = NEW.assignee_id;
        IF assignee_project_role IS NULL OR assignee_project_role = 'VIEWER' THEN
            RAISE EXCEPTION 'Task assignee must be an active project member' USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
       AND actor_project_role NOT IN ('OWNER', 'ADMIN') THEN
        RAISE EXCEPTION 'Only project owners and admins may assign tasks' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_project_member_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_role public.project_role; project_owner uuid;
BEGIN
    IF auth.role() = 'service_role' OR public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

    SELECT owner_id INTO project_owner FROM public.projects WHERE id = NEW.project_id;
    IF TG_OP = 'UPDATE' AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.project_id IS DISTINCT FROM OLD.project_id) THEN
        RAISE EXCEPTION 'Project membership identity cannot be changed' USING ERRCODE = '42501';
    END IF;
    IF NEW.role = 'OWNER' AND NEW.user_id <> project_owner THEN
        RAISE EXCEPTION 'Only the project owner may have the OWNER role' USING ERRCODE = '42501';
    END IF;

    SELECT role INTO actor_role FROM public.project_members
    WHERE project_id = NEW.project_id AND user_id = auth.uid();

    IF TG_OP = 'INSERT' THEN
        IF actor_role = 'ADMIN' AND NEW.role NOT IN ('MEMBER', 'VIEWER') THEN
            RAISE EXCEPTION 'Project admins may only add members or viewers' USING ERRCODE = '42501';
        END IF;
        IF actor_role IS DISTINCT FROM 'OWNER' AND NEW.user_id <> auth.uid() THEN
            RAISE EXCEPTION 'Only project owners and admins may add members' USING ERRCODE = '42501';
        END IF;
    ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
        IF OLD.role = 'OWNER' THEN
            RAISE EXCEPTION 'The project owner role cannot be changed' USING ERRCODE = '42501';
        END IF;
        IF actor_role = 'ADMIN' AND NEW.role NOT IN ('MEMBER', 'VIEWER') THEN
            RAISE EXCEPTION 'Project admins may only assign MEMBER or VIEWER roles' USING ERRCODE = '42501';
        END IF;
        IF actor_role NOT IN ('OWNER', 'ADMIN') THEN
            RAISE EXCEPTION 'Only project owners and admins may change member roles' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_task_progress_from_checklist()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total_count INTEGER; completed_count INTEGER; new_progress INTEGER; target_task uuid;
BEGIN
    target_task := COALESCE(NEW.task_id, OLD.task_id);
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed)
    INTO total_count, completed_count
    FROM public.task_checklists WHERE task_id = target_task;

    IF total_count > 0 THEN
        new_progress := ROUND((completed_count::numeric / total_count) * 100);
    ELSE
        new_progress := 0;
    END IF;

    UPDATE public.tasks
    SET progress = new_progress,
        updated_at = NOW(),
        completed_at = CASE WHEN new_progress = 100 THEN NOW() ELSE NULL END
    WHERE id = target_task;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---- notification functions -----------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_project_member_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE project_row public.projects%ROWTYPE;
BEGIN
    SELECT * INTO project_row FROM public.projects WHERE id = NEW.project_id;
    IF NEW.user_id <> auth.uid() THEN
        INSERT INTO public.notifications (user_id, project_id, type, title, message, action_url, action_label, metadata)
        VALUES (NEW.user_id, NEW.project_id, 'MEMBER_ADDED',
            'Added to Project: ' || project_row.name,
            'You were added to ' || project_row.name || ' (' || project_row.key || ') as ' || NEW.role::text,
            '/projects/' || NEW.project_id::text || '/overview', 'View Project',
            jsonb_build_object('added_by', auth.uid(), 'role', NEW.role::text));
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_project_member_role_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE project_row public.projects%ROWTYPE;
BEGIN
    IF NEW.role IS NOT DISTINCT FROM OLD.role OR NEW.user_id = auth.uid() THEN RETURN NEW; END IF;
    SELECT * INTO project_row FROM public.projects WHERE id = NEW.project_id;
    INSERT INTO public.notifications (user_id, project_id, type, title, message, action_url, action_label, metadata)
    VALUES (NEW.user_id, NEW.project_id, 'MEMBER_ROLE_CHANGED', 'Project role updated: ' || project_row.name,
        'Your role in ' || project_row.name || ' changed to ' || NEW.role::text,
        '/projects/' || NEW.project_id::text || '/members', 'View Members',
        jsonb_build_object('changed_by', auth.uid(), 'role', NEW.role::text));
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_workflow_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    project_row public.projects%ROWTYPE;
    recipient_id uuid;
    notification_kind public.notification_type;
    notification_title text;
    notification_message text;
BEGIN
    SELECT * INTO project_row FROM public.projects WHERE id = NEW.project_id;

    IF TG_OP = 'INSERT' THEN
        IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id <> auth.uid() THEN
            INSERT INTO public.notifications (user_id, project_id, type, title, message, action_url, action_label, metadata)
            VALUES (NEW.assignee_id, NEW.project_id, 'TASK_ASSIGNED', 'Task Assigned: ' || NEW.title,
                'You were assigned to "' || NEW.title || '" in ' || project_row.name,
                '/projects/' || NEW.project_id::text || '/tasks/' || NEW.id::text, 'View Task',
                jsonb_build_object('task_id', NEW.id, 'assigned_by', auth.uid()));
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL
       AND NEW.assignee_id <> auth.uid() THEN
        INSERT INTO public.notifications (user_id, project_id, type, title, message, action_url, action_label, metadata)
        VALUES (NEW.assignee_id, NEW.project_id, 'TASK_ASSIGNED', 'Task Assigned: ' || NEW.title,
            'You were assigned to "' || NEW.title || '" in ' || project_row.name,
            '/projects/' || NEW.project_id::text || '/tasks/' || NEW.id::text, 'View Task',
            jsonb_build_object('task_id', NEW.id, 'assigned_by', auth.uid()));
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.due_date IS DISTINCT FROM OLD.due_date THEN
        notification_kind := CASE WHEN NEW.status IS DISTINCT FROM OLD.status
            THEN 'TASK_STATUS_CHANGED'::public.notification_type ELSE 'TASK_UPDATED'::public.notification_type END;
        notification_title := CASE WHEN NEW.status IS DISTINCT FROM OLD.status
            THEN 'Task Status Changed: ' || NEW.title ELSE 'Task Updated: ' || NEW.title END;
        notification_message := 'Task "' || NEW.title || '" was updated in ' || project_row.name;
        FOR recipient_id IN
            SELECT DISTINCT recipient FROM unnest(ARRAY[NEW.assignee_id, NEW.created_by]) AS recipient
            WHERE recipient IS NOT NULL AND recipient <> auth.uid()
        LOOP
            INSERT INTO public.notifications (user_id, project_id, type, title, message, action_url, action_label, metadata)
            VALUES (recipient_id, NEW.project_id, notification_kind, notification_title, notification_message,
                '/projects/' || NEW.project_id::text || '/tasks/' || NEW.id::text, 'View Task',
                jsonb_build_object('task_id', NEW.id, 'changed_by', auth.uid(), 'status', NEW.status,
                    'priority', NEW.priority, 'due_date', NEW.due_date));
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_comment_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE task_row public.tasks%ROWTYPE; project_row public.projects%ROWTYPE; recipient_id uuid;
BEGIN
    SELECT * INTO task_row FROM public.tasks WHERE id = NEW.task_id;
    SELECT * INTO project_row FROM public.projects WHERE id = task_row.project_id;
    FOR recipient_id IN
        SELECT DISTINCT recipient FROM unnest(ARRAY[task_row.assignee_id, task_row.created_by]) AS recipient
        WHERE recipient IS NOT NULL AND recipient <> NEW.user_id
    LOOP
        INSERT INTO public.notifications (user_id, project_id, type, title, message, action_url, action_label, metadata)
        VALUES (recipient_id, task_row.project_id, 'TASK_COMMENT', 'New Comment: ' || task_row.title,
            'A project member commented on "' || task_row.title || '" in ' || project_row.name,
            '/projects/' || task_row.project_id::text || '/tasks/' || task_row.id::text, 'View Task',
            jsonb_build_object('task_id', task_row.id, 'comment_id', NEW.id, 'comment_author', NEW.user_id));
    END LOOP;
    RETURN NEW;
END;
$$;

-- ---- settings helpers ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_settings(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_settings JSONB;
BEGIN
    SELECT to_jsonb(us) - 'user_id' - 'created_at' - 'updated_at' - 'id'
    INTO v_settings FROM public.user_settings us WHERE us.user_id = p_user_id;
    IF v_settings IS NULL THEN
        RETURN jsonb_build_object(
            'full_name', '', 'avatar_url', '', 'phone', '', 'department', '', 'job_title', '',
            'theme', 'system', 'locale', 'en',
            'notification_preferences', jsonb_build_object(
                'task_assignments', true, 'comments', true, 'deadlines', true,
                'project_updates', true, 'files', true));
    END IF;
    RETURN v_settings;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_user_settings(
    p_user_id UUID, p_full_name VARCHAR(255) DEFAULT NULL, p_avatar_url TEXT DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL, p_department VARCHAR(100) DEFAULT NULL,
    p_job_title VARCHAR(100) DEFAULT NULL, p_theme VARCHAR(20) DEFAULT NULL,
    p_locale VARCHAR(10) DEFAULT NULL, p_notification_preferences JSONB DEFAULT NULL
)
RETURNS public.user_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_settings public.user_settings;
BEGIN
    SELECT * INTO v_settings FROM public.user_settings WHERE user_id = p_user_id;
    IF v_settings IS NULL THEN
        INSERT INTO public.user_settings (user_id, full_name, avatar_url, phone, department, job_title, theme, locale, notification_preferences)
        VALUES (p_user_id, COALESCE(p_full_name, ''), COALESCE(p_avatar_url, ''), COALESCE(p_phone, ''),
            COALESCE(p_department, ''), COALESCE(p_job_title, ''), COALESCE(p_theme, 'system'),
            COALESCE(p_locale, 'en'),
            COALESCE(p_notification_preferences, jsonb_build_object(
                'task_assignments', true, 'comments', true, 'deadlines', true,
                'project_updates', true, 'files', true)))
        RETURNING * INTO v_settings;
    ELSE
        UPDATE public.user_settings SET
            full_name = COALESCE(p_full_name, v_settings.full_name),
            avatar_url = COALESCE(p_avatar_url, v_settings.avatar_url),
            phone = COALESCE(p_phone, v_settings.phone),
            department = COALESCE(p_department, v_settings.department),
            job_title = COALESCE(p_job_title, v_settings.job_title),
            theme = COALESCE(p_theme, v_settings.theme),
            locale = COALESCE(p_locale, v_settings.locale),
            notification_preferences = COALESCE(p_notification_preferences, v_settings.notification_preferences),
            updated_at = NOW()
        WHERE user_id = p_user_id RETURNING * INTO v_settings;
    END IF;
    RETURN v_settings;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_system_settings(p_category VARCHAR(50) DEFAULT NULL)
RETURNS SETOF public.system_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF p_category IS NULL THEN
        RETURN QUERY SELECT * FROM public.system_settings ORDER BY category, key;
    ELSE
        RETURN QUERY SELECT * FROM public.system_settings WHERE category = p_category ORDER BY key;
    END IF;
END;
$$;

-- ============================================================================
-- 5. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_global_role ON public.profiles(global_role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON public.project_members(role);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON public.tasks(project_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON public.tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON public.tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON public.tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON public.task_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_deleted_at ON public.task_comments(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_file ON public.task_attachments(file_id);

CREATE INDEX IF NOT EXISTS idx_project_files_project ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON public.project_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_files_mime_type ON public.project_files(mime_type);
CREATE INDEX IF NOT EXISTS idx_project_files_deleted_at ON public.project_files(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_files_user ON public.user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_project ON public.user_files(project_id);
CREATE INDEX IF NOT EXISTS idx_user_files_deleted_at ON public.user_files(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_notes_project ON public.project_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_author ON public.project_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_pinned ON public.project_notes(project_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_project_notes_deleted_at ON public.project_notes(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_notes_user ON public.user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_project ON public.user_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_pinned ON public.user_notes(user_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_notes_deleted_at ON public.user_notes(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_project_user ON public.notifications(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

CREATE INDEX IF NOT EXISTS idx_activity_logs_project_created ON public.activity_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);

CREATE INDEX IF NOT EXISTS idx_tags_project_id ON public.tags(project_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON public.task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON public.task_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON public.task_checklists(task_id);
CREATE INDEX IF NOT EXISTS idx_user_searches_user_id_created_at ON public.user_searches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trigger_prevent_profile_role_escalation BEFORE UPDATE OF role, global_role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_project_files_updated_at ON public.project_files;
CREATE TRIGGER trigger_project_files_updated_at BEFORE UPDATE ON public.project_files
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER trigger_task_comments_updated_at BEFORE UPDATE ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_project_notes_updated_at ON public.project_notes;
CREATE TRIGGER trigger_project_notes_updated_at BEFORE UPDATE ON public.project_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_notes_updated_at ON public.user_notes;
CREATE TRIGGER trigger_user_notes_updated_at BEFORE UPDATE ON public.user_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_files_updated_at ON public.user_files;
CREATE TRIGGER trigger_user_files_updated_at BEFORE UPDATE ON public.user_files
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_enforce_single_owner ON public.project_members;
CREATE TRIGGER trigger_enforce_single_owner BEFORE INSERT OR UPDATE ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION public.enforce_single_owner();

DROP TRIGGER IF EXISTS guard_project_member_role_change ON public.project_members;
CREATE TRIGGER guard_project_member_role_change BEFORE INSERT OR UPDATE ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION public.guard_project_member_role_change();

DROP TRIGGER IF EXISTS trigger_add_project_owner_membership ON public.projects;
CREATE TRIGGER trigger_add_project_owner_membership AFTER INSERT ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.add_project_owner_membership();

DROP TRIGGER IF EXISTS trigger_set_completed_at ON public.tasks;
CREATE TRIGGER trigger_set_completed_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_completed_at();

DROP TRIGGER IF EXISTS enforce_task_assignee_membership ON public.tasks;
CREATE TRIGGER enforce_task_assignee_membership BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.enforce_task_assignee_membership();

DROP TRIGGER IF EXISTS notify_task_workflow_change ON public.tasks;
CREATE TRIGGER notify_task_workflow_change AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.notify_task_workflow_change();

DROP TRIGGER IF EXISTS notify_project_member_added ON public.project_members;
CREATE TRIGGER notify_project_member_added AFTER INSERT ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION public.notify_project_member_added();

DROP TRIGGER IF EXISTS notify_project_member_role_changed ON public.project_members;
CREATE TRIGGER notify_project_member_role_changed AFTER UPDATE OF role ON public.project_members
    FOR EACH ROW EXECUTE FUNCTION public.notify_project_member_role_changed();

DROP TRIGGER IF EXISTS notify_task_comment_added ON public.task_comments;
CREATE TRIGGER notify_task_comment_added AFTER INSERT ON public.task_comments
    FOR EACH ROW WHEN (NEW.is_system = false) EXECUTE FUNCTION public.notify_task_comment_added();

DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_checklists_updated_at ON public.task_checklists;
CREATE TRIGGER update_task_checklists_updated_at BEFORE UPDATE ON public.task_checklists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_task_progress ON public.task_checklists;
CREATE TRIGGER trigger_update_task_progress AFTER INSERT OR UPDATE OR DELETE ON public.task_checklists
    FOR EACH ROW EXECUTE FUNCTION public.update_task_progress_from_checklist();

DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trigger_user_settings_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trigger_system_settings_updated_at BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ---------- PROFILES --------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Members can view profiles in shared projects" ON public.profiles;
CREATE POLICY "Members can view profiles in shared projects" ON public.profiles
    FOR SELECT TO authenticated USING (
        public.is_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.project_members target_member
            JOIN public.project_members viewer_member
              ON viewer_member.project_id = target_member.project_id
            WHERE target_member.user_id = profiles.id
              AND viewer_member.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- PROJECTS --------------------------------------------------------
DROP POLICY IF EXISTS "Members can view active projects" ON public.projects;
CREATE POLICY "Members can view active projects" ON public.projects
    FOR SELECT USING (
        deleted_at IS NULL
        AND (
            owner_id = auth.uid()
            OR EXISTS (SELECT 1 FROM public.project_members pm
                       WHERE pm.project_id = projects.id AND pm.user_id = auth.uid())
            OR public.is_admin(auth.uid())
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
CREATE POLICY "Authenticated users can create projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

DROP POLICY IF EXISTS "Owner/Admin can update project" ON public.projects;
CREATE POLICY "Owner/Admin can update project" ON public.projects
    FOR UPDATE TO authenticated
    USING (
        owner_id = auth.uid()
        OR public.has_project_permission(id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        owner_id = auth.uid()
        OR public.has_project_permission(id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Owner/Admin can delete project" ON public.projects;
CREATE POLICY "Owner/Admin can delete project" ON public.projects
    FOR DELETE USING (owner_id = auth.uid() OR public.is_admin(auth.uid()));

-- ---------- PROJECT_MEMBERS -------------------------------------------------
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
CREATE POLICY "Members can view project members" ON public.project_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.project_members pm2
                   WHERE pm2.project_id = project_members.project_id AND pm2.user_id = auth.uid())
        OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Owner/Admin can manage members" ON public.project_members;
CREATE POLICY "Owner/Admin can manage members" ON public.project_members
    FOR ALL USING (
        public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Users can accept invitations" ON public.project_members;
CREATE POLICY "Users can accept invitations" ON public.project_members
    FOR UPDATE USING (user_id = auth.uid() AND accepted_at IS NULL)
    WITH CHECK (user_id = auth.uid() AND accepted_at IS NOT NULL);

DROP POLICY IF EXISTS "Users can leave project" ON public.project_members;
CREATE POLICY "Users can leave project" ON public.project_members
    FOR DELETE TO authenticated USING (user_id = auth.uid() AND role <> 'OWNER');

-- ---------- TASKS -----------------------------------------------------------
DROP POLICY IF EXISTS "Members can view project tasks" ON public.tasks;
CREATE POLICY "Members can view project tasks" ON public.tasks
    FOR SELECT USING (
        deleted_at IS NULL
        AND (public.is_project_member(project_id, auth.uid()) OR public.is_admin(auth.uid()))
    );

DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
CREATE POLICY "Members can create tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        AND (public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN','MEMBER']::project_role[])
             OR public.is_admin(auth.uid()))
    );

DROP POLICY IF EXISTS "Owner/Admin/Assignee can update tasks" ON public.tasks;
CREATE POLICY "Owner/Admin/Assignee can update tasks" ON public.tasks
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
             OR assignee_id = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
    WITH CHECK (
        (public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
         OR assignee_id = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()))
        AND (public.is_project_member(project_id, auth.uid()) OR public.is_admin(auth.uid()))
    );

DROP POLICY IF EXISTS "Owner/Admin can delete tasks" ON public.tasks;
CREATE POLICY "Owner/Admin can delete tasks" ON public.tasks
    FOR DELETE USING (
        public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    );

-- ---------- TASK_COMMENTS ---------------------------------------------------
DROP POLICY IF EXISTS "Members can view task comments" ON public.task_comments;
CREATE POLICY "Members can view task comments" ON public.task_comments
    FOR SELECT USING (
        deleted_at IS NULL
        AND (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id
                    AND public.is_project_member(t.project_id, auth.uid()))
             OR public.is_admin(auth.uid()))
    );

DROP POLICY IF EXISTS "Members can create comments" ON public.task_comments;
CREATE POLICY "Members can create comments" ON public.task_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id
                    AND public.is_project_member(t.project_id, auth.uid()))
    );

DROP POLICY IF EXISTS "Author can update own comments" ON public.task_comments;
CREATE POLICY "Author can update own comments" ON public.task_comments
    FOR UPDATE USING (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id
                    AND public.is_project_member(t.project_id, auth.uid()))
    )
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id
                    AND public.is_project_member(t.project_id, auth.uid()))
    );

DROP POLICY IF EXISTS "Author/Admin can delete comments" ON public.task_comments;
CREATE POLICY "Author/Admin can delete comments" ON public.task_comments
    FOR DELETE USING (
        user_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_comments.task_id
                   AND public.has_project_permission(t.project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[]))
    );

-- ---------- TASK_ATTACHMENTS -----------------------------------------------
DROP POLICY IF EXISTS "Members can view task attachments" ON public.task_attachments;
CREATE POLICY "Members can view task attachments" ON public.task_attachments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id
                AND public.is_project_member(t.project_id, auth.uid()))
        OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Members can attach files" ON public.task_attachments;
CREATE POLICY "Members can attach files" ON public.task_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.project_files pf ON pf.id = task_attachments.file_id
            WHERE t.id = task_attachments.task_id
              AND pf.project_id = t.project_id
              AND pf.deleted_at IS NULL
              AND public.has_project_permission(t.project_id, auth.uid(), ARRAY['OWNER','ADMIN','MEMBER']::project_role[])
        )
    );

DROP POLICY IF EXISTS "Uploader/Admin can delete attachments" ON public.task_attachments;
CREATE POLICY "Uploader/Admin can delete attachments" ON public.task_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR public.is_admin(auth.uid())
        OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id
                   AND public.has_project_permission(t.project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[]))
    );

-- ---------- PROJECT_FILES ---------------------------------------------------
DROP POLICY IF EXISTS "Members can view project files" ON public.project_files;
CREATE POLICY "Members can view project files" ON public.project_files
    FOR SELECT USING (
        deleted_at IS NULL
        AND (public.is_project_member(project_id, auth.uid()) OR public.is_admin(auth.uid()))
    );

DROP POLICY IF EXISTS "Members can upload files" ON public.project_files;
CREATE POLICY "Members can upload files" ON public.project_files
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND (public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN','MEMBER']::project_role[])
             OR public.is_admin(auth.uid()))
    );

DROP POLICY IF EXISTS "Uploader/Admin can update files" ON public.project_files;
CREATE POLICY "Uploader/Admin can update files" ON public.project_files
    FOR UPDATE USING (
        uploaded_by = auth.uid()
        OR public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        uploaded_by = auth.uid()
        OR public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Uploader/Admin can delete files" ON public.project_files;
CREATE POLICY "Uploader/Admin can delete files" ON public.project_files
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    );

-- ---------- USER_FILES ------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own private files" ON public.user_files;
CREATE POLICY "Users can view own private files" ON public.user_files
    FOR SELECT USING (deleted_at IS NULL AND (user_id = auth.uid() OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "Users can upload private files" ON public.user_files;
CREATE POLICY "Users can upload private files" ON public.user_files
    FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update own private files" ON public.user_files;
CREATE POLICY "Users can update own private files" ON public.user_files
    FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
    WITH CHECK ((user_id = auth.uid() OR public.is_admin(auth.uid()))
               AND public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Users can delete own private files" ON public.user_files;
CREATE POLICY "Users can delete own private files" ON public.user_files
    FOR DELETE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ---------- PROJECT_NOTES ---------------------------------------------------
DROP POLICY IF EXISTS "Members can view project notes" ON public.project_notes;
CREATE POLICY "Members can view project notes" ON public.project_notes
    FOR SELECT USING (
        deleted_at IS NULL
        AND (public.is_project_member(project_id, auth.uid()) OR public.is_admin(auth.uid()))
    );

DROP POLICY IF EXISTS "Members can create notes" ON public.project_notes;
CREATE POLICY "Members can create notes" ON public.project_notes
    FOR INSERT WITH CHECK (
        author_id = auth.uid()
        AND (public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN','MEMBER']::project_role[])
             OR public.is_admin(auth.uid()))
    );

DROP POLICY IF EXISTS "Author/Admin can update notes" ON public.project_notes;
CREATE POLICY "Author/Admin can update notes" ON public.project_notes
    FOR UPDATE USING (
        author_id = auth.uid()
        OR public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        author_id = auth.uid()
        OR public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Author/Admin can delete notes" ON public.project_notes;
CREATE POLICY "Author/Admin can delete notes" ON public.project_notes
    FOR DELETE USING (
        author_id = auth.uid()
        OR public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER','ADMIN']::project_role[])
        OR public.is_admin(auth.uid())
    );

-- ---------- USER_NOTES ------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own private notes" ON public.user_notes;
CREATE POLICY "Users can view own private notes" ON public.user_notes
    FOR SELECT USING (deleted_at IS NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create private notes" ON public.user_notes;
CREATE POLICY "Users can create private notes" ON public.user_notes
    FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update own private notes" ON public.user_notes;
CREATE POLICY "Users can update own private notes" ON public.user_notes
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own private notes" ON public.user_notes;
CREATE POLICY "Users can delete own private notes" ON public.user_notes
    FOR DELETE USING (user_id = auth.uid());

-- ---------- NOTIFICATIONS ---------------------------------------------------
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR public.is_admin(auth.uid()));

-- ---------- ACTIVITY_LOGS ---------------------------------------------------
DROP POLICY IF EXISTS "Members can view project activity" ON public.activity_logs;
CREATE POLICY "Members can view project activity" ON public.activity_logs
    FOR SELECT USING (
        project_id IS NULL
        OR public.is_project_member(project_id, auth.uid())
        OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
CREATE POLICY "System can insert activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role' OR public.is_admin(auth.uid()));

-- ---------- TAGS ------------------------------------------------------------
DROP POLICY IF EXISTS "Project members can view tags" ON public.tags;
CREATE POLICY "Project members can view tags" ON public.tags
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.project_members pm
                WHERE pm.project_id = tags.project_id AND pm.user_id = auth.uid())
        OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Project admins can manage tags" ON public.tags;
CREATE POLICY "Project admins can manage tags" ON public.tags
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.project_members pm
                WHERE pm.project_id = tags.project_id AND pm.user_id = auth.uid() AND pm.role IN ('OWNER','ADMIN'))
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.project_members pm
                WHERE pm.project_id = tags.project_id AND pm.user_id = auth.uid() AND pm.role IN ('OWNER','ADMIN'))
        OR public.is_admin(auth.uid())
    );

-- ---------- TASK_TAGS -------------------------------------------------------
DROP POLICY IF EXISTS "Project members can view task tags" ON public.task_tags;
CREATE POLICY "Project members can view task tags" ON public.task_tags
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.tasks t
                JOIN public.project_members pm ON pm.project_id = t.project_id
                WHERE t.id = task_tags.task_id AND pm.user_id = auth.uid() AND t.deleted_at IS NULL)
        OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Task editors can manage tags" ON public.task_tags;
CREATE POLICY "Task editors can manage tags" ON public.task_tags
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.tasks t
                JOIN public.project_members pm ON pm.project_id = t.project_id
                WHERE t.id = task_tags.task_id AND pm.user_id = auth.uid()
                  AND pm.role IN ('OWNER','ADMIN','MEMBER') AND t.deleted_at IS NULL)
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.tasks t
                JOIN public.project_members pm ON pm.project_id = t.project_id
                WHERE t.id = task_tags.task_id AND pm.user_id = auth.uid()
                  AND pm.role IN ('OWNER','ADMIN','MEMBER') AND t.deleted_at IS NULL)
        OR public.is_admin(auth.uid())
    );

-- ---------- TASK_CHECKLISTS -------------------------------------------------
DROP POLICY IF EXISTS "Project members can view checklists" ON public.task_checklists;
CREATE POLICY "Project members can view checklists" ON public.task_checklists
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.tasks t
                JOIN public.project_members pm ON pm.project_id = t.project_id
                WHERE t.id = task_checklists.task_id AND pm.user_id = auth.uid() AND t.deleted_at IS NULL)
        OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Task editors can manage checklists" ON public.task_checklists;
CREATE POLICY "Task editors can manage checklists" ON public.task_checklists
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.tasks t
                JOIN public.project_members pm ON pm.project_id = t.project_id
                WHERE t.id = task_checklists.task_id AND pm.user_id = auth.uid()
                  AND pm.role IN ('OWNER','ADMIN','MEMBER') AND t.deleted_at IS NULL)
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.tasks t
                JOIN public.project_members pm ON pm.project_id = t.project_id
                WHERE t.id = task_checklists.task_id AND pm.user_id = auth.uid()
                  AND pm.role IN ('OWNER','ADMIN','MEMBER') AND t.deleted_at IS NULL)
        OR public.is_admin(auth.uid())
    );

-- ---------- PERMISSIONS / ROLE_PERMISSIONS ---------------------------------
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.permissions;
CREATE POLICY "Authenticated users can read permissions" ON public.permissions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can read role permissions" ON public.role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- ---------- USER_SEARCHES ---------------------------------------------------
DROP POLICY IF EXISTS "Users can view own searches" ON public.user_searches;
CREATE POLICY "Users can view own searches" ON public.user_searches
    FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own searches" ON public.user_searches;
CREATE POLICY "Users can insert own searches" ON public.user_searches
    FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete own searches" ON public.user_searches;
CREATE POLICY "Users can delete own searches" ON public.user_searches
    FOR DELETE USING (user_id = auth.uid());

-- ---------- USER_SETTINGS ---------------------------------------------------
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view all user settings" ON public.user_settings;
CREATE POLICY "Admins can view all user settings" ON public.user_settings
    FOR SELECT USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can update all user settings" ON public.user_settings;
CREATE POLICY "Admins can update all user settings" ON public.user_settings
    FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- SYSTEM_SETTINGS -------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all system settings" ON public.system_settings;
CREATE POLICY "Admins can view all system settings" ON public.system_settings
    FOR SELECT USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can insert system settings" ON public.system_settings;
CREATE POLICY "Admins can insert system settings" ON public.system_settings
    FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can update system settings" ON public.system_settings;
CREATE POLICY "Admins can update system settings" ON public.system_settings
    FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete system settings" ON public.system_settings;
CREATE POLICY "Admins can delete system settings" ON public.system_settings
    FOR DELETE USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view public system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can view public system settings" ON public.system_settings
    FOR SELECT USING (is_public = true AND auth.role() = 'authenticated');

-- ============================================================================
-- 8. VIEWS & MATERIALIZED VIEWS
-- ============================================================================
DROP VIEW IF EXISTS public.active_projects CASCADE;
CREATE VIEW public.active_projects WITH (security_invoker = true) AS
    SELECT * FROM public.projects WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_tasks CASCADE;
CREATE VIEW public.active_tasks WITH (security_invoker = true) AS
    SELECT * FROM public.tasks WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_task_comments CASCADE;
CREATE VIEW public.active_task_comments WITH (security_invoker = true) AS
    SELECT * FROM public.task_comments WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_project_files CASCADE;
CREATE VIEW public.active_project_files WITH (security_invoker = true) AS
    SELECT * FROM public.project_files WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_user_files CASCADE;
CREATE VIEW public.active_user_files WITH (security_invoker = true) AS
    SELECT * FROM public.user_files WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_project_notes CASCADE;
CREATE VIEW public.active_project_notes WITH (security_invoker = true) AS
    SELECT * FROM public.project_notes WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_user_notes CASCADE;
CREATE VIEW public.active_user_notes WITH (security_invoker = true) AS
    SELECT * FROM public.user_notes WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.unread_notifications CASCADE;
CREATE VIEW public.unread_notifications WITH (security_invoker = true) AS
    SELECT * FROM public.notifications WHERE read_at IS NULL;

DROP MATERIALIZED VIEW IF EXISTS public.project_task_stats CASCADE;
CREATE MATERIALIZED VIEW public.project_task_stats AS
SELECT project_id,
    COUNT(*) AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'TODO') AS todo_count,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_count,
    COUNT(*) FILTER (WHERE status = 'REVIEW') AS review_count,
    COUNT(*) FILTER (WHERE status = 'BLOCKED') AS blocked_count,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_count,
    COUNT(*) FILTER (WHERE priority = 'URGENT') AS urgent_count,
    COUNT(*) FILTER (WHERE priority = 'HIGH') AS high_count,
    AVG(progress)::numeric(5,2) AS avg_progress,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status <> 'COMPLETED') AS overdue_count
FROM public.tasks WHERE deleted_at IS NULL GROUP BY project_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_task_stats_project ON public.project_task_stats(project_id);

DROP MATERIALIZED VIEW IF EXISTS public.user_workload CASCADE;
CREATE MATERIALIZED VIEW public.user_workload AS
SELECT assignee_id AS user_id,
    COUNT(*) AS assigned_count,
    COUNT(*) FILTER (WHERE status = 'TODO') AS todo_count,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_count,
    COUNT(*) FILTER (WHERE status = 'REVIEW') AS review_count,
    COUNT(*) FILTER (WHERE status = 'BLOCKED') AS blocked_count,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status <> 'COMPLETED') AS overdue_count,
    COUNT(*) FILTER (WHERE priority = 'URGENT') AS urgent_count
FROM public.tasks WHERE deleted_at IS NULL AND assignee_id IS NOT NULL GROUP BY assignee_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_workload_user ON public.user_workload(user_id);

-- ============================================================================
-- 9. REALTIME PUBLICATION
-- ============================================================================
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================================
-- 10. STORAGE BUCKETS & POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false)
    ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('user-files', 'user-files', false)
    ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets SET public = false WHERE id IN ('project-files', 'user-files');
UPDATE storage.buckets SET public = true WHERE id = 'avatars';

-- project-files
DROP POLICY IF EXISTS "project_files_select" ON storage.objects;
CREATE POLICY "project_files_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'project-files' AND public.storage_is_project_member(public.storage_project_id_from_path(name)));

DROP POLICY IF EXISTS "project_files_insert" ON storage.objects;
CREATE POLICY "project_files_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'project-files' AND public.storage_can_upload_project_file(public.storage_project_id_from_path(name)));

DROP POLICY IF EXISTS "project_files_update" ON storage.objects;
CREATE POLICY "project_files_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'project-files'
           AND (owner_id::uuid = auth.uid() OR public.storage_is_project_admin(public.storage_project_id_from_path(name))))
    WITH CHECK (bucket_id = 'project-files' AND public.storage_is_project_member(public.storage_project_id_from_path(name)));

DROP POLICY IF EXISTS "project_files_delete" ON storage.objects;
CREATE POLICY "project_files_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'project-files'
           AND (owner_id::uuid = auth.uid() OR public.storage_is_project_admin(public.storage_project_id_from_path(name))));

-- user-files
DROP POLICY IF EXISTS "user_files_select" ON storage.objects;
CREATE POLICY "user_files_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'user-files' AND (
        (public.storage_user_id_from_path(name) = auth.uid()
         AND public.storage_is_project_member(public.storage_user_file_project_id_from_path(name)))
        OR public.storage_is_admin()));

DROP POLICY IF EXISTS "user_files_insert" ON storage.objects;
CREATE POLICY "user_files_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'user-files'
        AND public.storage_user_id_from_path(name) = auth.uid()
        AND public.storage_is_project_member(public.storage_user_file_project_id_from_path(name)));

DROP POLICY IF EXISTS "user_files_update" ON storage.objects;
CREATE POLICY "user_files_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'user-files' AND (
        (public.storage_user_id_from_path(name) = auth.uid()
         AND public.storage_is_project_member(public.storage_user_file_project_id_from_path(name)))
        OR public.storage_is_admin()))
    WITH CHECK (bucket_id = 'user-files' AND (
        (public.storage_user_id_from_path(name) = auth.uid()
         AND public.storage_is_project_member(public.storage_user_file_project_id_from_path(name)))
        OR public.storage_is_admin()));

DROP POLICY IF EXISTS "user_files_delete" ON storage.objects;
CREATE POLICY "user_files_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'user-files' AND (
        (public.storage_user_id_from_path(name) = auth.uid()
         AND public.storage_is_project_member(public.storage_user_file_project_id_from_path(name)))
        OR public.storage_is_admin()));

-- avatars (public read)
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text)
    WITH CHECK (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND split_part(name, '/', 1) = auth.uid()::text);

-- ============================================================================
-- 11. GRANTS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.project_members TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.task_comments TO authenticated;
GRANT ALL ON public.task_attachments TO authenticated;
GRANT ALL ON public.project_files TO authenticated;
GRANT ALL ON public.user_files TO authenticated;
GRANT ALL ON public.project_notes TO authenticated;
GRANT ALL ON public.user_notes TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_checklists TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_searches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;

GRANT SELECT ON public.active_projects TO authenticated;
GRANT SELECT ON public.active_tasks TO authenticated;
GRANT SELECT ON public.active_task_comments TO authenticated;
GRANT SELECT ON public.active_project_files TO authenticated;
GRANT SELECT ON public.active_user_files TO authenticated;
GRANT SELECT ON public.active_project_notes TO authenticated;
GRANT SELECT ON public.active_user_notes TO authenticated;
GRANT SELECT ON public.unread_notifications TO authenticated;

REVOKE ALL ON public.project_task_stats, public.user_workload FROM PUBLIC, anon, authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT UPDATE (email, full_name, avatar_url, locale, theme, notification_preferences, phone, department, job_title)
    ON public.profiles TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_project_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_permission(uuid, uuid, project_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_member_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, varchar, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_manager(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_settings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_settings(uuid, varchar, text, varchar, varchar, varchar, varchar, varchar, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_settings(varchar) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_materialized_views() TO service_role;

-- ============================================================================
-- 12. SEED / REFERENCE DATA
-- ============================================================================
INSERT INTO public.permissions (name, description, category) VALUES
('project.create', 'Create new projects', 'project'),
('project.read', 'View projects', 'project'),
('project.update', 'Update project details', 'project'),
('project.delete', 'Archive/delete projects', 'project'),
('project.manage_members', 'Add/remove project members', 'project'),
('project.manage_roles', 'Change member roles in project', 'project'),
('project.settings', 'Manage project settings', 'project'),
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
('team.view_members', 'View team members', 'team'),
('team.add_member', 'Add members to projects', 'team'),
('team.remove_member', 'Remove members from projects', 'team'),
('team.change_role', 'Change member project roles', 'team'),
('team.view_workload', 'View member workload', 'team'),
('admin.create_user', 'Create new users', 'admin'),
('admin.update_user', 'Update any user', 'admin'),
('admin.disable_user', 'Disable/enable users', 'admin'),
('admin.reset_password', 'Reset user passwords', 'admin'),
('admin.change_global_role', 'Change user global roles', 'admin'),
('admin.view_all_projects', 'View all projects', 'admin'),
('admin.view_all_users', 'View all users', 'admin'),
('admin.system_settings', 'Manage system settings', 'admin'),
('file.upload', 'Upload files', 'file'),
('file.download', 'Download files', 'file'),
('file.delete', 'Delete files', 'file'),
('file.manage', 'Manage file settings', 'file'),
('note.create', 'Create notes', 'note'),
('note.read', 'Read notes', 'note'),
('note.update', 'Update notes', 'note'),
('note.delete', 'Delete notes', 'note'),
('note.pin', 'Pin/unpin notes', 'note')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_name, scope) VALUES
('ADMIN', 'project.create', 'global'), ('ADMIN', 'project.read', 'global'),
('ADMIN', 'project.update', 'global'), ('ADMIN', 'project.delete', 'global'),
('ADMIN', 'project.manage_members', 'global'), ('ADMIN', 'project.manage_roles', 'global'),
('ADMIN', 'project.settings', 'global'), ('ADMIN', 'task.create', 'global'),
('ADMIN', 'task.read', 'global'), ('ADMIN', 'task.update', 'global'),
('ADMIN', 'task.delete', 'global'), ('ADMIN', 'task.assign', 'global'),
('ADMIN', 'task.change_status', 'global'), ('ADMIN', 'task.change_priority', 'global'),
('ADMIN', 'task.comment', 'global'), ('ADMIN', 'task.attach_files', 'global'),
('ADMIN', 'task.manage_checklists', 'global'), ('ADMIN', 'task.manage_tags', 'global'),
('ADMIN', 'team.view_members', 'global'), ('ADMIN', 'team.add_member', 'global'),
('ADMIN', 'team.remove_member', 'global'), ('ADMIN', 'team.change_role', 'global'),
('ADMIN', 'team.view_workload', 'global'), ('ADMIN', 'admin.create_user', 'global'),
('ADMIN', 'admin.update_user', 'global'), ('ADMIN', 'admin.disable_user', 'global'),
('ADMIN', 'admin.reset_password', 'global'), ('ADMIN', 'admin.change_global_role', 'global'),
('ADMIN', 'admin.view_all_projects', 'global'), ('ADMIN', 'admin.view_all_users', 'global'),
('ADMIN', 'admin.system_settings', 'global'), ('ADMIN', 'file.upload', 'global'),
('ADMIN', 'file.download', 'global'), ('ADMIN', 'file.delete', 'global'),
('ADMIN', 'file.manage', 'global'), ('ADMIN', 'note.create', 'global'),
('ADMIN', 'note.read', 'global'), ('ADMIN', 'note.update', 'global'),
('ADMIN', 'note.delete', 'global'), ('ADMIN', 'note.pin', 'global'),
('PROJECT_MANAGER', 'project.read', 'project'), ('PROJECT_MANAGER', 'project.update', 'project'),
('PROJECT_MANAGER', 'project.manage_members', 'project'), ('PROJECT_MANAGER', 'project.manage_roles', 'project'),
('PROJECT_MANAGER', 'project.settings', 'project'), ('PROJECT_MANAGER', 'task.create', 'project'),
('PROJECT_MANAGER', 'task.read', 'project'), ('PROJECT_MANAGER', 'task.update', 'project'),
('PROJECT_MANAGER', 'task.delete', 'project'), ('PROJECT_MANAGER', 'task.assign', 'project'),
('PROJECT_MANAGER', 'task.change_status', 'project'), ('PROJECT_MANAGER', 'task.change_priority', 'project'),
('PROJECT_MANAGER', 'task.comment', 'project'), ('PROJECT_MANAGER', 'task.attach_files', 'project'),
('PROJECT_MANAGER', 'task.manage_checklists', 'project'), ('PROJECT_MANAGER', 'task.manage_tags', 'project'),
('PROJECT_MANAGER', 'team.view_members', 'project'), ('PROJECT_MANAGER', 'team.add_member', 'project'),
('PROJECT_MANAGER', 'team.remove_member', 'project'), ('PROJECT_MANAGER', 'team.change_role', 'project'),
('PROJECT_MANAGER', 'team.view_workload', 'project'), ('PROJECT_MANAGER', 'file.upload', 'project'),
('PROJECT_MANAGER', 'file.download', 'project'), ('PROJECT_MANAGER', 'file.delete', 'project'),
('PROJECT_MANAGER', 'file.manage', 'project'), ('PROJECT_MANAGER', 'note.create', 'project'),
('PROJECT_MANAGER', 'note.read', 'project'), ('PROJECT_MANAGER', 'note.update', 'project'),
('PROJECT_MANAGER', 'note.delete', 'project'), ('PROJECT_MANAGER', 'note.pin', 'project'),
('USER', 'project.read', 'project'), ('USER', 'task.create', 'project'),
('USER', 'task.read', 'project'), ('USER', 'task.update', 'own'),
('USER', 'task.change_status', 'own'), ('USER', 'task.comment', 'project'),
('USER', 'task.attach_files', 'own'), ('USER', 'task.manage_checklists', 'own'),
('USER', 'task.manage_tags', 'own'), ('USER', 'team.view_members', 'project'),
('USER', 'file.upload', 'project'), ('USER', 'file.download', 'project'),
('USER', 'note.create', 'project'), ('USER', 'note.read', 'project'),
('USER', 'note.update', 'own'), ('USER', 'note.delete', 'own')
ON CONFLICT (role, permission_name) DO NOTHING;

INSERT INTO public.system_settings (key, value, description, category, is_public) VALUES
('project_default_status', '"ACTIVE"', 'Default status for new projects', 'project_defaults', true),
('project_default_role', '"MEMBER"', 'Default role for new project members', 'project_defaults', true),
('project_key_format', '"^[A-Z]{2,10}$"', 'Regex pattern for project key validation', 'project_defaults', true),
('max_file_size_mb', '100', 'Maximum file upload size in MB', 'file_limits', true),
('allowed_file_types', '["image/*", "application/pdf", "text/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "text/csv"]', 'Allowed MIME types for file uploads', 'file_limits', true),
('task_statuses', '["TODO", "IN_PROGRESS", "REVIEW", "BLOCKED", "COMPLETED"]', 'Available task statuses', 'task_statuses', true),
('task_priorities', '["LOW", "MEDIUM", "HIGH", "URGENT"]', 'Available task priorities', 'task_priorities', true),
('company_name', '""', 'Company/organization name', 'company', true),
('company_logo_url', '""', 'Company logo URL', 'company', true),
('support_email', '""', 'Support contact email', 'company', true)
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ============================================================================
-- END OF AUTHORITATIVE SCHEMA
-- Tables: 20  |  Enums: 7  |  Views: 8  |  Materialized views: 2
-- RLS enabled on all application tables. Storage buckets + policies included.
-- ============================================================================
</｜｜DSML｜｜ parameter>
</write_to_file>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>