# Project Management Database Design

## Overview

Production-ready PostgreSQL database design for a Project Management Platform using Supabase. Includes all tables, constraints, indexes, relationships, and RLS policies.

---

## Table Inventory

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (synced from auth.users) |
| `projects` | Project entities |
| `project_members` | Project membership with roles |
| `tasks` | Task entities with status/priority/progress |
| `task_comments` | Comments on tasks |
| `task_attachments` | File attachments on tasks |
| `project_files` | Shared project files |
| `user_files` | User-specific private files |
| `project_notes` | Shared project notes |
| `user_notes` | User-specific private notes |
| `notifications` | User notifications |
| `activity_logs` | Audit trail |

---

## Detailed Table Definitions

### 1. profiles (User Profiles)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, FK → auth.users(id) | User ID |
| `email` | `text` | NOT NULL, UNIQUE | Email address |
| `full_name` | `text` | | Full name |
| `avatar_url` | `text` | | Profile avatar URL |
| `role` | `user_role` | NOT NULL, DEFAULT 'USER' | Global role: ADMIN, USER |
| `locale` | `text` | DEFAULT 'en' | Preferred locale |
| `theme` | `text` | DEFAULT 'system' | Theme preference |
| `notification_preferences` | `jsonb` | DEFAULT '{}' | Notification settings |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `idx_profiles_email` ON email (unique)
- `idx_profiles_role` ON role

---

### 2. projects

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Project ID |
| `name` | `text` | NOT NULL | Project name |
| `key` | `text` | NOT NULL, UNIQUE | Short project key (e.g., "PROJ") |
| `description` | `text` | | Project description |
| `status` | `project_status` | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE, ARCHIVED, ON_HOLD |
| `owner_id` | `uuid` | NOT NULL, FK → profiles(id) | Project owner |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |
| `deleted_at` | `timestamptz` | | Soft delete timestamp |

**Indexes:**
- `idx_projects_owner` ON owner_id
- `idx_projects_status` ON status
- `idx_projects_key` ON key (unique)
- `idx_projects_deleted_at` ON deleted_at WHERE deleted_at IS NULL

**Check Constraints:**
- `key` format: `^[A-Z][A-Z0-9]{1,9}$` (uppercase, 2-10 chars)

---

### 3. project_members

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Membership ID |
| `project_id` | `uuid` | NOT NULL, FK → projects(id) CASCADE | Project reference |
| `user_id` | `uuid` | NOT NULL, FK → profiles(id) CASCADE | User reference |
| `role` | `project_role` | NOT NULL, DEFAULT 'MEMBER' | OWNER, ADMIN, MEMBER, VIEWER |
| `joined_at` | `timestamptz` | NOT NULL, DEFAULT now() | Join timestamp |
| `invited_by` | `uuid` | FK → profiles(id) | Inviter reference |
| `invited_at` | `timestamptz` | | Invitation timestamp |
| `accepted_at` | `timestamptz` | | Acceptance timestamp |

**Indexes:**
- `idx_project_members_project` ON project_id
- `idx_project_members_user` ON user_id
- `uq_project_members_unique` UNIQUE ON (project_id, user_id) - **Prevents duplicate membership**

**Check Constraints:**
- Only one OWNER per project (enforced via trigger or partial unique index)

---

### 4. tasks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Task ID |
| `project_id` | `uuid` | NOT NULL, FK → projects(id) CASCADE | Project reference |
| `title` | `text` | NOT NULL | Task title |
| `description` | `text` | | Task description |
| `status` | `task_status` | NOT NULL, DEFAULT 'TODO' | TODO, IN_PROGRESS, REVIEW, BLOCKED, COMPLETED |
| `priority` | `task_priority` | NOT NULL, DEFAULT 'MEDIUM' | LOW, MEDIUM, HIGH, URGENT |
| `progress` | `smallint` | NOT NULL, DEFAULT 0, CHECK (0-100) | Progress percentage |
| `assignee_id` | `uuid` | FK → profiles(id) SET NULL | Assigned user |
| `created_by` | `uuid` | NOT NULL, FK → profiles(id) | Creator |
| `reporter_id` | `uuid` | FK → profiles(id) | Reporter (may differ from creator) |
| `start_date` | `date` | | Planned start date |
| `due_date` | `date` | | Due date |
| `completed_at` | `timestamptz` | | Completion timestamp |
| `position` | `integer` | NOT NULL, DEFAULT 0 | Board position for ordering |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |
| `deleted_at` | `timestamptz` | | Soft delete timestamp |

**Indexes:**
- `idx_tasks_project` ON project_id
- `idx_tasks_assignee` ON assignee_id
- `idx_tasks_status` ON status
- `idx_tasks_priority` ON priority
- `idx_tasks_due_date` ON due_date
- `idx_tasks_position` ON project_id, position
- `idx_tasks_deleted_at` ON deleted_at WHERE deleted_at IS NULL
- `idx_tasks_project_status` ON project_id, status
- `idx_tasks_assignee_status` ON assignee_id, status

**Check Constraints:**
- `progress` BETWEEN 0 AND 100
- `due_date` >= `start_date` (when both present)

---

### 5. task_comments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Comment ID |
| `task_id` | `uuid` | NOT NULL, FK → tasks(id) CASCADE | Task reference |
| `user_id` | `uuid` | NOT NULL, FK → profiles(id) CASCADE | Comment author |
| `content` | `text` | NOT NULL | Comment content |
| `parent_id` | `uuid` | FK → task_comments(id) CASCADE | Parent comment (threading) |
| `is_system` | `boolean` | NOT NULL, DEFAULT false | System-generated comment |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |
| `deleted_at` | `timestamptz` | | Soft delete timestamp |

**Indexes:**
- `idx_task_comments_task` ON task_id
- `idx_task_comments_user` ON user_id
- `idx_task_comments_parent` ON parent_id
- `idx_task_comments_deleted_at` ON deleted_at WHERE deleted_at IS NULL

---

### 6. task_attachments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Attachment ID |
| `task_id` | `uuid` | NOT NULL, FK → tasks(id) CASCADE | Task reference |
| `file_id` | `uuid` | NOT NULL, FK → project_files(id) CASCADE | File reference |
| `uploaded_by` | `uuid` | NOT NULL, FK → profiles(id) CASCADE | Uploader |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_task_attachments_task` ON task_id
- `idx_task_attachments_file` ON file_id
- `uq_task_attachments_unique` UNIQUE ON (task_id, file_id)

---

### 7. project_files (Shared Project Files)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | File ID |
| `project_id` | `uuid` | NOT NULL, FK → projects(id) CASCADE | Project reference |
| `uploaded_by` | `uuid` | NOT NULL, FK → profiles(id) CASCADE | Uploader |
| `name` | `text` | NOT NULL | Original file name |
| `storage_path` | `text` | NOT NULL, UNIQUE | Supabase storage path |
| `mime_type` | `text` | NOT NULL | MIME type |
| `size` | `bigint` | NOT NULL | File size in bytes |
| `checksum` | `text` | | SHA256 checksum |
| `description` | `text` | | File description |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |
| `deleted_at` | `timestamptz` | | Soft delete timestamp |

**Indexes:**
- `idx_project_files_project` ON project_id
- `idx_project_files_uploaded_by` ON uploaded_by
- `idx_project_files_mime_type` ON mime_type
- `idx_project_files_deleted_at` ON deleted_at WHERE deleted_at IS NULL

---

### 8. user_files (User-Specific Private Files)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | File ID |
| `user_id` | `uuid` | NOT NULL, FK → profiles(id) CASCADE | Owner user |
| `project_id` | `uuid` | NOT NULL, FK → projects(id) CASCADE | Project context |
| `name` | `text` | NOT NULL | Original file name |
| `storage_path` | `text` | NOT NULL, UNIQUE | Supabase storage path |
| `mime_type` | `text` | NOT NULL | MIME type |
| `size` | `bigint` | NOT NULL | File size in bytes |
| `checksum` | `text` | | SHA256 checksum |
| `description` | `text` | | File description |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |
| `deleted_at` | `timestamptz` | | Soft delete timestamp |

**Indexes:**
- `idx_user_files_user` ON user_id
- `idx_user_files_project` ON project_id
- `idx_user_files_deleted_at` ON deleted_at WHERE deleted_at IS NULL

---

### 9. project_notes (Shared Project Notes)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Note ID |
| `project_id` | `uuid` | NOT NULL, FK → projects(id) CASCADE | Project reference |
| `author_id` | `uuid` | NOT NULL, FK → profiles(id) CASCADE | Note author |
| `title` | `text` | NOT NULL | Note title |
| `content` | `text` | NOT NULL | Note content (markdown) |
| `is_pinned` | `boolean` | NOT NULL, DEFAULT false | Pinned note |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |
| `deleted_at` | `timestamptz` | | Soft delete timestamp |

**Indexes:**
- `idx_project_notes_project` ON project_id
- `idx_project_notes_author` ON author_id
- `idx_project_notes_pinned` ON project_id, is_pinned WHERE is_pinned = true
- `idx_project_notes_deleted_at` ON deleted_at WHERE deleted_at IS NULL

---

### 10. user_notes (User-Specific Private Notes)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Note ID |
| `user_id` | `uuid` | NOT NULL, FK → profiles(id) CASCADE | Owner user |
| `project_id` | `uuid` | NOT NULL, FK → projects(id) CASCADE | Project context |
| `title` | `text` | NOT NULL | Note title |
| `content` | `text` | NOT NULL | Note content (markdown) |
| `is_pinned` | `boolean` | NOT NULL, DEFAULT false | Pinned note |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update timestamp |
| `deleted_at` | `timestamptz` | | Soft delete timestamp |

**Indexes:**
- `idx_user_notes_user` ON user_id
- `idx_user_notes_project` ON project_id
- `idx_user_notes_pinned` ON user_id, is_pinned WHERE is_pinned = true
- `idx_user_notes_deleted_at` ON deleted_at WHERE deleted_at IS NULL

---

### 11. notifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Notification ID |
| `user_id` | `uuid` | NOT NULL, FK → profiles(id) CASCADE | Recipient |
| `project_id` | `uuid` | FK → projects(id) CASCADE | Project context (nullable) |
| `type` | `notification_type` | NOT NULL | MENTION, TASK_ASSIGNED, TASK_UPDATED, etc. |
| `title` | `text` | NOT NULL | Notification title |
| `message` | `text` | NOT NULL | Notification message |
| `action_url` | `text` | | Deep link URL |
| `action_label` | `text` | | Action button label |
| `metadata` | `jsonb` | NOT NULL DEFAULT '{}' | Flexible context data |
| `read_at` | `timestamptz` | | Read timestamp (null = unread) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `idx_notifications_user_read_created` ON user_id, read_at, created_at DESC
- `idx_notifications_project_user` ON project_id, user_id
- `idx_notifications_unread` ON user_id WHERE read_at IS NULL (partial)
- `idx_notifications_type` ON type

---

### 12. activity_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Log ID |
| `project_id` | `uuid` | FK → projects(id) CASCADE | Project context (nullable for global) |
| `user_id` | `uuid` | FK → profiles(id) SET NULL | Actor (nullable for system events) |
| `action` | `activity_action` | NOT NULL | Action type enum |
| `entity_type` | `entity_type` | NOT NULL | project, task, member, file, note, comment, user |
| `entity_id` | `uuid` | NOT NULL | Entity reference |
| `metadata` | `jsonb` | NOT NULL DEFAULT '{}' | Flexible context (prev/new values) |
| `ip_address` | `inet` | | Client IP |
| `user_agent` | `text` | | Client user agent |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Event timestamp |

**Indexes:**
- `idx_activity_logs_project_created` ON project_id, created_at DESC
- `idx_activity_logs_user_created` ON user_id, created_at DESC
- `idx_activity_logs_entity` ON entity_type, entity_id
- `idx_activity_logs_action` ON action

---

## Custom Types (Enums)

```sql
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
CREATE TYPE project_status AS ENUM ('ACTIVE', 'ARCHIVED', 'ON_HOLD');
CREATE TYPE project_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
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
CREATE TYPE activity_action AS ENUM (
    'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_ARCHIVED', 'PROJECT_DELETED',
    'TASK_CREATED', 'TASK_UPDATED', 'TASK_STATUS_CHANGED', 'TASK_ASSIGNED',
    'TASK_PRIORITY_CHANGED', 'TASK_DELETED',
    'MEMBER_INVITED', 'MEMBER_JOINED', 'MEMBER_ROLE_CHANGED', 'MEMBER_REMOVED',
    'FILE_UPLOADED', 'FILE_DOWNLOADED', 'FILE_DELETED',
    'NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_DELETED', 'NOTE_PRIVACY_CHANGED',
    'COMMENT_CREATED', 'COMMENT_UPDATED', 'COMMENT_DELETED',
    'USER_PROFILE_UPDATED', 'USER_AVATAR_CHANGED',
    'USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET'
);
CREATE TYPE entity_type AS ENUM ('project', 'task', 'member', 'file', 'note', 'comment', 'user');
```

---

## Relationships Diagram

```
profiles (1) ──< (N) projects (owner)
profiles (1) ──< (N) project_members (user)
projects (1) ──< (N) project_members (project)
projects (1) ──< (N) tasks
projects (1) ──< (N) project_files
projects (1) ──< (N) project_notes
profiles (1) ──< (N) tasks (assignee)
profiles (1) ──< (N) tasks (created_by)
profiles (1) ──< (N) tasks (reporter)
profiles (1) ──< (N) task_comments
profiles (1) ──< (N) task_attachments (uploaded_by)
profiles (1) ──< (N) project_files (uploaded_by)
profiles (1) ──< (N) user_files
profiles (1) ──< (N) project_notes (author)
profiles (1) ──< (N) user_notes
profiles (1) ──< (N) notifications
profiles (1) ──< (N) activity_logs (user)
projects (1) ──< (N) notifications
projects (1) ──< (N) activity_logs
tasks (1) ──< (N) task_comments
tasks (1) ──< (N) task_attachments
task_comments (1) ──< (N) task_comments (parent/thread)
project_files (1) ──< (N) task_attachments
```

---

## Cascade/Delete Behavior Summary

| Relationship | On Delete | Reason |
|--------------|-----------|--------|
| project_members → projects | CASCADE | Members deleted with project |
| project_members → profiles | CASCADE | Membership removed when user deleted |
| tasks → projects | CASCADE | Tasks deleted with project |
| task_comments → tasks | CASCADE | Comments deleted with task |
| task_attachments → tasks | CASCADE | Attachments deleted with task |
| task_attachments → project_files | CASCADE | Attachment link removed if file deleted |
| project_files → projects | CASCADE | Files deleted with project |
| user_files → profiles | CASCADE | Private files deleted with user |
| user_files → projects | CASCADE | Private files deleted with project |
| project_notes → projects | CASCADE | Notes deleted with project |
| user_notes → profiles | CASCADE | Private notes deleted with user |
| user_notes → projects | CASCADE | Private notes deleted with project |
| notifications → profiles | CASCADE | Notifications deleted with user |
| notifications → projects | CASCADE | Notifications deleted with project |
| activity_logs → projects | CASCADE | Activity deleted with project |
| activity_logs → profiles | SET NULL | Keep activity, nullify user reference |
| task_comments → task_comments (parent) | CASCADE | Thread deleted with parent |

---

## Soft Delete Strategy

Tables with soft delete (`deleted_at` column):
- `projects`
- `tasks`
- `task_comments`
- `project_files`
- `user_files`
- `project_notes`
- `user_notes`

**Implementation:**
- Partial unique indexes exclude soft-deleted rows
- Queries must filter `WHERE deleted_at IS NULL`
- Use views for clean access: `active_projects`, `active_tasks`, etc.

---

## Performance Optimizations

1. **Partial Indexes** - Only index active (non-deleted) rows
2. **Composite Indexes** - Match common query patterns
3. **Covering Indexes** - Include frequently selected columns
4. **Partitioning** - Consider partitioning `activity_logs` by month for large datasets
5. **Materialized Views** - For dashboard aggregates (task counts, progress)
6. **Connection Pooling** - Use Supabase PgBouncer (transaction mode)

---

## RLS Policy Summary

All tables have RLS enabled with policies for:
- **Project members** can access project-scoped data
- **Owners/Admins** have elevated permissions
- **Users** can only access their private data (user_files, user_notes)
- **System** (service_role) can insert activity_logs, notifications

See `RLS_POLICIES.md` for complete policy definitions.