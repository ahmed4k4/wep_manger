# Supabase RLS Policies

## Overview

This document provides a comprehensive reference for all Row Level Security (RLS) policies in the database. RLS is the **last line of defense** - enforced at the database level regardless of application bugs.

---

## RLS Philosophy

### Defense in Depth
```
Application Layer (Permission Service)
    ↓
API Layer (Route Handlers, Server Actions)
    ↓
Database Layer (RLS Policies) ← Final enforcement
```

### Principles
1. **Enable RLS on ALL tables** - No exceptions
2. **Default deny** - Explicit allow policies only
3. **Least privilege** - Minimum permissions needed
4. **Test thoroughly** - Policies are security-critical
5. **Document every policy** - Clear intent for auditing

---

## Policy Naming Convention

```
{Entity} {Action} {Condition}
Examples:
- "Users can view own projects"
- "Project members can create tasks"
- "Task assignee or project admin can update tasks"
```

---

## Complete Policy Reference

### 1. Users Table

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Admins can update any user
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Service role can manage users (for auth triggers)
CREATE POLICY "Service role full access" ON users
  FOR ALL USING (auth.role() = 'service_role');
```

### 2. Projects Table

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT: Owners and members can view
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = auth.uid()
    )
  );

-- INSERT: Admins and PMs can create
CREATE POLICY "Admins and PMs can create projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'PROJECT_MANAGER')
    )
  );

-- UPDATE: Owner and project admins
CREATE POLICY "Owners and project admins can update projects" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )
  );

-- DELETE: Only owner
CREATE POLICY "Owners can delete projects" ON projects
  FOR DELETE USING (owner_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access projects" ON projects
  FOR ALL USING (auth.role() = 'service_role');
```

### 3. Project Members Table

```sql
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Project members can view other members
CREATE POLICY "Project members can view members" ON project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()
    )
  );

-- INSERT: Project owners/admins can invite
CREATE POLICY "Project owners and admins can invite members" ON project_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('OWNER', 'ADMIN')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()
    )
  );

-- UPDATE: Owner/admins can update roles (not to OWNER)
CREATE POLICY "Project owners and admins can update member roles" ON project_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('OWNER', 'ADMIN')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Cannot promote to OWNER unless you are the project owner
    (role != 'OWNER' OR 
     EXISTS (SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()))
  );

-- DELETE: Owner/admins can remove members, users can leave
CREATE POLICY "Project owners/admins can remove members or users can leave" ON project_members
  FOR DELETE USING (
    user_id = auth.uid() OR -- Users can leave
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id 
      AND pm.user_id = auth.uid() 
      AND pm.role IN ('OWNER', 'ADMIN')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = project_members.project_id AND owner_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access project_members" ON project_members
  FOR ALL USING (auth.role() = 'service_role');
```

### 4. Tasks Table

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: Project members + owner
CREATE POLICY "Project members can view tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid()
    )
  );

-- INSERT: Project members (not viewers)
CREATE POLICY "Project members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id 
      AND user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN', 'MEMBER')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid()
    )
  );

-- UPDATE: Assignee, creator, or project admin
CREATE POLICY "Assignee, creator, or project admin can update tasks" ON tasks
  FOR UPDATE USING (
    assignee_id = auth.uid() OR
    created_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid()
    )
  );

-- DELETE: Creator or project admin
CREATE POLICY "Task creator or project admin can delete tasks" ON tasks
  FOR DELETE USING (
    created_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = tasks.project_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = tasks.project_id AND owner_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access tasks" ON tasks
  FOR ALL USING (auth.role() = 'service_role');
```

### 5. Files Table

```sql
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- SELECT: Project files → project members; Private files → owner only
CREATE POLICY "Users can view files" ON files
  FOR SELECT USING (
    -- Project files
    (project_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = files.project_id AND user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM projects WHERE id = files.project_id AND owner_id = auth.uid()
      )
    )) OR
    -- Private user files
    (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- INSERT: Project members can upload; Users can upload private files
CREATE POLICY "Users can upload files" ON files
  FOR INSERT WITH CHECK (
    -- Project files
    (project_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = files.project_id 
        AND user_id = auth.uid() 
        AND role IN ('OWNER', 'ADMIN', 'MEMBER')
      ) OR
      EXISTS (
        SELECT 1 FROM projects WHERE id = files.project_id AND owner_id = auth.uid()
      )
    )) OR
    -- Private user files
    (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- UPDATE: Uploader or project admin
CREATE POLICY "Uploader or project admin can update files" ON files
  FOR UPDATE USING (
    uploaded_by_id = auth.uid() OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = files.project_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )) OR
    (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- DELETE: Uploader or project admin (project files); Owner (private files)
CREATE POLICY "Uploader or project admin can delete files" ON files
  FOR DELETE USING (
    uploaded_by_id = auth.uid() OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = files.project_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    )) OR
    (user_id IS NOT NULL AND user_id = auth.uid())
  );

-- Service role full access
CREATE POLICY "Service role full access files" ON files
  FOR ALL USING (auth.role() = 'service_role');
```

### 6. Notes Table

```sql
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- SELECT: Public notes → project members; Private notes → owner + project admins
CREATE POLICY "Users can view notes" ON notes
  FOR SELECT USING (
    -- Public notes
    (is_private = false AND (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = notes.project_id AND user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM projects WHERE id = notes.project_id AND owner_id = auth.uid()
      )
    )) OR
    -- Private notes
    (is_private = true AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_id = notes.project_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
      )
    ))
  );

-- INSERT: Project members (not viewers)
CREATE POLICY "Project members can create notes" ON notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = notes.project_id 
      AND user_id = auth.uid() 
      AND role IN ('OWNER', 'ADMIN', 'MEMBER')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = notes.project_id AND owner_id = auth.uid()
    )
  );

-- UPDATE: Owner or project admin
CREATE POLICY "Note owner or project admin can update notes" ON notes
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = notes.project_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = notes.project_id AND owner_id = auth.uid()
    )
  );

-- DELETE: Owner or project admin
CREATE POLICY "Note owner or project admin can delete notes" ON notes
  FOR DELETE USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = notes.project_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = notes.project_id AND owner_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access notes" ON notes
  FOR ALL USING (auth.role() = 'service_role');
```

### 7. Comments Table

```sql
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- SELECT: Based on parent entity access
CREATE POLICY "Users can view comments" ON comments
  FOR SELECT USING (
    -- Comments on tasks
    (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = comments.task_id AND pm.user_id = auth.uid()
    )) OR
    (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = comments.task_id AND p.owner_id = auth.uid()
    )) OR
    -- Comments on notes
    (note_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM notes n
      JOIN project_members pm ON pm.project_id = n.project_id
      WHERE n.id = comments.note_id AND pm.user_id = auth.uid()
    )) OR
    (note_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM notes n
      JOIN projects p ON p.id = n.project_id
      WHERE n.id = comments.note_id AND p.owner_id = auth.uid()
    )) OR
    -- Comments on files
    (file_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM files f
      JOIN project_members pm ON pm.project_id = f.project_id
      WHERE f.id = comments.file_id AND pm.user_id = auth.uid()
    )) OR
    (file_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM files f
      JOIN projects p ON p.id = f.project_id
      WHERE f.id = comments.file_id AND p.owner_id = auth.uid()
    ))
  );

-- INSERT: Authenticated users with access to parent entity
CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      -- Task comments
      (task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM tasks t
        JOIN project_members pm ON pm.project_id = t.project_id
        WHERE t.id = comments.task_id AND pm.user_id = auth.uid() AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
      )) OR
      -- Note comments
      (note_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM notes n
        JOIN project_members pm ON pm.project_id = n.project_id
        WHERE n.id = comments.note_id AND pm.user_id = auth.uid() AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
      )) OR
      -- File comments
      (file_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM files f
        JOIN project_members pm ON pm.project_id = f.project_id
        WHERE f.id = comments.file_id AND pm.user_id = auth.uid() AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
      ))
    )
  );

-- UPDATE: Comment author only
CREATE POLICY "Comment author can update own comments" ON comments
  FOR UPDATE USING (user_id = auth.uid());

-- DELETE: Comment author or project admin
CREATE POLICY "Comment author or project admin can delete comments" ON comments
  FOR DELETE USING (
    user_id = auth.uid() OR
    (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = comments.task_id AND pm.user_id = auth.uid() AND pm.role IN ('OWNER', 'ADMIN')
    )) OR
    (note_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM notes n
      JOIN project_members pm ON pm.project_id = n.project_id
      WHERE n.id = comments.note_id AND pm.user_id = auth.uid() AND pm.role IN ('OWNER', 'ADMIN')
    )) OR
    (file_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM files f
      JOIN project_members pm ON pm.project_id = f.project_id
      WHERE f.id = comments.file_id AND pm.user_id = auth.uid() AND pm.role IN ('OWNER', 'ADMIN')
    ))
  );

-- Service role full access
CREATE POLICY "Service role full access comments" ON comments
  FOR ALL USING (auth.role() = 'service_role');
```

### 8. Activity Logs Table

```sql
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Project members + owner
CREATE POLICY "Project members can view activity" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = activity_logs.project_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM projects WHERE id = activity_logs.project_id AND owner_id = auth.uid()
    )
  );

-- INSERT: System only (via service role)
CREATE POLICY "System can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- No UPDATE/DELETE for activity logs (immutable)

-- Service role full access
CREATE POLICY "Service role full access activity_logs" ON activity_logs
  FOR ALL USING (auth.role() = 'service_role');
```

### 9. Notifications Table

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: Only the recipient
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- UPDATE: Only the recipient (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- INSERT: System only
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- DELETE: Only the recipient
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- Service role full access
CREATE POLICY "Service role full access notifications" ON notifications
  FOR ALL USING (auth.role() = 'service_role');
```

---

## Storage Policies

### Project Files Bucket
```sql
-- Project files: project members only
CREATE POLICY "Project members can view project files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-files' AND
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = (storage.foldername(name))[1]::uuid
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can upload project files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-files' AND
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = (storage.foldername(name))[1]::uuid
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
    )
  );

CREATE POLICY "Uploaders or project admins can update project files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-files' AND
    (owner = auth.uid() OR
     EXISTS (
       SELECT 1 FROM project_members pm
       WHERE pm.project_id = (storage.foldername(name))[1]::uuid
       AND pm.user_id = auth.uid()
       AND pm.role IN ('OWNER', 'ADMIN')
     ))
  );

CREATE POLICY "Uploaders or project admins can delete project files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-files' AND
    (owner = auth.uid() OR
     EXISTS (
       SELECT 1 FROM project_members pm
       WHERE pm.project_id = (storage.foldername(name))[1]::uuid
       AND pm.user_id = auth.uid()
       AND pm.role IN ('OWNER', 'ADMIN')
     ))
  );
```

### User Files Bucket (Private)
```sql
-- User files: only the owner
CREATE POLICY "Users can manage own files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

### Avatars Bucket (Public Read)
```sql
-- Public read for avatars
CREATE POLICY "Public avatar read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/delete their own avatar
CREATE POLICY "Users can manage own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## Policy Testing Strategy

### Test Cases per Policy
```sql
-- Example test script (run as different users)
-- Test: User can view own project
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "user-1"}';
SELECT * FROM projects WHERE id = 'project-1'; -- Should return row

-- Test: User cannot view other's project
SET request.jwt.claims = '{"sub": "user-2"}';
SELECT * FROM projects WHERE id = 'project-1'; -- Should return 0 rows

-- Test: Project member can create task
SET request.jwt.claims = '{"sub": "user-3"}';
INSERT INTO tasks (project_id, title, created_by_id) 
VALUES ('project-1', 'Test', 'user-3'); -- Should succeed if user-3 is member

-- Test: Viewer cannot create task
SET request.jwt.claims = '{"sub": "user-4"}'; -- VIEWER role
INSERT INTO tasks (project_id, title, created_by_id) 
VALUES ('project-1', 'Test', 'user-4'); -- Should fail
```

### Automated Testing
```typescript
// tests/rls/policies.test.ts
import { createClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  const adminClient = createClient(url, serviceKey);
  const userClient = (userId: string) => 
    createClient(url, anonKey, { global: { headers: { 'x-user-id': userId } } });
  
  describe('Projects', () => {
    it('owner can view project', async () => {
      const client = userClient('owner-id');
      const { data } = await client.from('projects').select('*').eq('id', 'proj-1');
      expect(data).toHaveLength(1);
    });
    
    it('non-member cannot view project', async () => {
      const client = userClient('outsider-id');
      const { data } = await client.from('projects').select('*').eq('id', 'proj-1');
      expect(data).toHaveLength(0);
    });
    
    it('member can create task', async () => {
      const client = userClient('member-id');
      const { error } = await client.from('tasks').insert({
        project_id: 'proj-1',
        title: 'Test',
        created_by_id: 'member-id'
      });
      expect(error).toBeNull();
    });
  });
});
```

---

## Policy Management

### Applying Policies
```bash
# Apply via Supabase CLI
supabase db push

# Or run migration
supabase migration up
```

### Policy Debugging
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test policy evaluation
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM tasks WHERE project_id = 'proj-1';
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| **Forgetting service_role policies** | Always add `auth.role() = 'service_role'` policy for system operations |
| **Using `auth.uid()` in INSERT WITH CHECK** | Use `auth.uid()` in both USING and WITH CHECK |
| **Circular dependencies** | Avoid policies that reference each other |
| **Performance** | Add indexes on columns used in policies (project_id, user_id) |
| **Policy conflicts** | Use `PERMISSIVE` (default) - any matching policy allows |

---

## Migration Checklist

When adding new table:
- [ ] Enable RLS: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
- [ ] Add SELECT policy
- [ ] Add INSERT policy (if needed)
- [ ] Add UPDATE policy (if needed)
- [ ] Add DELETE policy (if needed)
- [ ] Add service_role policy
- [ ] Test with different user roles
- [ ] Document in this file

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*