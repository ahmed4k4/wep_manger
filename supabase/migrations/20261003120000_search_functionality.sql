-- Search Functionality Migration
-- Adds: user_searches table for recent searches, search-related functions

-- ============================================================================
-- 1. USER_SEARCHES TABLE
-- ============================================================================

CREATE TABLE public.user_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast retrieval of recent searches
CREATE INDEX idx_user_searches_user_id_created_at 
ON public.user_searches(user_id, created_at DESC);

-- RLS Policies for user_searches
ALTER TABLE public.user_searches ENABLE ROW LEVEL SECURITY;

-- Users can only see their own searches
CREATE POLICY "Users can view own searches"
ON public.user_searches
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own searches
CREATE POLICY "Users can insert own searches"
ON public.user_searches
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can delete their own searches
CREATE POLICY "Users can delete own searches"
ON public.user_searches
FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- 2. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, DELETE ON public.user_searches TO authenticated;

-- ============================================================================
-- 3. OPTIONAL: Cleanup old searches (keep last 50 per user)
-- This can be run as a cron job or via pg_cron
-- ============================================================================

-- CREATE OR REPLACE FUNCTION public.cleanup_old_searches()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM public.user_searches
--     WHERE id IN (
--         SELECT id FROM (
--             SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
--             FROM public.user_searches
--         ) t
--         WHERE rn > 50
--     );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
