-- ============================================================================
-- PROJECT MANAGEMENT DATABASE MIGRATION
-- Supabase / PostgreSQL
-- Ordered and RLS-safe version
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
        'MENTION',
        'TASK_ASSIGNED',
        'TASK_UPDATED',
        'TASK_STATUS_CHANGED',
        'TASK_COMMENT',
        'TASK_DUE_SOON',
        'TASK_OVERDUE',
        'PROJECT_INVITE',
        'PROJECT_UPDATED',
        'MEMBER_ADDED',
        'MEMBER_ROLE_CHANGED',
        'FILE_UPLOADED',
        'NOTE_CREATED',
        'NOTE_COMMENT',
        'NOTE_MENTION',
        'SYSTEM_ALERT'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE activity_action AS ENUM (
        'PROJECT_CREATED',
        'PROJECT_UPDATED',
        'PROJECT_ARCHIVED',
        'PROJECT_DELETED',
        'TASK_CREATED',
        'TASK_UPDATED',
        'TASK_STATUS_CHANGED',
        'TASK_ASSIGNED',
        'TASK_PRIORITY_CHANGED',
        'TASK_DELETED',
        'MEMBER_INVITED',
        'MEMBER_JOINED',
        'MEMBER_ROLE_CHANGED',
        'MEMBER_REMOVED',
        'FILE_UPLOADED',
        'FILE_DOWNLOADED',
        'FILE_DELETED',
        'NOTE_CREATED',
        'NOTE_UPDATED',
        'NOTE_DELETED',
        'NOTE_PRIVACY_CHANGED',
        'COMMENT_CREATED',
        'COMMENT_UPDATED',
        'COMMENT_DELETED',
        'USER_PROFILE_UPDATED',
        'USER_AVATAR_CHANGED',
        'USER_LOGIN',
        'USER_LOGOUT',
        'PASSWORD_RESET_REQUESTED',
        'PASSWORD_RESET'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM ('project', 'task', 'member', 'file', 'note', 'comment', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 3. TABLES
-- Important: ALL referenced tables are created before dependent tables,
-- functions, triggers and policies.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 PROFILES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    full_name text,
    avatar_url text,
    role user_role NOT NULL DEFAULT 'USER',
    locale text DEFAULT 'en',
    theme text DEFAULT 'system',
    notification_preferences jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3.2 PROJECTS
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3.3 PROJECT_MEMBERS
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3.4 TASKS
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3.5 PROJECT_FILES
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3.6 TASK_ATTACHMENTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_id uuid NOT NULL REFERENCES public.project_files(id) ON DELETE CASCADE,
    uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_task_attachments_unique UNIQUE (task_id, file_id)
);

-- ----------------------------------------------------------------------------
-- 3.7 TASK_COMMENTS
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3.8 USER_FILES
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3.9 PROJECT_NOTES
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3.10 USER_NOTES
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3.11 NOTIFICATIONS
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3.12 ACTIVITY_LOGS
-- ----------------------------------------------------------------------------

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

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- Functions are created AFTER all tables they reference.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Safe admin check. SECURITY DEFINER avoids recursive profiles RLS.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = p_user_id
          AND (p_user_id = auth.uid() OR auth.role() = 'service_role')
          AND role = 'ADMIN'
    );
$$;

-- Safe membership check. SECURITY DEFINER avoids project_members RLS recursion.
CREATE OR REPLACE FUNCTION public.is_project_member(
    p_project_id uuid,
    p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.role() = 'service_role' OR (
      p_user_id = auth.uid() AND EXISTS (
        SELECT 1
        FROM public.project_members
        WHERE project_id = p_project_id
          AND user_id = p_user_id
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_project_role(
    p_project_id uuid,
    p_user_id uuid
)
RETURNS project_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
      WHEN auth.role() = 'service_role' OR p_user_id = auth.uid() THEN (
        SELECT role
        FROM public.project_members
        WHERE project_id = p_project_id
          AND user_id = p_user_id
        LIMIT 1
      )
      ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.has_project_permission(
    p_project_id uuid,
    p_user_id uuid,
    p_required_roles project_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.role() = 'service_role' OR (
      p_user_id = auth.uid() AND EXISTS (
        SELECT 1
        FROM public.project_members
        WHERE project_id = p_project_id
          AND user_id = p_user_id
          AND role = ANY(p_required_roles)
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_project_member_count(
    p_project_id uuid
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
      WHEN auth.role() = 'service_role' OR public.is_admin(auth.uid())
        OR public.is_project_member(p_project_id, auth.uid())
      THEN (SELECT COUNT(*)::integer
            FROM public.project_members
            WHERE project_id = p_project_id)
      ELSE 0
    END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND auth.role() <> 'service_role'
       AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only a global admin may change a profile role';
    END IF;
    RETURN NEW;
END;
$$;

-- Enforce one OWNER per project.
CREATE OR REPLACE FUNCTION public.enforce_single_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role = 'OWNER' THEN
        IF EXISTS (
            SELECT 1
            FROM public.project_members
            WHERE project_id = NEW.project_id
              AND role = 'OWNER'
              AND user_id <> NEW.user_id
        ) THEN
            RAISE EXCEPTION 'Project can only have one OWNER';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create profile after Supabase Auth signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        role
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        'USER'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Automatically add project owner to project_members.
CREATE OR REPLACE FUNCTION public.add_project_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.project_members (
        project_id,
        user_id,
        role,
        joined_at,
        accepted_at
    )
    VALUES (
        NEW.id,
        NEW.owner_id,
        'OWNER',
        now(),
        now()
    )
    ON CONFLICT (project_id, user_id)
    DO UPDATE SET role = 'OWNER';

    RETURN NEW;
END;
$$;

-- Automatically set completed_at/progress.
CREATE OR REPLACE FUNCTION public.set_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.project_task_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_workload;
END;
$$;

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role
    ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_projects_owner
    ON public.projects(owner_id);

CREATE INDEX IF NOT EXISTS idx_projects_status
    ON public.projects(status);

CREATE INDEX IF NOT EXISTS idx_projects_deleted_at
    ON public.projects(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_members_project
    ON public.project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user
    ON public.project_members(user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_role
    ON public.project_members(role);

CREATE INDEX IF NOT EXISTS idx_tasks_project
    ON public.tasks(project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee
    ON public.tasks(assignee_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status
    ON public.tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_priority
    ON public.tasks(priority);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
    ON public.tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_position
    ON public.tasks(project_id, position);

CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at
    ON public.tasks(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_status
    ON public.tasks(project_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
    ON public.tasks(assignee_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by
    ON public.tasks(created_by);

CREATE INDEX IF NOT EXISTS idx_task_comments_task
    ON public.task_comments(task_id);

CREATE INDEX IF NOT EXISTS idx_task_comments_user
    ON public.task_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_task_comments_parent
    ON public.task_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_task_comments_deleted_at
    ON public.task_comments(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_task_attachments_task
    ON public.task_attachments(task_id);

CREATE INDEX IF NOT EXISTS idx_task_attachments_file
    ON public.task_attachments(file_id);

CREATE INDEX IF NOT EXISTS idx_project_files_project
    ON public.project_files(project_id);

CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by
    ON public.project_files(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_project_files_mime_type
    ON public.project_files(mime_type);

CREATE INDEX IF NOT EXISTS idx_project_files_deleted_at
    ON public.project_files(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_files_user
    ON public.user_files(user_id);

CREATE INDEX IF NOT EXISTS idx_user_files_project
    ON public.user_files(project_id);

CREATE INDEX IF NOT EXISTS idx_user_files_deleted_at
    ON public.user_files(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_notes_project
    ON public.project_notes(project_id);

CREATE INDEX IF NOT EXISTS idx_project_notes_author
    ON public.project_notes(author_id);

CREATE INDEX IF NOT EXISTS idx_project_notes_pinned
    ON public.project_notes(project_id, is_pinned)
    WHERE is_pinned = TRUE;

CREATE INDEX IF NOT EXISTS idx_project_notes_deleted_at
    ON public.project_notes(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_notes_user
    ON public.user_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notes_project
    ON public.user_notes(project_id);

CREATE INDEX IF NOT EXISTS idx_user_notes_pinned
    ON public.user_notes(user_id, is_pinned)
    WHERE is_pinned = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_notes_deleted_at
    ON public.user_notes(deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON public.notifications(user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_project_user
    ON public.notifications(project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON public.notifications(user_id)
    WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type
    ON public.notifications(type);

CREATE INDEX IF NOT EXISTS idx_activity_logs_project_created
    ON public.activity_logs(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
    ON public.activity_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
    ON public.activity_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action
    ON public.activity_logs(action);

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trigger_prevent_profile_role_escalation
    BEFORE UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_role_escalation();

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_project_files_updated_at ON public.project_files;
CREATE TRIGGER trigger_project_files_updated_at
    BEFORE UPDATE ON public.project_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER trigger_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_project_notes_updated_at ON public.project_notes;
CREATE TRIGGER trigger_project_notes_updated_at
    BEFORE UPDATE ON public.project_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_notes_updated_at ON public.user_notes;
CREATE TRIGGER trigger_user_notes_updated_at
    BEFORE UPDATE ON public.user_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_files_updated_at ON public.user_files;
CREATE TRIGGER trigger_user_files_updated_at
    BEFORE UPDATE ON public.user_files
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_enforce_single_owner ON public.project_members;
CREATE TRIGGER trigger_enforce_single_owner
    BEFORE INSERT OR UPDATE ON public.project_members
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_single_owner();

DROP TRIGGER IF EXISTS trigger_add_project_owner_membership ON public.projects;
CREATE TRIGGER trigger_add_project_owner_membership
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.add_project_owner_membership();

DROP TRIGGER IF EXISTS trigger_set_completed_at ON public.tasks;
CREATE TRIGGER trigger_set_completed_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_completed_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

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

-- ============================================================================
-- 8. DROP OLD POLICIES
-- This makes the migration safe to re-run.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Members can view active projects" ON public.projects;
DROP POLICY IF EXISTS "Owner/Admin can update project" ON public.projects;
DROP POLICY IF EXISTS "Owner/Admin can delete project" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;

DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Owner/Admin can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can accept invitations" ON public.project_members;

DROP POLICY IF EXISTS "Members can view project tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Owner/Admin/Assignee can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Owner/Admin can delete tasks" ON public.tasks;

DROP POLICY IF EXISTS "Members can view task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Members can create comments" ON public.task_comments;
DROP POLICY IF EXISTS "Author can update own comments" ON public.task_comments;
DROP POLICY IF EXISTS "Author/Admin can delete comments" ON public.task_comments;

DROP POLICY IF EXISTS "Members can view task attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Members can attach files" ON public.task_attachments;
DROP POLICY IF EXISTS "Uploader/Admin can delete attachments" ON public.task_attachments;

DROP POLICY IF EXISTS "Members can view project files" ON public.project_files;
DROP POLICY IF EXISTS "Members can upload files" ON public.project_files;
DROP POLICY IF EXISTS "Uploader/Admin can update files" ON public.project_files;
DROP POLICY IF EXISTS "Uploader/Admin can delete files" ON public.project_files;

DROP POLICY IF EXISTS "Users can view own private files" ON public.user_files;
DROP POLICY IF EXISTS "Users can upload private files" ON public.user_files;
DROP POLICY IF EXISTS "Users can update own private files" ON public.user_files;
DROP POLICY IF EXISTS "Users can delete own private files" ON public.user_files;

DROP POLICY IF EXISTS "Members can view project notes" ON public.project_notes;
DROP POLICY IF EXISTS "Members can create notes" ON public.project_notes;
DROP POLICY IF EXISTS "Author/Admin can update notes" ON public.project_notes;
DROP POLICY IF EXISTS "Author/Admin can delete notes" ON public.project_notes;

DROP POLICY IF EXISTS "Users can view own private notes" ON public.user_notes;
DROP POLICY IF EXISTS "Users can create private notes" ON public.user_notes;
DROP POLICY IF EXISTS "Users can update own private notes" ON public.user_notes;
DROP POLICY IF EXISTS "Users can delete own private notes" ON public.user_notes;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

DROP POLICY IF EXISTS "Members can view project activity" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;

-- ============================================================================
-- 9. RLS POLICIES
-- Helper functions are used where querying the same RLS-protected table
-- would otherwise cause recursion.
-- ============================================================================

-- PROFILES

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- PROJECTS

CREATE POLICY "Members can view active projects"
ON public.projects
FOR SELECT
USING (
    deleted_at IS NULL
    AND (
        owner_id = auth.uid()
        OR public.is_project_member(id, auth.uid())
        OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Authenticated users can create projects"
ON public.projects
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
);

CREATE POLICY "Owner/Admin can update project"
ON public.projects
FOR UPDATE
USING (
    owner_id = auth.uid()
    OR public.has_project_permission(
        id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    owner_id = auth.uid()
    OR public.has_project_permission(
        id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Owner/Admin can delete project"
ON public.projects
FOR DELETE
USING (
    owner_id = auth.uid()
    OR public.is_admin(auth.uid())
);

-- PROJECT MEMBERS

CREATE POLICY "Members can view project members"
ON public.project_members
FOR SELECT
USING (
    -- Direct check without helper function to avoid RLS recursion
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.project_members pm2
        WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
        AND pm2.role IN ('OWNER', 'ADMIN')
    )
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Owner/Admin can manage members"
ON public.project_members
FOR ALL
USING (
    public.has_project_permission(
        project_id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    public.has_project_permission(
        project_id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can accept invitations"
ON public.project_members
FOR UPDATE
USING (
    user_id = auth.uid()
    AND accepted_at IS NULL
)
WITH CHECK (
    user_id = auth.uid()
    AND accepted_at IS NOT NULL
);

-- TASKS

CREATE POLICY "Members can view project tasks"
ON public.tasks
FOR SELECT
USING (
    deleted_at IS NULL
    AND (
        public.is_project_member(project_id, auth.uid())
        OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Members can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
    created_by = auth.uid()
    AND (
        public.has_project_permission(
            project_id,
            auth.uid(),
            ARRAY['OWNER', 'ADMIN', 'MEMBER']::project_role[]
        )
        OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Owner/Admin/Assignee can update tasks"
ON public.tasks
FOR UPDATE
USING (
    deleted_at IS NULL
    AND (
        public.has_project_permission(
            project_id,
            auth.uid(),
            ARRAY['OWNER', 'ADMIN']::project_role[]
        )
        OR assignee_id = auth.uid()
        OR created_by = auth.uid()
        OR public.is_admin(auth.uid())
    )
)
WITH CHECK (
    public.has_project_permission(
        project_id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Owner/Admin can delete tasks"
ON public.tasks
FOR DELETE
USING (
    public.has_project_permission(
        project_id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
);

-- TASK COMMENTS

CREATE POLICY "Members can view task comments"
ON public.task_comments
FOR SELECT
USING (
    deleted_at IS NULL
    AND (
        EXISTS (
            SELECT 1
            FROM public.tasks t
            WHERE t.id = task_comments.task_id
              AND public.is_project_member(t.project_id, auth.uid())
        )
        OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Members can create comments"
ON public.task_comments
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.id = task_comments.task_id
          AND public.is_project_member(t.project_id, auth.uid())
    )
);

CREATE POLICY "Author can update own comments"
ON public.task_comments
FOR UPDATE
USING (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_comments.task_id
          AND public.is_project_member(t.project_id, auth.uid())
    )
)
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_comments.task_id
          AND public.is_project_member(t.project_id, auth.uid())
    )
);

CREATE POLICY "Author/Admin can delete comments"
ON public.task_comments
FOR DELETE
USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.id = task_comments.task_id
          AND public.has_project_permission(
              t.project_id,
              auth.uid(),
              ARRAY['OWNER', 'ADMIN']::project_role[]
          )
    )
);

-- TASK ATTACHMENTS

CREATE POLICY "Members can view task attachments"
ON public.task_attachments
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.id = task_attachments.task_id
          AND public.is_project_member(t.project_id, auth.uid())
    )
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Members can attach files"
ON public.task_attachments
FOR INSERT
WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.id = task_attachments.task_id
          AND public.has_project_permission(
              t.project_id,
              auth.uid(),
              ARRAY['OWNER', 'ADMIN', 'MEMBER']::project_role[]
          )
          AND EXISTS (
              SELECT 1
              FROM public.project_files pf
              WHERE pf.id = task_attachments.file_id
                AND pf.project_id = t.project_id
                AND pf.deleted_at IS NULL
          )
    )
);

CREATE POLICY "Uploader/Admin can delete attachments"
ON public.task_attachments
FOR DELETE
USING (
    uploaded_by = auth.uid()
    OR public.is_admin(auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.id = task_attachments.task_id
          AND public.has_project_permission(
              t.project_id,
              auth.uid(),
              ARRAY['OWNER', 'ADMIN']::project_role[]
          )
    )
);

-- PROJECT FILES

CREATE POLICY "Members can view project files"
ON public.project_files
FOR SELECT
USING (
    deleted_at IS NULL
    AND (
        public.is_project_member(project_id, auth.uid())
        OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Members can upload files"
ON public.project_files
FOR INSERT
WITH CHECK (
    uploaded_by = auth.uid()
    AND (
        public.has_project_permission(
            project_id,
            auth.uid(),
            ARRAY['OWNER', 'ADMIN', 'MEMBER']::project_role[]
        )
        OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Uploader/Admin can update files"
ON public.project_files
FOR UPDATE
USING (
    uploaded_by = auth.uid()
    OR public.has_project_permission(
        project_id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    uploaded_by = auth.uid()
    OR public.has_project_permission(
        project_id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Uploader/Admin can delete files"
ON public.project_files
FOR DELETE
USING (
    uploaded_by = auth.uid()
    OR public.has_project_permission(
        project_id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
);

-- USER FILES

CREATE POLICY "Users can view own private files"
ON public.user_files
FOR SELECT
USING (
    deleted_at IS NULL
    AND user_id = auth.uid()
);

CREATE POLICY "Users can upload private files"
ON public.user_files
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND public.is_project_member(project_id, auth.uid())
);

CREATE POLICY "Users can update own private files"
ON public.user_files
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own private files"
ON public.user_files
FOR DELETE
USING (user_id = auth.uid());

-- PROJECT NOTES

CREATE POLICY "Members can view project notes"
ON public.project_notes
FOR SELECT
USING (
    deleted_at IS NULL
    AND (
        public.is_project_member(project_id, auth.uid())
        OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Members can create notes"
ON public.project_notes
FOR INSERT
WITH CHECK (
    author_id = auth.uid()
    AND (
        public.has_project_permission(
            project_id,
            auth.uid(),
            ARRAY['OWNER', 'ADMIN', 'MEMBER']::project_role[]
        )
        OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Author/Admin can update notes"
ON public.project_notes
FOR UPDATE
USING (
    author_id = auth.uid()
    OR public.has_project_permission(
        project_id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    author_id = auth.uid()
    OR public.has_project_permission(
        project_id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Author/Admin can delete notes"
ON public.project_notes
FOR DELETE
USING (
    author_id = auth.uid()
    OR public.has_project_permission(
        project_id,
        auth.uid(),
        ARRAY['OWNER', 'ADMIN']::project_role[]
    )
    OR public.is_admin(auth.uid())
);

-- USER NOTES

CREATE POLICY "Users can view own private notes"
ON public.user_notes
FOR SELECT
USING (
    deleted_at IS NULL
    AND user_id = auth.uid()
);

CREATE POLICY "Users can create private notes"
ON public.user_notes
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND public.is_project_member(project_id, auth.uid())
);

CREATE POLICY "Users can update own private notes"
ON public.user_notes
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own private notes"
ON public.user_notes
FOR DELETE
USING (user_id = auth.uid());

-- NOTIFICATIONS

CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
);

-- ACTIVITY LOGS

CREATE POLICY "Members can view project activity"
ON public.activity_logs
FOR SELECT
USING (
    project_id IS NULL
    OR public.is_project_member(project_id, auth.uid())
    OR public.is_admin(auth.uid())
);

CREATE POLICY "System can insert activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_admin(auth.uid())
);

-- ============================================================================
-- 10. VIEWS
-- ============================================================================

DROP VIEW IF EXISTS public.active_projects CASCADE;
CREATE VIEW public.active_projects WITH (security_invoker = true) AS
SELECT *
FROM public.projects
WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_tasks CASCADE;
CREATE VIEW public.active_tasks WITH (security_invoker = true) AS
SELECT *
FROM public.tasks
WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_task_comments CASCADE;
CREATE VIEW public.active_task_comments WITH (security_invoker = true) AS
SELECT *
FROM public.task_comments
WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_project_files CASCADE;
CREATE VIEW public.active_project_files WITH (security_invoker = true) AS
SELECT *
FROM public.project_files
WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_user_files CASCADE;
CREATE VIEW public.active_user_files WITH (security_invoker = true) AS
SELECT *
FROM public.user_files
WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_project_notes CASCADE;
CREATE VIEW public.active_project_notes WITH (security_invoker = true) AS
SELECT *
FROM public.project_notes
WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.active_user_notes CASCADE;
CREATE VIEW public.active_user_notes WITH (security_invoker = true) AS
SELECT *
FROM public.user_notes
WHERE deleted_at IS NULL;

DROP VIEW IF EXISTS public.unread_notifications CASCADE;
CREATE VIEW public.unread_notifications WITH (security_invoker = true) AS
SELECT *
FROM public.notifications
WHERE read_at IS NULL;

-- ============================================================================
-- 11. MATERIALIZED VIEWS
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS public.project_task_stats CASCADE;

CREATE MATERIALIZED VIEW public.project_task_stats AS
SELECT
    project_id,
    COUNT(*) AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'TODO') AS todo_count,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_count,
    COUNT(*) FILTER (WHERE status = 'REVIEW') AS review_count,
    COUNT(*) FILTER (WHERE status = 'BLOCKED') AS blocked_count,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_count,
    COUNT(*) FILTER (WHERE priority = 'URGENT') AS urgent_count,
    COUNT(*) FILTER (WHERE priority = 'HIGH') AS high_count,
    AVG(progress)::numeric(5,2) AS avg_progress,
    COUNT(*) FILTER (
        WHERE due_date < CURRENT_DATE
          AND status <> 'COMPLETED'
    ) AS overdue_count
FROM public.tasks
WHERE deleted_at IS NULL
GROUP BY project_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_task_stats_project
ON public.project_task_stats(project_id);

DROP MATERIALIZED VIEW IF EXISTS public.user_workload CASCADE;

CREATE MATERIALIZED VIEW public.user_workload AS
SELECT
    assignee_id AS user_id,
    COUNT(*) AS assigned_count,
    COUNT(*) FILTER (WHERE status = 'TODO') AS todo_count,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress_count,
    COUNT(*) FILTER (WHERE status = 'REVIEW') AS review_count,
    COUNT(*) FILTER (WHERE status = 'BLOCKED') AS blocked_count,
    COUNT(*) FILTER (
        WHERE due_date < CURRENT_DATE
          AND status <> 'COMPLETED'
    ) AS overdue_count,
    COUNT(*) FILTER (WHERE priority = 'URGENT') AS urgent_count
FROM public.tasks
WHERE deleted_at IS NULL
  AND assignee_id IS NOT NULL
GROUP BY assignee_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_workload_user
ON public.user_workload(user_id);

-- ============================================================================
-- 12. REALTIME
-- ============================================================================

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ============================================================================
-- 13. GRANTS
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

GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_project_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_permission(uuid, uuid, project_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_member_count(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_materialized_views() TO service_role;

-- ============================================================================
-- 14. STORAGE
-- ============================================================================
-- Create these buckets from Supabase Dashboard > Storage or Storage API:
--
-- project-files  (private)
-- Path: {project_id}/{file_id}/{filename}
--
-- user-files    (private)
-- Path: {user_id}/{project_id}/{file_id}/{filename}
--
-- avatars       (public)
-- Path: {user_id}/{filename}
--
-- Storage policies should be configured separately because storage.objects
-- is managed by Supabase Storage.

-- ============================================================================
-- 15. COMPLETION
-- ============================================================================

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- Tables: 12
-- Enums: 7
-- Views: 8
-- Materialized views: 2
-- RLS enabled on all application tables
-- ============================================================================


-- ============================================================
-- PROJECT MANAGEMENT PLATFORM
-- DELTA MIGRATION
-- Run AFTER the previous migration
--
-- Purpose:
-- 1. Add missing file tables if they don't exist
-- 2. Add Supabase Storage buckets
-- 3. Add Storage RLS policies
-- 4. Add missing indexes / constraints
-- 5. Do NOT drop existing data
-- 6. Do NOT recreate existing tables
-- ============================================================


BEGIN;


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2. PROJECT FILES
-- Create only if missing
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id uuid NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    uploaded_by uuid NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

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


-- ============================================================
-- 3. USER FILES
-- Create only if missing
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    project_id uuid NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

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


-- ============================================================
-- 4. PROJECT FILE INDEXES
-- Create only if missing
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_project_files_project
ON public.project_files(project_id);

CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by
ON public.project_files(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_project_files_mime_type
ON public.project_files(mime_type);

CREATE INDEX IF NOT EXISTS idx_project_files_deleted_at
ON public.project_files(deleted_at)
WHERE deleted_at IS NULL;


-- ============================================================
-- 5. USER FILE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_files_user
ON public.user_files(user_id);

CREATE INDEX IF NOT EXISTS idx_user_files_project
ON public.user_files(project_id);

CREATE INDEX IF NOT EXISTS idx_user_files_deleted_at
ON public.user_files(deleted_at)
WHERE deleted_at IS NULL;


-- ============================================================
-- 6. TASK ATTACHMENTS
-- Create only if missing
--
-- Important:
-- project_files must exist before this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id uuid NOT NULL
        REFERENCES public.tasks(id)
        ON DELETE CASCADE,

    file_id uuid NOT NULL
        REFERENCES public.project_files(id)
        ON DELETE CASCADE,

    uploaded_by uuid NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_task_attachments_unique
        UNIQUE (task_id, file_id)
);


CREATE INDEX IF NOT EXISTS idx_task_attachments_task
ON public.task_attachments(task_id);

CREATE INDEX IF NOT EXISTS idx_task_attachments_file
ON public.task_attachments(file_id);


-- ============================================================
-- 7. HELPER FUNCTIONS FOR STORAGE RLS
-- ============================================================

-- Check if current authenticated user is global ADMIN
CREATE OR REPLACE FUNCTION public.storage_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'ADMIN'
    );
$$;


-- Check project membership
CREATE OR REPLACE FUNCTION public.storage_is_project_member(
    p_project_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.storage_is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.project_members pm
            WHERE pm.project_id = p_project_id
              AND pm.user_id = auth.uid()
        );
$$;


-- Check whether current user is project owner/admin
CREATE OR REPLACE FUNCTION public.storage_is_project_admin(
    p_project_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.storage_is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.project_members pm
            WHERE pm.project_id = p_project_id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('OWNER', 'ADMIN')
        );
$$;


-- ============================================================
-- 8. SUPABASE STORAGE BUCKETS
-- ============================================================

-- Shared project files
INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES (
    'project-files',
    'project-files',
    false
)
ON CONFLICT (id)
DO NOTHING;


-- Private user files
INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES (
    'user-files',
    'user-files',
    false
)
ON CONFLICT (id)
DO NOTHING;


-- User avatars
INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES (
    'avatars',
    'avatars',
    true
)
ON CONFLICT (id)
DO NOTHING;


-- ============================================================
-- 9. STORAGE RLS
-- ============================================================

-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 10. PROJECT FILES - READ
--
-- Path:
-- project_id/file_id/filename
-- ============================================================

DROP POLICY IF EXISTS "project_files_select"
ON storage.objects;

CREATE POLICY "project_files_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'project-files'
    AND public.storage_is_project_member(
        split_part(name, '/', 1)::uuid
    )
);


-- ============================================================
-- 11. PROJECT FILES - INSERT
-- ============================================================

DROP POLICY IF EXISTS "project_files_insert"
ON storage.objects;

CREATE POLICY "project_files_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'project-files'
    AND public.storage_is_project_member(
        split_part(name, '/', 1)::uuid
    )
);


-- ============================================================
-- 12. PROJECT FILES - UPDATE
-- ============================================================

DROP POLICY IF EXISTS "project_files_update"
ON storage.objects;

CREATE POLICY "project_files_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'project-files'
    AND (
        owner_id::uuid = auth.uid()
        OR public.storage_is_project_admin(
            split_part(name, '/', 1)::uuid
        )
    )
)
WITH CHECK (
    bucket_id = 'project-files'
    AND public.storage_is_project_member(
        split_part(name, '/', 1)::uuid
    )
);


-- ============================================================
-- 13. PROJECT FILES - DELETE
-- ============================================================

DROP POLICY IF EXISTS "project_files_delete"
ON storage.objects;

CREATE POLICY "project_files_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'project-files'
    AND (
        owner_id::uuid = auth.uid()
        OR public.storage_is_project_admin(
            split_part(name, '/', 1)::uuid
        )
    )
);


-- ============================================================
-- 14. USER FILES - READ
--
-- Path:
-- user_id/project_id/file_id/filename
-- ============================================================

DROP POLICY IF EXISTS "user_files_select"
ON storage.objects;

CREATE POLICY "user_files_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'user-files'
    AND (
        (split_part(name, '/', 1)::uuid = auth.uid()
          AND public.storage_is_project_member(split_part(name, '/', 2)::uuid))
        OR public.storage_is_admin()
    )
);


-- ============================================================
-- 15. USER FILES - INSERT
-- ============================================================

DROP POLICY IF EXISTS "user_files_insert"
ON storage.objects;

CREATE POLICY "user_files_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'user-files'
    AND split_part(name, '/', 1)::uuid = auth.uid()
    AND public.storage_is_project_member(split_part(name, '/', 2)::uuid)
);


-- ============================================================
-- 16. USER FILES - UPDATE
-- ============================================================

DROP POLICY IF EXISTS "user_files_update"
ON storage.objects;

CREATE POLICY "user_files_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'user-files'
    AND (
        split_part(name, '/', 1)::uuid = auth.uid()
        OR public.storage_is_admin()
    )
    AND public.storage_is_project_member(split_part(name, '/', 2)::uuid)
)
WITH CHECK (
    bucket_id = 'user-files'
    AND (
        split_part(name, '/', 1)::uuid = auth.uid()
        OR public.storage_is_admin()
    )
    AND public.storage_is_project_member(split_part(name, '/', 2)::uuid)
);


-- ============================================================
-- 17. USER FILES - DELETE
-- ============================================================

DROP POLICY IF EXISTS "user_files_delete"
ON storage.objects;

CREATE POLICY "user_files_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'user-files'
    AND (
        split_part(name, '/', 1)::uuid = auth.uid()
        OR public.storage_is_admin()
    )
    AND public.storage_is_project_member(split_part(name, '/', 2)::uuid)
);


-- ============================================================
-- 18. AVATARS - READ
-- Public bucket
-- ============================================================

DROP POLICY IF EXISTS "avatars_select"
ON storage.objects;

CREATE POLICY "avatars_select"
ON storage.objects
FOR SELECT
TO public
USING (
    bucket_id = 'avatars'
);


-- ============================================================
-- 19. AVATARS - INSERT
--
-- Path:
-- user_id/filename
-- ============================================================

DROP POLICY IF EXISTS "avatars_insert"
ON storage.objects;

CREATE POLICY "avatars_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1)::uuid = auth.uid()
);


-- ============================================================
-- 20. AVATARS - UPDATE
-- ============================================================

DROP POLICY IF EXISTS "avatars_update"
ON storage.objects;

CREATE POLICY "avatars_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1)::uuid = auth.uid()
)
WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1)::uuid = auth.uid()
);


-- ============================================================
-- 21. AVATARS - DELETE
-- ============================================================

DROP POLICY IF EXISTS "avatars_delete"
ON storage.objects;

CREATE POLICY "avatars_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1)::uuid = auth.uid()
);


-- ============================================================
-- 22. STORAGE BUCKET CONFIGURATION
-- ============================================================

UPDATE storage.buckets
SET
    public = false
WHERE id IN (
    'project-files',
    'user-files'
);


UPDATE storage.buckets
SET
    public = true
WHERE id = 'avatars';


-- ============================================================
-- 23. OPTIONAL FILE SIZE / MIME CONFIGURATION
--
-- These values can be changed later from Supabase Dashboard.
-- Keep them NULL here to avoid breaking existing projects.
-- ============================================================


-- ============================================================
-- 24. UPDATED_AT TRIGGER FUNCTION
--
-- Create only if the previous migration doesn't already have it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


-- ============================================================
-- 25. UPDATED_AT TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS trg_project_files_updated_at
ON public.project_files;

CREATE TRIGGER trg_project_files_updated_at
BEFORE UPDATE ON public.project_files
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_user_files_updated_at
ON public.user_files;

CREATE TRIGGER trg_user_files_updated_at
BEFORE UPDATE ON public.user_files
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 26. ENABLE RLS ON FILE TABLES
-- ============================================================

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 27. PROJECT FILES DATABASE RLS
-- ============================================================

DROP POLICY IF EXISTS "project_files_select"
ON public.project_files;

CREATE POLICY "project_files_select"
ON public.project_files
FOR SELECT
TO authenticated
USING (
    public.storage_is_project_member(project_id)
);


DROP POLICY IF EXISTS "project_files_insert"
ON public.project_files;

CREATE POLICY "project_files_insert"
ON public.project_files
FOR INSERT
TO authenticated
WITH CHECK (
    public.storage_is_project_member(project_id)
    AND uploaded_by = auth.uid()
);


DROP POLICY IF EXISTS "project_files_update"
ON public.project_files;

CREATE POLICY "project_files_update"
ON public.project_files
FOR UPDATE
TO authenticated
USING (
    uploaded_by = auth.uid()
    OR public.storage_is_project_admin(project_id)
)
WITH CHECK (
    public.storage_is_project_member(project_id)
);


DROP POLICY IF EXISTS "project_files_delete"
ON public.project_files;

CREATE POLICY "project_files_delete"
ON public.project_files
FOR DELETE
TO authenticated
USING (
    uploaded_by = auth.uid()
    OR public.storage_is_project_admin(project_id)
);


-- ============================================================
-- 28. USER FILES DATABASE RLS
-- ============================================================

DROP POLICY IF EXISTS "user_files_select"
ON public.user_files;

CREATE POLICY "user_files_select"
ON public.user_files
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.storage_is_admin()
);


DROP POLICY IF EXISTS "user_files_insert"
ON public.user_files;

CREATE POLICY "user_files_insert"
ON public.user_files
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND public.storage_is_project_member(project_id)
);


DROP POLICY IF EXISTS "user_files_update"
ON public.user_files;

CREATE POLICY "user_files_update"
ON public.user_files
FOR UPDATE
TO authenticated
USING (
    (user_id = auth.uid() AND public.storage_is_project_member(project_id))
    OR public.storage_is_admin()
)
WITH CHECK (
    (user_id = auth.uid() OR public.storage_is_admin())
    AND public.storage_is_project_member(project_id)
);


DROP POLICY IF EXISTS "user_files_delete"
ON public.user_files;

CREATE POLICY "user_files_delete"
ON public.user_files
FOR DELETE
TO authenticated
USING (
    (user_id = auth.uid() AND public.storage_is_project_member(project_id))
    OR public.storage_is_admin()
);


-- ============================================================
-- 29. TASK ATTACHMENTS RLS
-- ============================================================

DROP POLICY IF EXISTS "task_attachments_select"
ON public.task_attachments;

CREATE POLICY "task_attachments_select"
ON public.task_attachments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.id = task_attachments.task_id
          AND public.storage_is_project_member(t.project_id)
    )
);


DROP POLICY IF EXISTS "task_attachments_insert"
ON public.task_attachments;

CREATE POLICY "task_attachments_insert"
ON public.task_attachments
FOR INSERT
TO authenticated
WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.id = task_attachments.task_id
          AND public.storage_is_project_member(t.project_id)
          AND EXISTS (
              SELECT 1
              FROM public.project_files pf
              WHERE pf.id = task_attachments.file_id
                AND pf.project_id = t.project_id
                AND pf.deleted_at IS NULL
          )
    )
);


DROP POLICY IF EXISTS "task_attachments_delete"
ON public.task_attachments;

CREATE POLICY "task_attachments_delete"
ON public.task_attachments
FOR DELETE
TO authenticated
USING (
    uploaded_by = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.id = task_attachments.task_id
          AND public.storage_is_project_admin(t.project_id)
    )
);


-- ============================================================
-- 30. GRANTS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.project_files
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.user_files
TO authenticated;

GRANT SELECT, INSERT, DELETE
ON public.task_attachments
TO authenticated;


-- ============================================================
-- 31. STORAGE OBJECT GRANTS
-- Supabase normally handles these, but keep explicit access.
-- ============================================================

-- GRANT SELECT, INSERT, UPDATE, DELETE
-- ON storage.objects
-- TO authenticated;


-- ============================================================
-- 32. VERIFICATION
-- ============================================================

DO $$
DECLARE
    missing_count integer;
BEGIN

    SELECT count(*)
    INTO missing_count
    FROM (
        SELECT 'project-files' AS bucket
        UNION ALL
        SELECT 'user-files'
        UNION ALL
        SELECT 'avatars'
    ) expected
    WHERE NOT EXISTS (
        SELECT 1
        FROM storage.buckets b
        WHERE b.id = expected.bucket
    );

    IF missing_count > 0 THEN
        RAISE EXCEPTION
            'Storage setup incomplete: % bucket(s) missing',
            missing_count;
    END IF;

END $$;


COMMIT;


-- ============================================================
-- END OF DELTA MIGRATION
-- ============================================================
