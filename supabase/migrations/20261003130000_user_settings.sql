-- User Settings Migration
-- Adds user-level settings table for profile, appearance, notifications, and admin settings

-- ============================================================================
-- 1. USER SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    
    -- Profile settings
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(50),
    department VARCHAR(100),
    job_title VARCHAR(100),
    
    -- Appearance settings
    theme VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    locale VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'ar')),
    
    -- Notification preferences (JSONB for flexibility)
    notification_preferences JSONB NOT NULL DEFAULT '{
        "task_assignments": true,
        "comments": true,
        "deadlines": true,
        "project_updates": true,
        "files": true
    }',
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- ============================================================================
-- 2. SYSTEM SETTINGS TABLE (Admin only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'project_defaults', 'file_limits', 'task_statuses', 'priorities', 'company'
    is_public BOOLEAN NOT NULL DEFAULT FALSE, -- Whether non-admins can read this setting
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for category lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- ============================================================================
-- 3. DEFAULT SYSTEM SETTINGS
-- ============================================================================

INSERT INTO public.system_settings (key, value, description, category, is_public) VALUES
-- Project defaults
('project_default_status', '"ACTIVE"', 'Default status for new projects', 'project_defaults', true),
('project_default_role', '"MEMBER"', 'Default role for new project members', 'project_defaults', true),
('project_key_format', '"^[A-Z]{2,10}$"', 'Regex pattern for project key validation', 'project_defaults', true),

-- File limits
('max_file_size_mb', '100', 'Maximum file upload size in MB', 'file_limits', true),
('allowed_file_types', '["image/*", "application/pdf", "text/*", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]', 'Allowed MIME types for file uploads', 'file_limits', true),

-- Task statuses
('task_statuses', '["TODO", "IN_PROGRESS", "REVIEW", "BLOCKED", "COMPLETED"]', 'Available task statuses', 'task_statuses', true),

-- Priorities
('task_priorities', '["LOW", "MEDIUM", "HIGH", "URGENT"]', 'Available task priorities', 'task_priorities', true),

-- Company settings
('company_name', '""', 'Company/organization name', 'company', true),
('company_logo_url', '""', 'Company logo URL', 'company', true),
('support_email', '""', 'Support contact email', 'company', true)

ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 4. RLS POLICIES FOR USER_SETTINGS
-- ============================================================================

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view own settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
ON public.user_settings
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert own settings
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update own settings
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
ON public.user_settings
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all user settings
DROP POLICY IF EXISTS "Admins can view all user settings" ON public.user_settings;
CREATE POLICY "Admins can view all user settings"
ON public.user_settings
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can update all user settings
DROP POLICY IF EXISTS "Admins can update all user settings" ON public.user_settings;
CREATE POLICY "Admins can update all user settings"
ON public.user_settings
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- 5. RLS POLICIES FOR SYSTEM_SETTINGS
-- ============================================================================

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can view all system settings
DROP POLICY IF EXISTS "Admins can view all system settings" ON public.system_settings;
CREATE POLICY "Admins can view all system settings"
ON public.system_settings
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Admins can insert system settings
DROP POLICY IF EXISTS "Admins can insert system settings" ON public.system_settings;
CREATE POLICY "Admins can insert system settings"
ON public.system_settings
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update system settings
DROP POLICY IF EXISTS "Admins can update system settings" ON public.system_settings;
CREATE POLICY "Admins can update system settings"
ON public.system_settings
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Admins can delete system settings
DROP POLICY IF EXISTS "Admins can delete system settings" ON public.system_settings;
CREATE POLICY "Admins can delete system settings"
ON public.system_settings
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Authenticated users can view public system settings
DROP POLICY IF EXISTS "Authenticated users can view public system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can view public system settings"
ON public.system_settings
FOR SELECT
USING (is_public = true AND auth.role() = 'authenticated');

-- ============================================================================
-- 6. FUNCTION: Get user settings (with defaults)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_settings(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings JSONB;
BEGIN
    SELECT to_jsonb(us) - 'user_id' - 'created_at' - 'updated_at' - 'id'
    INTO v_settings
    FROM public.user_settings us
    WHERE us.user_id = p_user_id;

    IF v_settings IS NULL THEN
        -- Return defaults if no settings exist
        RETURN jsonb_build_object(
            'full_name', '',
            'avatar_url', '',
            'phone', '',
            'department', '',
            'job_title', '',
            'theme', 'system',
            'locale', 'en',
            'notification_preferences', jsonb_build_object(
                'task_assignments', true,
                'comments', true,
                'deadlines', true,
                'project_updates', true,
                'files', true
            )
        );
    END IF;

    RETURN v_settings;
END;
$$;

-- ============================================================================
-- 7. FUNCTION: Upsert user settings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_user_settings(
    p_user_id UUID,
    p_full_name VARCHAR(255) DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_phone VARCHAR(50) DEFAULT NULL,
    p_department VARCHAR(100) DEFAULT NULL,
    p_job_title VARCHAR(100) DEFAULT NULL,
    p_theme VARCHAR(20) DEFAULT NULL,
    p_locale VARCHAR(10) DEFAULT NULL,
    p_notification_preferences JSONB DEFAULT NULL
)
RETURNS public.user_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings public.user_settings;
BEGIN
    -- Check if settings exist
    SELECT * INTO v_settings FROM public.user_settings WHERE user_id = p_user_id;

    IF v_settings IS NULL THEN
        -- Insert new settings
        INSERT INTO public.user_settings (
            user_id,
            full_name,
            avatar_url,
            phone,
            department,
            job_title,
            theme,
            locale,
            notification_preferences
        ) VALUES (
            p_user_id,
            COALESCE(p_full_name, ''),
            COALESCE(p_avatar_url, ''),
            COALESCE(p_phone, ''),
            COALESCE(p_department, ''),
            COALESCE(p_job_title, ''),
            COALESCE(p_theme, 'system'),
            COALESCE(p_locale, 'en'),
            COALESCE(p_notification_preferences, jsonb_build_object(
                'task_assignments', true,
                'comments', true,
                'deadlines', true,
                'project_updates', true,
                'files', true
            ))
        ) RETURNING * INTO v_settings;
    ELSE
        -- Update existing settings
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
        WHERE user_id = p_user_id
        RETURNING * INTO v_settings;
    END IF;

    RETURN v_settings;
END;
$$;

-- ============================================================================
-- 8. FUNCTION: Get system settings by category
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_system_settings(p_category VARCHAR(50) DEFAULT NULL)
RETURNS SETOF public.system_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_category IS NULL THEN
        RETURN QUERY SELECT * FROM public.system_settings ORDER BY category, key;
    ELSE
        RETURN QUERY SELECT * FROM public.system_settings WHERE category = p_category ORDER BY key;
    END IF;
END;
$$;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;

-- ============================================================================
-- 10. TRIGGER FOR UPDATED_AT
-- ============================================================================

-- User settings updated_at trigger
DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- System settings updated_at trigger
DROP TRIGGER IF EXISTS trigger_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trigger_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();