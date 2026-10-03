-- Task Management Enhancement Migration
-- Adds: Checklists, Tags, and enhanced task features

-- ============================================================================
-- 1. TAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1', -- Hex color
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_project_id ON public.tags(project_id);

-- RLS for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can view tags" ON public.tags;
CREATE POLICY "Project members can view tags"
ON public.tags
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = tags.project_id
        AND pm.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Project admins can manage tags" ON public.tags;
CREATE POLICY "Project admins can manage tags"
ON public.tags
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = tags.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('OWNER', 'ADMIN')
    )
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = tags.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('OWNER', 'ADMIN')
    )
    OR public.is_admin(auth.uid())
);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. TASK_TAGS JUNCTION TABLE (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_tags (
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON public.task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON public.task_tags(tag_id);

-- RLS for task_tags (follows task permissions)
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can view task tags" ON public.task_tags;
CREATE POLICY "Project members can view task tags"
ON public.task_tags
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.project_members pm ON pm.project_id = t.project_id
        WHERE t.id = task_tags.task_id
        AND pm.user_id = auth.uid()
        AND t.deleted_at IS NULL
    )
    OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Task editors can manage tags" ON public.task_tags;
CREATE POLICY "Task editors can manage tags"
ON public.task_tags
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.project_members pm ON pm.project_id = t.project_id
        WHERE t.id = task_tags.task_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
        AND t.deleted_at IS NULL
    )
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.project_members pm ON pm.project_id = t.project_id
        WHERE t.id = task_tags.task_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
        AND t.deleted_at IS NULL
    )
    OR public.is_admin(auth.uid())
);

-- ============================================================================
-- 3. TASK_CHECKLISTS TABLE (Subtasks/Checklist items)
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON public.task_checklists(task_id);

-- RLS for task_checklists (follows task permissions)
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can view checklists" ON public.task_checklists;
CREATE POLICY "Project members can view checklists"
ON public.task_checklists
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.project_members pm ON pm.project_id = t.project_id
        WHERE t.id = task_checklists.task_id
        AND pm.user_id = auth.uid()
        AND t.deleted_at IS NULL
    )
    OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Task editors can manage checklists" ON public.task_checklists;
CREATE POLICY "Task editors can manage checklists"
ON public.task_checklists
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.project_members pm ON pm.project_id = t.project_id
        WHERE t.id = task_checklists.task_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
        AND t.deleted_at IS NULL
    )
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.project_members pm ON pm.project_id = t.project_id
        WHERE t.id = task_checklists.task_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
        AND t.deleted_at IS NULL
    )
    OR public.is_admin(auth.uid())
);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_task_checklists_updated_at ON public.task_checklists;
CREATE TRIGGER update_task_checklists_updated_at
    BEFORE UPDATE ON public.task_checklists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. FUNCTION: Auto-calculate task progress from checklist
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_task_progress_from_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_count INTEGER;
    completed_count INTEGER;
    new_progress INTEGER;
BEGIN
    -- Only run on UPDATE of is_completed
    IF TG_OP = 'UPDATE' AND OLD.is_completed IS DISTINCT FROM NEW.is_completed THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed)
        INTO total_count, completed_count
        FROM public.task_checklists
        WHERE task_id = NEW.task_id;

        IF total_count > 0 THEN
            new_progress := ROUND((completed_count::numeric / total_count) * 100);
        ELSE
            new_progress := 0;
        END IF;

        UPDATE public.tasks
        SET progress = new_progress,
            updated_at = NOW(),
            completed_at = CASE WHEN new_progress = 100 THEN NOW() ELSE NULL END
        WHERE id = NEW.task_id;
    END IF;

    -- On INSERT
    IF TG_OP = 'INSERT' THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed)
        INTO total_count, completed_count
        FROM public.task_checklists
        WHERE task_id = NEW.task_id;

        IF total_count > 0 THEN
            new_progress := ROUND((completed_count::numeric / total_count) * 100);
        ELSE
            new_progress := 0;
        END IF;

        UPDATE public.tasks
        SET progress = new_progress,
            updated_at = NOW(),
            completed_at = CASE WHEN new_progress = 100 THEN NOW() ELSE NULL END
        WHERE id = NEW.task_id;
    END IF;

    -- On DELETE
    IF TG_OP = 'DELETE' THEN
        SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed)
        INTO total_count, completed_count
        FROM public.task_checklists
        WHERE task_id = OLD.task_id;

        IF total_count > 0 THEN
            new_progress := ROUND((completed_count::numeric / total_count) * 100);
        ELSE
            new_progress := 0;
        END IF;

        UPDATE public.tasks
        SET progress = new_progress,
            updated_at = NOW(),
            completed_at = CASE WHEN new_progress = 100 THEN NOW() ELSE NULL END
        WHERE id = OLD.task_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_task_progress ON public.task_checklists;
CREATE TRIGGER trigger_update_task_progress
    AFTER INSERT OR UPDATE OR DELETE ON public.task_checklists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_task_progress_from_checklist();

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_checklists TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;