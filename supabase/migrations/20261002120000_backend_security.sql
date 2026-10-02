-- Security and Storage corrections for the existing schema.
-- This migration changes policies and functions only; it creates no tables.

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.role() = 'service_role' OR (
        p_user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'ADMIN')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.role() = 'service_role' OR (
        p_user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = p_user_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_project_role(p_project_id uuid, p_user_id uuid)
RETURNS project_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE WHEN auth.role() = 'service_role' OR p_user_id = auth.uid() THEN
        (SELECT role FROM public.project_members WHERE project_id = p_project_id AND user_id = p_user_id LIMIT 1)
        ELSE NULL::project_role END;
$$;

CREATE OR REPLACE FUNCTION public.has_project_permission(
    p_project_id uuid, p_user_id uuid, p_required_roles project_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.role() = 'service_role' OR (
        p_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = p_project_id AND user_id = p_user_id AND role = ANY(p_required_roles)
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_project_member_count(p_project_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN auth.role() = 'service_role' OR public.is_admin(auth.uid())
             OR public.is_project_member(p_project_id, auth.uid())
        THEN (SELECT COUNT(*)::integer FROM public.project_members WHERE project_id = p_project_id)
        ELSE 0
    END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
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

DROP TRIGGER IF EXISTS trigger_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trigger_prevent_profile_role_escalation
    BEFORE UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_role_escalation();

CREATE OR REPLACE FUNCTION public.storage_project_id_from_path(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN split_part(p_name, '/', 1) = 'projects'
             AND split_part(p_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 2)::uuid
        WHEN split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 1)::uuid
        ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.storage_user_id_from_path(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN split_part(p_name, '/', 1) = 'users'
             AND split_part(p_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 2)::uuid
        WHEN split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 1)::uuid
        ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.storage_user_file_project_id_from_path(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN split_part(p_name, '/', 1) = 'users'
             AND split_part(p_name, '/', 4) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 4)::uuid
        WHEN split_part(p_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p_name, '/', 2)::uuid
        ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.storage_can_upload_project_file(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.storage_is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.project_members pm
            WHERE pm.project_id = p_project_id
              AND pm.user_id = auth.uid()
              AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
        );
$$;

-- Signed upload URLs must authorize the same UUID-first paths produced by the app.
-- The helpers also recognize the older `projects/...` and `users/.../projects/...` paths.
DROP POLICY IF EXISTS "project_files_select" ON storage.objects;
CREATE POLICY "project_files_select" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'project-files'
    AND public.storage_is_project_member(public.storage_project_id_from_path(name))
);

DROP POLICY IF EXISTS "project_files_insert" ON storage.objects;
CREATE POLICY "project_files_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'project-files'
    AND public.storage_can_upload_project_file(public.storage_project_id_from_path(name))
);

DROP POLICY IF EXISTS "project_files_update" ON storage.objects;
CREATE POLICY "project_files_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'project-files'
    AND (
        owner_id::uuid = auth.uid()
        OR public.storage_is_project_admin(public.storage_project_id_from_path(name))
    )
)
WITH CHECK (
    bucket_id = 'project-files'
    AND public.storage_is_project_member(public.storage_project_id_from_path(name))
);

DROP POLICY IF EXISTS "project_files_delete" ON storage.objects;
CREATE POLICY "project_files_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'project-files'
    AND (
        owner_id::uuid = auth.uid()
        OR public.storage_is_project_admin(public.storage_project_id_from_path(name))
    )
);

DROP POLICY IF EXISTS "user_files_select" ON storage.objects;
CREATE POLICY "user_files_select" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'user-files'
    AND (
        (
            public.storage_user_id_from_path(name) = auth.uid()
            AND public.storage_is_project_member(public.storage_user_file_project_id_from_path(name))
        )
        OR public.storage_is_admin()
    )
);

DROP POLICY IF EXISTS "user_files_insert" ON storage.objects;
CREATE POLICY "user_files_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'user-files'
    AND public.storage_user_id_from_path(name) = auth.uid()
    AND public.storage_is_project_member(public.storage_user_file_project_id_from_path(name))
);

DROP POLICY IF EXISTS "user_files_update" ON storage.objects;
CREATE POLICY "user_files_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'user-files'
    AND (
        (public.storage_user_id_from_path(name) = auth.uid()
         AND public.storage_is_project_member(public.storage_user_file_project_id_from_path(name)))
        OR public.storage_is_admin()
    )
)
WITH CHECK (
    bucket_id = 'user-files'
    AND (
        (public.storage_user_id_from_path(name) = auth.uid()
         AND public.storage_is_project_member(public.storage_user_file_project_id_from_path(name)))
        OR public.storage_is_admin()
    )
);

DROP POLICY IF EXISTS "user_files_delete" ON storage.objects;
CREATE POLICY "user_files_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'user-files'
    AND (
        (public.storage_user_id_from_path(name) = auth.uid()
         AND public.storage_is_project_member(public.storage_user_file_project_id_from_path(name)))
        OR public.storage_is_admin()
    )
);

DROP POLICY IF EXISTS "user_files_insert" ON public.user_files;
CREATE POLICY "user_files_insert" ON public.user_files
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND public.is_project_member(project_id, auth.uid())
);

DROP POLICY IF EXISTS "user_files_update" ON public.user_files;
CREATE POLICY "user_files_update" ON public.user_files
FOR UPDATE TO authenticated
USING (
    (user_id = auth.uid() AND public.is_project_member(project_id, auth.uid()))
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    (user_id = auth.uid() AND public.is_project_member(project_id, auth.uid()))
    OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "task_attachments_insert" ON public.task_attachments;
CREATE POLICY "task_attachments_insert" ON public.task_attachments
FOR INSERT TO authenticated
WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.tasks t
        JOIN public.project_files pf ON pf.id = task_attachments.file_id
        WHERE t.id = task_attachments.task_id
          AND pf.project_id = t.project_id
          AND pf.deleted_at IS NULL
          AND public.has_project_permission(
              t.project_id,
              auth.uid(),
              ARRAY['OWNER', 'ADMIN', 'MEMBER']::project_role[]
          )
    )
);

ALTER VIEW public.active_projects SET (security_invoker = true);
ALTER VIEW public.active_tasks SET (security_invoker = true);
ALTER VIEW public.active_task_comments SET (security_invoker = true);
ALTER VIEW public.active_project_files SET (security_invoker = true);
ALTER VIEW public.active_user_files SET (security_invoker = true);
ALTER VIEW public.active_project_notes SET (security_invoker = true);
ALTER VIEW public.active_user_notes SET (security_invoker = true);
ALTER VIEW public.unread_notifications SET (security_invoker = true);

REVOKE ALL ON public.project_task_stats, public.user_workload FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_materialized_views() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_materialized_views() TO service_role;
