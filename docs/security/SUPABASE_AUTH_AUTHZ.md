# Supabase Authentication & Authorization Architecture

## Overview

Production-ready security architecture for Project Management Platform using Supabase Auth, PostgreSQL RLS, and Storage RLS. Security-first design with defense in depth.

---

## 1. Supabase Auth Architecture

### Auth Configuration

```typescript
// supabase/config.ts
export const authConfig = {
  // Providers
  providers: ['email', 'google', 'github'],
  
  // Session
  session: {
    // JWT expiry: 1 hour (short for security)
    jwtExpiry: 3600,
    // Refresh token: 30 days
    refreshTokenReuseInterval: 10,
  },
  
  // Security
  security: {
    // Prevent email enumeration
    enableSignUp: true,
    // Require email confirmation
    emailConfirmation: true,
    // Password requirements
    passwordMinLength: 12,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: true,
    // Rate limiting
    rateLimit: {
      signUp: 3,      // per hour per IP
      signIn: 10,     // per hour per IP
      resetPassword: 3, // per hour per IP
    },
    // MFA
    mfa: {
      enabled: true,
      factors: ['totp'],
    },
  },
  
  // URLs
  urls: {
    siteUrl: process.env.NEXT_PUBLIC_APP_URL,
    redirectUrls: [
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    ],
  },
};
```

### Session Management

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component - ignore
          }
        },
      },
      // Security: verify JWT on every request
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
}
```

### Middleware Protection

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/admin', '/projects', '/api'];
const authRoutes = ['/auth/login', '/auth/register', '/auth/reset-password'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response.cookies.setAll(cookiesToSet);
        },
      },
    }
  );

  // Refresh session
  const { data: { session } } = await supabase.auth.getSession();
  
  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  if (isProtected && !session) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## 2. Profiles Table & Role Management

### Schema

```sql
-- Already defined in migrations.sql, key points:
CREATE TYPE user_role AS ENUM ('ADMIN', 'PROJECT_MANAGER', 'USER');

CREATE TABLE profiles (
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

-- Index for role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);
```

### Role Hierarchy

```
ADMIN (Global)
    ├── Full system access
    ├── User management
    ├── All projects access
    └── Bypass all RLS

PROJECT_MANAGER (Project-scoped)
    ├── Manage assigned projects
    ├── Manage tasks in assigned projects
    ├── Manage members in assigned projects
    └── Cannot manage users globally

USER (Project-scoped)
    ├── View assigned projects
    ├── View/update assigned tasks
    ├── Create comments
    └── Upload files (project + private)
```

### Role Assignment

```sql
-- Only ADMIN can assign global roles
CREATE POLICY "Admins can manage roles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    )
    WITH CHECK (
        -- Prevent privilege escalation
        CASE 
            WHEN auth.uid() = id THEN role = (SELECT role FROM profiles WHERE id = auth.uid())
            ELSE role IN ('USER', 'PROJECT_MANAGER') -- Admins can't create other admins via this policy
        END
    );

-- Service role for system operations
CREATE POLICY "Service role full access" ON profiles
    FOR ALL USING (auth.role() = 'service_role');
```

---

## 3. RLS Policies - Complete Reference

### Design Principles

1. **Default Deny** - No access unless explicitly granted
2. **Project-Scoped** - All data access requires project membership
3. **Role-Based** - Permissions vary by project role
4. **Ownership** - Creators have elevated rights on their resources
5. **Admin Bypass** - Global admins can access everything
6. **Service Role** - System operations only

### Helper Functions

```sql
-- Check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = p_project_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's project role
CREATE OR REPLACE FUNCTION get_project_role(p_project_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS project_role AS $$
DECLARE
    v_role project_role;
BEGIN
    SELECT role INTO v_role
    FROM project_members
    WHERE project_id = p_project_id
    AND user_id = p_user_id;
    RETURN v_role;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has required role
CREATE OR REPLACE FUNCTION has_project_role(p_project_id uuid, p_required_roles project_role[], p_user_id uuid DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
    v_role project_role;
BEGIN
    SELECT role INTO v_role
    FROM project_members
    WHERE project_id = p_project_id
    AND user_id = p_user_id;
    
    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN v_role = ANY(p_required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is global admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_user_id
        AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is project manager (global or project-scoped)
CREATE OR REPLACE FUNCTION is_project_manager(p_project_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Global project manager role
    IF EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_user_id
        AND role = 'PROJECT_MANAGER'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Project-scoped admin/owner
    RETURN has_project_role(p_project_id, ARRAY['OWNER', 'ADMIN'], p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Table: profiles

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins view all profiles" ON profiles
    FOR SELECT USING (is_admin());

-- Users can update their own profile (except role)
CREATE POLICY "Users update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Prevent role change
    );

-- Admins can update any profile
CREATE POLICY "Admins manage profiles" ON profiles
    FOR ALL USING (is_admin())
    WITH CHECK (is_admin());

-- Service role for system operations
CREATE POLICY "Service role profiles" ON profiles
    FOR ALL USING (auth.role() = 'service_role');
```

**Explanation:** Users only see/modify their own profile. Admins see all. Role field is immutable by users (prevents escalation). Service role for auth triggers.

---

### Table: projects

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Members can view active projects they belong to
CREATE POLICY "Members view projects" ON projects
    FOR SELECT USING (
        deleted_at IS NULL
        AND (
            owner_id = auth.uid()
            OR is_project_member(id)
            OR is_admin()
        )
    );

-- Admins and PMs can create projects
CREATE POLICY "Admins/PMs create projects" ON projects
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id
        AND (is_admin() OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'PROJECT_MANAGER'
        ))
    );

-- Owner, project admins, and global admins can update
CREATE POLICY "Owner/Admin update project" ON projects
    FOR UPDATE USING (
        deleted_at IS NULL
        AND (
            owner_id = auth.uid()
            OR has_project_role(id, ARRAY['OWNER', 'ADMIN'])
            OR is_admin()
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND (
            owner_id = auth.uid()
            OR has_project_role(id, ARRAY['OWNER', 'ADMIN'])
            OR is_admin()
        )
    );

-- Only owner and global admins can delete
CREATE POLICY "Owner/Admin delete project" ON projects
    FOR DELETE USING (
        owner_id = auth.uid()
        OR is_admin()
    );

-- Service role
CREATE POLICY "Service role projects" ON projects
    FOR ALL USING (auth.role() = 'service_role');
```

**Explanation:** View access for all members. Create restricted to Admins/PMs. Update for owner + project admins + global admins. Delete only owner + global admins (not project admins - prevents accidental deletion).

---

### Table: project_members

```sql
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Members can view project members
CREATE POLICY "Members view members" ON project_members
    FOR SELECT USING (
        is_project_member(project_id)
        OR is_admin()
    );

-- Owner, project admins, and global admins can manage members
CREATE POLICY "Owner/Admin manage members" ON project_members
    FOR ALL USING (
        has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
        OR is_admin()
    )
    WITH CHECK (
        has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
        OR is_admin()
    );

-- Users can accept their own invitation
CREATE POLICY "Users accept invitation" ON project_members
    FOR UPDATE USING (
        user_id = auth.uid()
        AND accepted_at IS NULL
    )
    WITH CHECK (
        user_id = auth.uid()
        AND accepted_at IS NOT NULL
        -- Prevent role escalation on accept
        AND role = (SELECT role FROM project_members WHERE id = project_members.id)
    );

-- Prevent self-removal for owners
CREATE POLICY "Prevent owner self-removal" ON project_members
    FOR DELETE USING (
        (has_project_role(project_id, ARRAY['OWNER', 'ADMIN']) OR is_admin())
        AND NOT (user_id = auth.uid() AND role = 'OWNER')
    );

-- Service role
CREATE POLICY "Service role members" ON project_members
    FOR ALL USING (auth.role() = 'service_role');
```

**Explanation:** View for members. Management for owner/admins/admins. Self-accept invitation only. Prevent owner self-removal. Role cannot be changed during acceptance.

---

### Table: tasks

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Members can view project tasks
CREATE POLICY "Members view tasks" ON tasks
    FOR SELECT USING (
        deleted_at IS NULL
        AND (
            is_project_member(project_id)
            OR is_admin()
        )
    );

-- Members can create tasks (PM, Admin, Member roles)
CREATE POLICY "Members create tasks" ON tasks
    FOR INSERT WITH CHECK (
        deleted_at IS NULL
        AND created_by = auth.uid()
        AND has_project_role(project_id, ARRAY['OWNER', 'ADMIN', 'MEMBER'])
    );

-- Owner, project admins, assignee, creator, global admins can update
CREATE POLICY "Authorized update tasks" ON tasks
    FOR UPDATE USING (
        deleted_at IS NULL
        AND (
            has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
            OR assignee_id = auth.uid()
            OR created_by = auth.uid()
            OR is_admin()
        )
    )
    WITH CHECK (
        deleted_at IS NULL
        AND (
            has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
            OR assignee_id = auth.uid()
            OR created_by = auth.uid()
            OR is_admin()
        )
        -- Prevent unauthorized field changes
        AND (
            -- Assignees can only update status/progress
            (assignee_id = auth.uid() AND 
                NOT (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) AND
                NOT (OLD.project_id IS DISTINCT FROM NEW.project_id) AND
                NOT (OLD.created_by IS DISTINCT FROM NEW.created_by) AND
                NOT (OLD.priority IS DISTINCT FROM NEW.priority))
            OR
            -- Owners/admins can change everything
            has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
            OR is_admin()
        )
    );

-- Only owner, project admins, global admins can delete
CREATE POLICY "Owner/Admin delete tasks" ON tasks
    FOR DELETE USING (
        has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
        OR is_admin()
    );

-- Service role
CREATE POLICY "Service role tasks" ON tasks
    FOR ALL USING (auth.role() = 'service_role');
```

**Explanation:** 
- View: All project members
- Create: Members+ (not viewers)
- Update: Complex - assignees can only update status/progress, not reassign or change priority. Owners/admins have full control.
- Delete: Owner/admins only
- Field-level protection in WITH CHECK prevents privilege escalation

---

### Table: task_comments

```sql
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Members can view comments
CREATE POLICY "Members view comments" ON task_comments
    FOR SELECT USING (
        deleted_at IS NULL
        AND (
            is_project_member((SELECT project_id FROM tasks WHERE id = task_id))
            OR is_admin()
        )
    );

-- Members can create comments
CREATE POLICY "Members create comments" ON task_comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND is_project_member((SELECT project_id FROM tasks WHERE id = task_id))
    );

-- Author can update own comments
CREATE POLICY "Author update comments" ON task_comments
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Author, project admins, global admins can delete
CREATE POLICY "Author/Admin delete comments" ON task_comments
    FOR DELETE USING (
        user_id = auth.uid()
        OR has_project_role(
            (SELECT project_id FROM tasks WHERE id = task_id),
            ARRAY['OWNER', 'ADMIN']
        )
        OR is_admin()
    );

-- Service role
CREATE POLICY "Service role comments" ON task_comments
    FOR ALL USING (auth.role() = 'service_role');
```

**Explanation:** Standard comment pattern. Authors own their comments. Project admins can moderate.

---

### Table: task_attachments

```sql
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Members can view attachments
CREATE POLICY "Members view attachments" ON task_attachments
    FOR SELECT USING (
        is_project_member((SELECT project_id FROM tasks WHERE id = task_id))
        OR is_admin()
    );

-- Members can attach files
CREATE POLICY "Members attach files" ON task_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND is_project_member((SELECT project_id FROM tasks WHERE id = task_id))
        AND EXISTS (
            SELECT 1 FROM project_files
            WHERE id = file_id
            AND project_id = (SELECT project_id FROM tasks WHERE id = task_id)
            AND deleted_at IS NULL
        )
    );

-- Uploader, project admins, global admins can delete
CREATE POLICY "Uploader/Admin delete attachments" ON task_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR has_project_role(
            (SELECT project_id FROM tasks WHERE id = task_id),
            ARRAY['OWNER', 'ADMIN']
        )
        OR is_admin()
    );

-- Service role
CREATE POLICY "Service role attachments" ON task_attachments
    FOR ALL USING (auth.role() = 'service_role');
```

**Explanation:** Attachments linked to project_files. Validation ensures file belongs to same project.

---

### Table: project_files (Shared Project Files)

```sql
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Members can view project files
CREATE POLICY "Members view project files" ON project_files
    FOR SELECT USING (
        deleted_at IS NULL
        AND (
            is_project_member(project_id)
            OR is_admin()
        )
    );

-- Members (Owner, Admin, Member) can upload
CREATE POLICY "Members upload project files" ON project_files
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND has_project_role(project_id, ARRAY['OWNER', 'ADMIN', 'MEMBER'])
    );

-- Uploader, project admins, global admins can update
CREATE POLICY "Uploader/Admin update project files" ON project_files
    FOR UPDATE USING (
        uploaded_by = auth.uid()
        OR has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
        OR is_admin()
    )
    WITH CHECK (
        uploaded_by = auth.uid()
        OR has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
        OR is_admin()
    );

-- Uploader, project admins, global admins can delete
CREATE POLICY "Uploader/Admin delete project files" ON project_files
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
        OR is_admin()
    );

-- Service role
CREATE POLICY "Service role project files" ON project_files
    FOR ALL USING (auth.role() = 'service_role');
```

**Explanation:** Shared project files. Viewers cannot upload. Upload requires MEMBER+ role.

---

### Table: user_files (Private User Files)

```sql
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;

-- ONLY owner can access - NO project member access
CREATE POLICY "Owner view private files" ON user_files
    FOR SELECT USING (
        deleted_at IS NULL
        AND user_id = auth.uid()
    );

-- Owner can upload private files
CREATE POLICY "Owner upload private files" ON user_files
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND is_project_member(project_id) -- Must be project member
    );

-- Owner can update own private files
CREATE POLICY "Owner update private files" ON user_files
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Owner can delete own private files
CREATE POLICY "Owner delete private files" ON user_files
    FOR DELETE USING (user_id = auth.uid());

-- Global admins can access for compliance/audit
CREATE POLICY "Admins access private files" ON user_files
    FOR ALL USING (is_admin())
    WITH CHECK (is_admin());

-- Service role
CREATE POLICY "Service role user files" ON user_files
    FOR ALL USING (auth.role() = 'service_role');
```

**Explanation:** **CRITICAL** - Private files are ONLY accessible by owner (+ global admins for compliance). Project members CANNOT access other users' private files. This is enforced at database level.

---

### Table: project_notes (Shared Project Notes)

```sql
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

-- Members can view project notes
CREATE POLICY "Members view project notes" ON project_notes
    FOR SELECT USING (
        deleted_at IS NULL
        AND (
            is_project_member(project_id)
            OR is_admin()
        )
    );

-- Members (Owner, Admin, Member) can create notes
CREATE POLICY "Members create project notes" ON project_notes
    FOR INSERT WITH CHECK (
        author_id = auth.uid()
        AND has_project_role(project_id, ARRAY['OWNER', 'ADMIN', 'MEMBER'])
    );

-- Author, project admins, global admins can update
CREATE POLICY "Author/Admin update project notes" ON project_notes
    FOR UPDATE USING (
        author_id = auth.uid()
        OR has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
        OR is_admin()
    )
    WITH CHECK (
        author_id = auth.uid()
        OR has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
        OR is_admin()
    );

-- Author, project admins, global admins can delete
CREATE POLICY "Author/Admin delete project notes" ON project_notes
    FOR DELETE USING (
        author_id = auth.uid()
        OR has_project_role(project_id, ARRAY['OWNER', 'ADMIN'])
        OR is_admin()
    );

-- Service role
CREATE POLICY "Service role project notes" ON project_notes
    FOR ALL USING (auth.role() = 'service_role');
```

---

### Table: user_notes (Private User Notes)

```sql
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- ONLY owner can access
CREATE POLICY "Owner view private notes" ON user_notes
    FOR SELECT USING (
        deleted_at IS NULL
        AND user_id = auth.uid()
    );

-- Owner can create private notes
CREATE POLICY "Owner create private notes" ON user_notes
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND is_project_member(project_id)
    );

-- Owner can update own private notes
CREATE POLICY "Owner update private notes" ON user_notes
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Owner can delete own private notes
CREATE POLICY "Owner delete private notes" ON user_notes
    FOR DELETE USING (user_id = auth.uid());

-- Global admins for compliance
CREATE POLICY "Admins access private notes" ON user_notes
    FOR ALL USING (is_admin())
    WITH CHECK (is_admin());

-- Service role
CREATE POLICY "Service role user notes" ON user_notes
    FOR ALL USING (auth.role() = 'service_role');
```

**Explanation:** Same strict privacy as user_files. Only owner + global admins.

---

### Table: notifications

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- Users can mark their own as read
CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- System (service_role) creates notifications
CREATE POLICY "System creates notifications" ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Admins can view all for support
CREATE POLICY "Admins view all notifications" ON notifications
    FOR SELECT USING (is_admin());
```

---

### Table: activity_logs

```sql
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Members can view project activity
CREATE POLICY "Members view activity" ON activity_logs
    FOR SELECT USING (
        project_id IS NULL
        OR is_project_member(project_id)
        OR is_admin()
    );

-- System creates activity logs
CREATE POLICY "System creates activity" ON activity_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Admins can view all
CREATE POLICY "Admins view all activity" ON activity_logs
    FOR SELECT USING (is_admin());
```

---

## 4. Storage RLS Policies

### Bucket Configuration

```sql
-- Create buckets via Supabase Dashboard or API
-- Bucket: project-files (private)
-- Bucket: user-files (private)  
-- Bucket: avatars (public)
```

### Storage Policies

#### project-files bucket

```sql
-- Path pattern: {project_id}/{file_id}/{filename}

-- Members can read project files
CREATE POLICY "Members read project files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'project-files'
        AND EXISTS (
            SELECT 1 FROM project_members
            WHERE project_id = (storage.foldername(name))[1]::uuid
            AND user_id = auth.uid()
        )
    );

-- Members (Owner, Admin, Member) can upload
CREATE POLICY "Members upload project files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-files'
        AND auth.uid() = (storage.foldername(name))[2]::uuid -- uploaded_by in path
        AND EXISTS (
            SELECT 1 FROM project_members
            WHERE project_id = (storage.foldername(name))[1]::uuid
            AND user_id = auth.uid()
            AND role IN ('OWNER', 'ADMIN', 'MEMBER')
        )
    );

-- Uploader, project admins can update
CREATE POLICY "Uploader/Admin update project files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'project-files'
        AND (
            auth.uid() = (storage.foldername(name))[2]::uuid
            OR EXISTS (
                SELECT 1 FROM project_members
                WHERE project_id = (storage.foldername(name))[1]::uuid
                AND user_id = auth.uid()
                AND role IN ('OWNER', 'ADMIN')
            )
            OR is_admin()
        )
    );

-- Uploader, project admins can delete
CREATE POLICY "Uploader/Admin delete project files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'project-files'
        AND (
            auth.uid() = (storage.foldername(name))[2]::uuid
            OR EXISTS (
                SELECT 1 FROM project_members
                WHERE project_id = (storage.foldername(name))[1]::uuid
                AND user_id = auth.uid()
                AND role IN ('OWNER', 'ADMIN')
            )
            OR is_admin()
        )
    );
```

#### user-files bucket

```sql
-- Path pattern: {user_id}/{project_id}/{file_id}/{filename}

-- ONLY owner can access
CREATE POLICY "Owner read private files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'user-files'
        AND auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Owner upload private files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-files'
        AND auth.uid() = (storage.foldername(name))[1]::uuid
        AND EXISTS (
            SELECT 1 FROM project_members
            WHERE project_id = (storage.foldername(name))[2]::uuid
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Owner update private files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-files'
        AND auth.uid() = (storage.foldername(name))[1]::uuid
    );

CREATE POLICY "Owner delete private files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-files'
        AND auth.uid() = (storage.foldername(name))[1]::uuid
    );

-- Admins for compliance
CREATE POLICY "Admins access private files" ON storage.objects
    FOR ALL USING (
        bucket_id = 'user-files'
        AND is_admin()
    );
```

#### avatars bucket

```sql
-- Path pattern: {user_id}/{filename}

-- Public read
CREATE POLICY "Public read avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- Authenticated users upload to own folder
CREATE POLICY "Users upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid() = (storage.foldername(name))[1]::uuid
    );

-- Users update own avatar
CREATE POLICY "Users update own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars'
        AND auth.uid() = (storage.foldername(name))[1]::uuid
    );

-- Users delete own avatar
CREATE POLICY "Users delete own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars'
        AND auth.uid() = (storage.foldername(name))[1]::uuid
    );
```

---

## 5. Privilege Escalation Prevention

### Database-Level Protections

```sql
-- 1. Prevent role escalation in profiles
CREATE POLICY "Prevent role escalation" ON profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    );

-- 2. Prevent project_id manipulation in tasks
CREATE POLICY "Prevent project_id change" ON tasks
    FOR UPDATE USING (true)
    WITH CHECK (
        -- Non-admins cannot change project_id
        (has_project_role(project_id, ARRAY['OWNER', 'ADMIN']) OR is_admin())
        OR OLD.project_id = NEW.project_id
    );

-- 3. Prevent assignee manipulation by non-admins
CREATE POLICY "Prevent assignee escalation" ON tasks
    FOR UPDATE USING (true)
    WITH CHECK (
        (has_project_role(project_id, ARRAY['OWNER', 'ADMIN']) OR is_admin())
        OR OLD.assignee_id = NEW.assignee_id
        OR (assignee_id = auth.uid() AND NEW.assignee_id = auth.uid()) -- Self-assign only
    );

-- 4. Prevent created_by manipulation
CREATE POLICY "Prevent created_by change" ON tasks
    FOR UPDATE USING (true)
    WITH CHECK (OLD.created_by = NEW.created_by);

-- 5. Prevent user_id manipulation in project_members
CREATE POLICY "Prevent member user_id change" ON project_members
    FOR UPDATE USING (true)
    WITH CHECK (OLD.user_id = NEW.user_id);

-- 6. Prevent project_id manipulation in project_members
CREATE POLICY "Prevent member project_id change" ON project_members
    FOR UPDATE USING (true)
    WITH CHECK (OLD.project_id = NEW.project_id);
```

### Application-Level Protections

```typescript
// lib/auth/permissions.ts
export async function verifyProjectAccess(
  projectId: string,
  requiredRoles: ProjectRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
): Promise<{ user: User; role: ProjectRole }> {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single();
  
  if (!membership) throw new ForbiddenError('Not a project member');
  if (!requiredRoles.includes(membership.role)) {
    throw new ForbiddenError('Insufficient project role');
  }
  
  return { user, role: membership.role };
}

export async function verifyTaskAccess(
  taskId: string,
  action: 'read' | 'update' | 'delete'
): Promise<{ user: User; task: Task }> {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  
  const { data: task } = await supabase
    .from('tasks')
    .select('*, project_id')
    .eq('id', taskId)
    .single();
  
  if (!task) throw new NotFoundError('Task not found');
  if (task.deleted_at) throw new ForbiddenError('Task deleted');
  
  const membership = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', task.project_id)
    .eq('user_id', user.id)
    .single();
  
  if (!membership.data) throw new ForbiddenError('Not a project member');
  
  const role = membership.data.role;
  const isOwner = task.created_by === user.id;
  const isAssignee = task.assignee_id === user.id;
  const isAdmin = role === 'ADMIN' || role === 'OWNER';
  const isGlobalAdmin = await isGlobalAdmin(user.id);
  
  // Check permissions based on action
  switch (action) {
    case 'read':
      if (!isGlobalAdmin && !isAdmin && !isOwner && !isAssignee && role === 'VIEWER') {
        // Viewers can read
        break;
      }
      break;
    case 'update':
      if (isGlobalAdmin || isAdmin) break;
      if (isAssignee) {
        // Assignees can only update status/progress
        // Validate in Server Action
        break;
      }
      if (isOwner) break;
      throw new ForbiddenError('Cannot update this task');
    case 'delete':
      if (!isGlobalAdmin && !isAdmin && !isOwner) {
        throw new ForbiddenError('Cannot delete this task');
      }
      break;
  }
  
  return { user, task };
}
```

---

## 6. Server Actions Protection

### Pattern: Always Verify in Server Action

```typescript
// features/tasks/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyTaskAccess, verifyProjectAccess } from '@/lib/auth/permissions';
import { z } from 'zod';

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  progress: z.number().min(0).max(100).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
});

export async function updateTaskAction(formData: FormData) {
  // 1. Authentication
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  // 2. Validation
  const rawData = Object.fromEntries(formData);
  const parsed = updateTaskSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: 'Invalid input', issues: parsed.error.flatten() };
  }
  
  // 3. Authorization - BEFORE any mutation
  const { task } = await verifyTaskAccess(parsed.data.taskId, 'update');
  
  // 4. Field-level authorization
  const updates: Partial<Task> = {};
  const membership = await getProjectMembership(task.project_id, user.id);
  const isAdmin = membership.role === 'ADMIN' || membership.role === 'OWNER';
  const isAssignee = task.assignee_id === user.id;
  const isOwner = task.created_by === user.id;
  
  // Assignees can ONLY update status/progress
  if (isAssignee && !isAdmin && !isOwner) {
    const allowedFields = ['status', 'progress'];
    for (const key of Object.keys(parsed.data)) {
      if (!allowedFields.includes(key) && parsed.data[key] !== undefined) {
        throw new Error(`Field ${key} cannot be modified by assignee`);
      }
    }
  }
  
  // Only admins/owner can reassign
  if (parsed.data.assigneeId !== undefined && parsed.data.assigneeId !== task.assignee_id) {
    if (!isAdmin && !isOwner) {
      throw new Error('Only project admins/owner can reassign tasks');
    }
    // Verify new assignee is project member
    const { data: newAssignee } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', task.project_id)
      .eq('user_id', parsed.data.assigneeId)
      .single();
    if (!newAssignee) throw new Error('Assignee must be project member');
  }
  
  // Only admins/owner can change priority
  if (parsed.data.priority !== undefined && parsed.data.priority !== task.priority) {
    if (!isAdmin && !isOwner) {
      throw new Error('Only project admins/owner can change priority');
    }
  }
  
  // 5. Apply updates
  const { error } = await supabase
    .from('tasks')
    .update(parsed.data)
    .eq('id', parsed.data.taskId);
  
  if (error) throw new Error(error.message);
  
  // 6. Revalidate
  revalidatePath(`/projects/${task.project_id}/tasks/${task.id}`);
  revalidatePath(`/projects/${task.project_id}/board`);
  
  // 7. Log activity (via service role)
  await logActivity({
    project_id: task.project_id,
    action: 'TASK_UPDATED',
    entity_type: 'task',
    entity_id: task.id,
    metadata: { changes: parsed.data },
  });
  
  return { success: true };
}
```

### Key Protection Patterns

1. **Auth First** - `getUser()` before any logic
2. **Validation** - Zod schema on all inputs
3. **Authorization** - `verifyTaskAccess()` / `verifyProjectAccess()` 
4. **Field-Level Checks** - Explicit per-field permissions
5. **No Trust** - Never trust `formData` user_id, project_id
6. **Revalidation** - After successful mutation
7. **Audit Log** - Server-side activity logging

---

## 7. Route Handlers Protection

```typescript
// app/api/tasks/[id]/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyTaskAccess } from '@/lib/auth/permissions';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // 1. Auth
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Authorization
  try {
    await verifyTaskAccess(id, 'update');
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  
  // 3. Validate
  const body = await request.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
  }
  
  // 4. Mutate (same field-level checks as Server Action)
  // ... implementation
  
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await verifyTaskAccess(id, 'delete');
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ success: true });
}
```

---

## 8. Frontend Authorization - Defense in Depth

### Client-Side Guards (UX Only - NOT Security)

```typescript
// components/auth/RequireProjectRole.tsx
'use client';

import { useSession } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RequireProjectRoleProps {
  projectId: string;
  allowedRoles: ProjectRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireProjectRole({ 
  projectId, 
  allowedRoles, 
  children, 
  fallback = null 
}: RequireProjectRoleProps) {
  const { data: session } = useSession();
  const [membership, setMembership] = useState<ProjectMember | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }
    
    // Fetch membership for UX
    fetchProjectMembership(projectId, session.user.id)
      .then(setMembership)
      .catch(() => router.push('/dashboard'));
  }, [projectId, session?.user?.id, router]);
  
  if (!session?.user) return null; // Loading
  if (!membership) return <LoadingSkeleton />;
  if (!allowedRoles.includes(membership.role)) return fallback;
  
  return <>{children}</>;
}
```

```typescript
// hooks/useProjectPermissions.ts
export function useProjectPermissions(projectId: string) {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<ProjectPermissions>();
  
  useEffect(() => {
    if (!session?.user) return;
    
    // Fetch once for UI permissions
    fetch(`/api/projects/${projectId}/permissions`)
      .then(res => res.json())
      .then(setPermissions);
  }, [projectId, session?.user?.id]);
  
  return {
    canCreateTasks: permissions?.canCreateTasks ?? false,
    canManageMembers: permissions?.canManageMembers ?? false,
    canDeleteTasks: permissions?.canDeleteTasks ?? false,
    canChangePriority: permissions?.canChangePriority ?? false,
    role: permissions?.role ?? 'VIEWER',
  };
}
```

**Critical:** Frontend checks are for UX only (hiding buttons, showing/hiding UI). ALL security enforced in Database (RLS) and Server Actions/Route Handlers.

---

## 9. Testing RLS Policies

### Test Framework

```sql
-- test/rls_test.sql
-- Run as different users to verify policies

-- Setup test users
-- Run these in Supabase SQL Editor with different auth contexts

-- ============================================================
-- TEST 1: Admin Access
-- ============================================================
-- Login as admin@company.com
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "admin-user-uuid", "role": "authenticated"}';

-- Should see ALL projects
SELECT * FROM projects; -- Expect: all projects

-- Should see ALL profiles
SELECT * FROM profiles; -- Expect: all profiles

-- Should be able to create project
INSERT INTO projects (name, key, owner_id) 
VALUES ('Test Project', 'TEST', 'admin-user-uuid'); -- Expect: success

-- ============================================================
-- TEST 2: Project Manager Access
-- ============================================================
-- Login as pm@company.com
SET request.jwt.claims = '{"sub": "pm-user-uuid", "role": "authenticated"}';

-- Should see only assigned projects
SELECT * FROM projects; -- Expect: only projects where member

-- Should NOT see other projects' tasks
SELECT * FROM tasks WHERE project_id = 'other-project-uuid'; -- Expect: 0 rows

-- Should be able to create task in own project
INSERT INTO tasks (project_id, title, created_by) 
VALUES ('own-project-uuid', 'Test Task', 'pm-user-uuid'); -- Expect: success

-- Should NOT be able to create project (if not global PM)
INSERT INTO projects (name, key, owner_id) 
VALUES ('Unauthorized', 'UNAUTH', 'pm-user-uuid'); -- Expect: RLS violation

-- ============================================================
-- TEST 3: User Access
-- ============================================================
-- Login as user@company.com
SET request.jwt.claims = '{"sub": "regular-user-uuid", "role": "authenticated"}';

-- Should see only member projects
SELECT * FROM projects; -- Expect: member projects only

-- Should see only assigned tasks
SELECT * FROM tasks; -- Expect: assigned tasks + created tasks

-- Should be able to update own task status
UPDATE tasks SET status = 'IN_PROGRESS' 
WHERE id = 'assigned-task-uuid' AND assignee_id = 'regular-user-uuid'; -- Expect: success

-- Should NOT be able to reassign task
UPDATE tasks SET assignee_id = 'other-user-uuid' 
WHERE id = 'assigned-task-uuid'; -- Expect: RLS violation (WITH CHECK)

-- Should NOT be able to change priority
UPDATE tasks SET priority = 'URGENT' 
WHERE id = 'assigned-task-uuid'; -- Expect: RLS violation

-- ============================================================
-- TEST 4: Private Files/Notes Isolation
-- ============================================================
-- User A creates private file
INSERT INTO user_files (user_id, project_id, name, storage_path, mime_type, size)
VALUES ('user-a-uuid', 'project-uuid', 'secret.pdf', 'user-a/project/file.pdf', 'application/pdf', 1024);

-- User B tries to access User A's private file
SET request.jwt.claims = '{"sub": "user-b-uuid", "role": "authenticated"}';
SELECT * FROM user_files WHERE user_id = 'user-a-uuid'; -- Expect: 0 rows

-- User B tries to access via project_files (should not exist there)
SELECT * FROM project_files WHERE project_id = 'project-uuid'; -- Expect: only shared files

-- ============================================================
-- TEST 5: Storage Policies
-- ============================================================
-- Test via Supabase Storage API with different JWTs
-- User A uploads to project-files/project-uuid/file-uuid/test.pdf
-- User B tries to download - should succeed (member)
-- User C (non-member) tries to download - should fail (403)

-- User A uploads to user-files/user-a-uuid/project-uuid/file-uuid/secret.pdf
-- User B tries to download - should fail (403)
-- Admin tries to download - should succeed
```

### Automated RLS Tests

```typescript
// tests/rls.test.ts
import { createClient } from '@supabase/supabase-js';
import { test, expect, describe, beforeAll } from 'vitest';

const adminClient = createClient(url, serviceRoleKey);
const anonClient = createClient(url, anonKey);

async function signIn(email: string, password: string) {
  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return createClient(url, anonKey, { 
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
  });
}

describe('RLS Policies', () => {
  let adminUser: ReturnType<typeof createClient>;
  let pmUser: ReturnType<typeof createClient>;
  let regularUser: ReturnType<typeof createClient>;
  let testProject: string;
  
  beforeAll(async () => {
    adminUser = await signIn('admin@test.com', 'password');
    pmUser = await signIn('pm@test.com', 'password');
    regularUser = await signIn('user@test.com', 'password');
    
    // Create test project as admin
    const { data } = await adminUser.from('projects').insert({
      name: 'Test Project',
      key: 'TEST',
      owner_id: (await adminUser.auth.getUser()).data.user!.id,
    }).select().single();
    testProject = data.id;
    
    // Add users as members
    await adminUser.from('project_members').insert([
      { project_id: testProject, user_id: (await pmUser.auth.getUser()).data.user!.id, role: 'ADMIN' },
      { project_id: testProject, user_id: (await regularUser.auth.getUser()).data.user!.id, role: 'MEMBER' },
    ]);
  });
  
  test('Admin sees all projects', async () => {
    const { data } = await adminUser.from('projects').select('*');
    expect(data.length).toBeGreaterThan(0);
  });
  
  test('PM sees only assigned projects', async () => {
    const { data } = await pmUser.from('projects').select('*');
    expect(data.every(p => p.id === testProject)).toBe(true);
  });
  
  test('Regular user sees only member projects', async () => {
    const { data } = await regularUser.from('projects').select('*');
    expect(data.every(p => p.id === testProject)).toBe(true);
  });
  
  test('User cannot access other users private files', async () => {
    // User A creates private file
    const { data: file } = await regularUser.from('user_files').insert({
      user_id: (await regularUser.auth.getUser()).data.user!.id,
      project_id: testProject,
      name: 'secret.txt',
      storage_path: `private/${crypto.randomUUID()}.txt`,
      mime_type: 'text/plain',
      size: 100,
    }).select().single();
    
    // PM tries to access - should fail
    const { data, error } = await pmUser.from('user_files').select('*').eq('id', file.id);
    expect(data).toHaveLength(0);
    expect(error).toBeNull(); // RLS returns empty, not error
  });
  
  test('Assignee can only update status/progress', async () => {
    // Create task assigned to regular user
    const { data: task } = await adminUser.from('tasks').insert({
      project_id: testProject,
      title: 'Test Task',
      assignee_id: (await regularUser.auth.getUser()).data.user!.id,
      created_by: (await adminUser.auth.getUser()).data.user!.id,
    }).select().single();
    
    // User updates status - should work
    const { error: statusError } = await regularUser
      .from('tasks')
      .update({ status: 'IN_PROGRESS', progress: 50 })
      .eq('id', task.id);
    expect(statusError).toBeNull();
    
    // User tries to reassign - should fail
    const { error: reassignError } = await regularUser
      .from('tasks')
      .update({ assignee_id: (await adminUser.auth.getUser()).data.user!.id })
      .eq('id', task.id);
    expect(reassignError).not.toBeNull();
    expect(reassignError?.code).toBe('P0001'); // Check constraint violation
    
    // User tries to change priority - should fail
    const { error: priorityError } = await regularUser
      .from('tasks')
      .update({ priority: 'URGENT' })
      .eq('id', task.id);
    expect(priorityError).not.toBeNull();
  });
  
  test('Storage: Private files only accessible by owner', async () => {
    const user = (await regularUser.auth.getUser()).data.user!;
    
    // Upload private file
    const { data: upload } = await regularUser.storage
      .from('user-files')
      .upload(`${user.id}/${testProject}/file1.txt`, new Blob(['secret']));
    expect(upload).not.toBeNull();
    
    // Try to download as PM - should fail
    const { data: download, error } = await pmUser.storage
      .from('user-files')
      .download(`${user.id}/${testProject}/file1.txt`);
    expect(error).not.toBeNull();
    expect(download).toBeNull();
  });
});
```

### Manual Testing Checklist

```markdown
## RLS Manual Testing Checklist

### Authentication
- [ ] Unauthenticated users cannot access any protected data
- [ ] Expired tokens are rejected
- [ ] Invalid tokens are rejected
- [ ] MFA enforcement works

### Projects
- [ ] Admin sees all projects
- [ ] PM sees only assigned projects
- [ ] User sees only member projects
- [ ] Non-members cannot create tasks in project
- [ ] Viewers cannot create tasks
- [ ] Only owner/admin can delete project

### Project Members
- [ ] Members can view member list
- [ ] Only owner/admin can add/remove members
- [ ] Users can accept own invitations
- [ ] Owner cannot remove themselves
- [ ] Role cannot be escalated during acceptance

### Tasks
- [ ] Members can view all project tasks
- [ ] Members+ can create tasks
- [ ] Assignees can update status/progress only
- [ ] Assignees CANNOT reassign
- [ ] Assignees CANNOT change priority
- [ ] Owner/creator can update all fields
- [ ] Owner/admin can delete tasks
- [ ] Deleted tasks hidden (soft delete)

### Comments
- [ ] Members can view comments
- [ ] Members can create comments
- [ ] Authors can edit own comments
- [ ] Authors/admin can delete comments

### Files
- [ ] Project files: members can view
- [ ] Project files: members+ can upload
- [ ] Project files: uploader/admin can delete
- [ ] User files: ONLY owner can access
- [ ] User files: PMs CANNOT access other users' files
- [ ] Admins can access private files (compliance)

### Notes
- [ ] Project notes: members can view
- [ ] Project notes: members+ can create
- [ ] User notes: ONLY owner can access

### Storage
- [ ] project-files: members can download
- [ ] project-files: non-members get 403
- [ ] user-files: only owner can download
- [ ] avatars: public read, owner write

### Privilege Escalation
- [ ] User cannot update own role
- [ ] User cannot change task project_id
- [ ] User cannot change task created_by
- [ ] User cannot change membership user_id/project_id
- [ ] Service role bypasses all RLS