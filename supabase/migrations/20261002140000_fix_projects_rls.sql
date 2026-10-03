-- Fix RLS Policies for Projects System
-- This migration addresses:
-- 1. Infinite recursion in project_members policy when used by is_project_member()
-- 2. "Failed to load projects" error due to restrictive project_members policy
-- 3. Profiles visibility for project collaboration

-- ============================================================================
-- 1. FIX PROJECTS SELECT POLICY - Use direct check instead of helper function
-- ============================================================================

DROP POLICY IF EXISTS "Members can view active projects" ON public.projects;
CREATE POLICY "Members can view active projects"
ON public.projects
FOR SELECT
USING (
    deleted_at IS NULL
    AND (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = projects.id
            AND pm.user_id = auth.uid()
        )
        OR public.is_admin(auth.uid())
    )
);

-- ============================================================================
-- 2. FIX PROJECT_MEMBERS SELECT POLICY - Allow all members to see each other
-- ============================================================================

DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
CREATE POLICY "Members can view project members"
ON public.project_members
FOR SELECT
USING (
    -- Direct check without helper function to avoid RLS recursion
    -- All project members can see other members (needed for collaboration features)
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.project_members pm2
        WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
);

-- ============================================================================
-- 3. FIX PROFILES SELECT POLICY - Ensure it works with updated project_members
-- ============================================================================

DROP POLICY IF EXISTS "Members can view profiles in shared projects" ON public.profiles;
CREATE POLICY "Members can view profiles in shared projects"
ON public.profiles
FOR SELECT
TO authenticated
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

-- ============================================================================
-- 4. ADD HELPER FUNCTIONS FOR DIRECT CHECKS (bypass RLS with SECURITY DEFINER)
-- ============================================================================

-- Update is_project_member to use SECURITY DEFINER and bypass RLS properly
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
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
            WHERE project_id = p_project_id 
            AND user_id = p_user_id
        )
    );
$$;

-- Update is_admin to use SECURITY DEFINER and bypass RLS properly  
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

-- ============================================================================
-- 5. VERIFY PROJECT CREATION POLICY (should already be correct)
-- ============================================================================

-- The "Authenticated users can create projects" policy should already be correct:
-- WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid())
-- This ensures the creator is the owner

-- ============================================================================
-- 6. GRANT EXECUTE PERMISSIONS ON HELPER FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_project_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_project_permission(uuid, uuid, project_role[]) TO authenticated;