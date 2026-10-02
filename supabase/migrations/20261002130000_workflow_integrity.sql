-- Keep core workflow invariants and notifications in the database so every
-- authenticated write path (UI, server action, or direct API) behaves alike.

DO $$ BEGIN
  ALTER TYPE public.activity_action ADD VALUE IF NOT EXISTS 'FILE_UPDATED';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_task_assignee_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    RAISE EXCEPTION 'Task must belong to a project the current user belongs to'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.assignee_id IS NOT NULL THEN
    SELECT role INTO assignee_project_role FROM public.project_members
      WHERE project_id = NEW.project_id AND user_id = NEW.assignee_id;
    IF assignee_project_role IS NULL OR assignee_project_role = 'VIEWER' THEN
      RAISE EXCEPTION 'Task assignee must be an active project member'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
     AND actor_project_role NOT IN ('OWNER', 'ADMIN') THEN
    RAISE EXCEPTION 'Only project owners and admins may assign tasks'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_task_assignee_membership ON public.tasks;
CREATE TRIGGER enforce_task_assignee_membership
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_task_assignee_membership();

CREATE OR REPLACE FUNCTION public.guard_project_member_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role public.project_role;
  project_owner uuid;
BEGIN
  IF auth.role() = 'service_role' OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

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
    -- The project owner membership is created by the project trigger; an
    -- existing ADMIN can invite only ordinary members or viewers.
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

DROP TRIGGER IF EXISTS guard_project_member_role_change ON public.project_members;
CREATE TRIGGER guard_project_member_role_change
  BEFORE INSERT OR UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_project_member_role_change();

-- Teammates need each other's identity in task assignment and member lists.
DROP POLICY IF EXISTS "Members can view profiles in shared projects" ON public.profiles;
CREATE POLICY "Members can view profiles in shared projects" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.project_members target_member
      JOIN public.project_members viewer_member
        ON viewer_member.project_id = target_member.project_id
      WHERE target_member.user_id = profiles.id
        AND viewer_member.user_id = auth.uid()
    )
  );

-- The server action already allows a non-owner to leave a project. Add the
-- matching database policy so that the action is not rejected by RLS.
DROP POLICY IF EXISTS "Users can leave project" ON public.project_members;
CREATE POLICY "Users can leave project" ON public.project_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND role <> 'OWNER');

-- The app archives projects and tasks by setting deleted_at. Some installed
-- policies restrict the new row to deleted_at IS NULL, which rejects that
-- intended update. Keep active-row visibility in SELECT, while allowing the
-- authorized owner/admin/creator/assignee to write the archive marker.
DROP POLICY IF EXISTS "Owner/Admin can update project" ON public.projects;
CREATE POLICY "Owner/Admin can update project" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_project_permission(id, auth.uid(), ARRAY['OWNER', 'ADMIN']::project_role[])
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.has_project_permission(id, auth.uid(), ARRAY['OWNER', 'ADMIN']::project_role[])
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Owner/Admin/Assignee can update tasks" ON public.tasks;
CREATE POLICY "Owner/Admin/Assignee can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER', 'ADMIN']::project_role[])
      OR assignee_id = auth.uid()
      OR created_by = auth.uid()
      OR public.is_admin(auth.uid())
    )
  )
  WITH CHECK (
    (
      public.has_project_permission(project_id, auth.uid(), ARRAY['OWNER', 'ADMIN']::project_role[])
      OR assignee_id = auth.uid()
      OR created_by = auth.uid()
      OR public.is_admin(auth.uid())
    )
    AND (public.is_project_member(project_id, auth.uid()) OR public.is_admin(auth.uid()))
  );

CREATE OR REPLACE FUNCTION public.notify_project_member_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_row public.projects%ROWTYPE;
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

DROP TRIGGER IF EXISTS notify_project_member_added ON public.project_members;
CREATE TRIGGER notify_project_member_added
  AFTER INSERT ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_project_member_added();

CREATE OR REPLACE FUNCTION public.notify_project_member_role_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_row public.projects%ROWTYPE;
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

DROP TRIGGER IF EXISTS notify_project_member_role_changed ON public.project_members;
CREATE TRIGGER notify_project_member_role_changed
  AFTER UPDATE OF role ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_project_member_role_changed();

CREATE OR REPLACE FUNCTION public.notify_task_workflow_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      notification_kind := 'TASK_ASSIGNED';
      notification_title := 'Task Assigned: ' || NEW.title;
      notification_message := 'You were assigned to "' || NEW.title || '" in ' || project_row.name;
      INSERT INTO public.notifications (user_id, project_id, type, title, message, action_url, action_label, metadata)
      VALUES (NEW.assignee_id, NEW.project_id, notification_kind, notification_title, notification_message,
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

DROP TRIGGER IF EXISTS notify_task_workflow_change ON public.tasks;
CREATE TRIGGER notify_task_workflow_change
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_workflow_change();

CREATE OR REPLACE FUNCTION public.notify_task_comment_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_row public.tasks%ROWTYPE;
  project_row public.projects%ROWTYPE;
  recipient_id uuid;
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
      '/projects/' || task_row.project_id::text || '/tasks/' || task_row.id::text,
      'View Task', jsonb_build_object('task_id', task_row.id, 'comment_id', NEW.id, 'comment_author', NEW.user_id));
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_task_comment_added ON public.task_comments;
CREATE TRIGGER notify_task_comment_added
  AFTER INSERT ON public.task_comments
  FOR EACH ROW WHEN (NEW.is_system = false)
  EXECUTE FUNCTION public.notify_task_comment_added();

