# Entity Relationship Diagram (Text Representation)

## Visual ERD

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        DATABASE SCHEMA                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────────┐       ┌──────────────────────┐
│  profiles    │       │    projects      │       │   project_members    │
├──────────────┤       ├──────────────────┤       ├──────────────────────┤
│ PK id        │◄──────│ PK id            │──────►│ PK id                │
│ email (UQ)   │       │ name             │       │ FK project_id ──────►│
│ full_name    │       │ key (UQ)         │       │ FK user_id ─────────►│
│ avatar_url   │       │ description      │       │ role                 │
│ role         │       │ status           │       │ joined_at            │
│ locale       │       │ FK owner_id ─────►│       │ invited_by           │
│ theme        │       │ created_at       │       │ invited_at           │
│ notif_prefs  │       │ updated_at       │       │ accepted_at          │
│ created_at   │       │ deleted_at       │       └──────────────────────┘
│ updated_at   │       └────────┬─────────┘                ▲
└──────────────┘                │                        │
        │                       │                        │
        │              ┌────────┴────────┐                │
        │              │                 │                │
        ▼              ▼                 ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    tasks     │ │ project_files│ │project_notes │ │  notifications │
├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│ PK id        │ │ PK id        │ │ PK id        │ │ PK id        │
│ FK project_id│ │ FK project_id│ │ FK project_id│ │ FK user_id   │
│ title        │ │ FK uploaded_ │ │ FK author_id │ │ FK project_id│
│ description  │ │   _by        │ │ title        │ │ type         │
│ status       │ │ name         │ │ content      │ │ title        │
│ priority     │ │ storage_path │ │ is_pinned    │ │ message      │
│ progress     │ │ mime_type    │ │ created_at   │ │ action_url   │
│ FK assignee_ │ │ size         │ │ updated_at   │ │ action_label │
│   _id        │ │ checksum     │ │ deleted_at   │ │ metadata     │
│ FK created_  │ │ description  │ └──────────────┘ │ read_at      │
│   _by        │ │ created_at   │                 │ created_at   │
│ FK reporter_ │ │ updated_at   │                 └──────────────┘
│   _id        │ │ deleted_at   │
│ start_date   │ └──────────────┘
│ due_date     │
│ completed_at │
│ position     │
│ created_at   │
│ updated_at   │
│ deleted_at   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐       ┌──────────────────┐
│  task_comments   │       │ task_attachments │
├──────────────────┤       ├──────────────────┤
│ PK id            │       │ PK id            │
│ FK task_id ──────┼──────►│ FK task_id       │
│ FK user_id       │       │ FK file_id ──────┼──► project_files
│ content          │       │ FK uploaded_by   │
│ FK parent_id     │       │ created_at       │
│ is_system        │       └──────────────────┘
│ created_at       │
│ updated_at       │
│ deleted_at       │
└──────────────────┘

┌──────────────┐       ┌──────────────┐
│  user_files  │       │  user_notes  │
├──────────────┤       ├──────────────┤
│ PK id        │       │ PK id        │
│ FK user_id   │       │ FK user_id   │
│ FK project_id│       │ FK project_id│
│ name         │       │ title        │
│ storage_path │       │ content      │
│ mime_type    │       │ is_pinned    │
│ size         │       │ created_at   │
│ checksum     │       │ updated_at   │
│ description  │       │ deleted_at   │
│ created_at   │       └──────────────┘
│ updated_at   │
│ deleted_at   │
└──────────────┘

┌──────────────────┐
│  activity_logs   │
├──────────────────┤
│ PK id            │
│ FK project_id    │
│ FK user_id       │
│ action           │
│ entity_type      │
│ entity_id        │
│ metadata         │
│ ip_address       │
│ user_agent       │
│ created_at       │
└──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         RELATIONSHIPS                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

profiles 1 ──────< N projects          (owner)
profiles 1 ──────< N project_members   (user)
projects 1 ──────< N project_members   (project)
projects 1 ──────< N tasks
projects 1 ──────< N project_files
projects 1 ──────< N project_notes
projects 1 ──────< N notifications
projects 1 ──────< N activity_logs

profiles 1 ──────< N tasks             (assignee)
profiles 1 ──────< N tasks             (created_by)
profiles 1 ──────< N tasks             (reporter)
profiles 1 ──────< N task_comments
profiles 1 ──────< N task_attachments  (uploaded_by)
profiles 1 ──────< N project_files     (uploaded_by)
profiles 1 ──────< N user_files
profiles 1 ──────< N project_notes     (author)
profiles 1 ──────< N user_notes
profiles 1 ──────< N notifications
profiles 1 ──────< N activity_logs     (user)

tasks    1 ──────< N task_comments
tasks    1 ──────< N task_attachments
task_comments 1 ──< N task_comments   (parent/thread)
project_files 1 ──< N task_attachments
user_files    N ──< 1 profiles         (user)
user_files    N ──< 1 projects         (project)
user_notes    N ──< 1 profiles         (user)
user_notes    N ──< 1 projects         (project)


┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          ENUMS                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

user_role        ::= 'ADMIN' | 'USER'
project_status   ::= 'ACTIVE' | 'ARCHIVED' | 'ON_HOLD'
project_role     ::= 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
task_status      ::= 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'COMPLETED'
task_priority    ::= 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
notification_type::= 'MENTION' | 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'TASK_STATUS_CHANGED' 
                  |  'TASK_COMMENT' | 'TASK_DUE_SOON' | 'TASK_OVERDUE' | 'PROJECT_INVITE'
                  |  'PROJECT_UPDATED' | 'MEMBER_ADDED' | 'MEMBER_ROLE_CHANGED'
                  |  'FILE_UPLOADED' | 'NOTE_CREATED' | 'NOTE_COMMENT' | 'NOTE_MENTION'
                  |  'SYSTEM_ALERT'
activity_action  ::= 'PROJECT_CREATED' | 'PROJECT_UPDATED' | 'PROJECT_ARCHIVED' | 'PROJECT_DELETED'
                  |  'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_STATUS_CHANGED' | 'TASK_ASSIGNED'
                  |  'TASK_PRIORITY_CHANGED' | 'TASK_DELETED'
                  |  'MEMBER_INVITED' | 'MEMBER_JOINED' | 'MEMBER_ROLE_CHANGED' | 'MEMBER_REMOVED'
                  |  'FILE_UPLOADED' | 'FILE_DOWNLOADED' | 'FILE_DELETED'
                  |  'NOTE_CREATED' | 'NOTE_UPDATED' | 'NOTE_DELETED' | 'NOTE_PRIVACY_CHANGED'
                  |  'COMMENT_CREATED' | 'COMMENT_UPDATED' | 'COMMENT_DELETED'
                  |  'USER_PROFILE_UPDATED' | 'USER_AVATAR_CHANGED'
                  |  'USER_LOGIN' | 'USER_LOGOUT' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET'
entity_type      ::= 'project' | 'task' | 'member' | 'file' | 'note' | 'comment' | 'user'


┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        KEY CONSTRAINTS                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

PRIMARY KEYS:
  profiles(id), projects(id), project_members(id), tasks(id), task_comments(id),
  task_attachments(id), project_files(id), user_files(id), project_notes(id),
  user_notes(id), notifications(id), activity_logs(id)

FOREIGN KEYS:
  profiles.id → auth.users(id)
  projects.owner_id → profiles(id)
  project_members.project_id → projects(id) CASCADE
  project_members.user_id → profiles(id) CASCADE
  project_members.invited_by → profiles(id)
  tasks.project_id → projects(id) CASCADE
  tasks.assignee_id → profiles(id) SET NULL
  tasks.created_by → profiles(id)
  tasks.reporter_id → profiles(id)
  task_comments.task_id → tasks(id) CASCADE
  task_comments.user_id → profiles(id) CASCADE
  task_comments.parent_id → task_comments(id) CASCADE
  task_attachments.task_id → tasks(id) CASCADE
  task_attachments.file_id → project_files(id) CASCADE
  task_attachments.uploaded_by → profiles(id) CASCADE
  project_files.project_id → projects(id) CASCADE
  project_files.uploaded_by → profiles(id) CASCADE
  user_files.user_id → profiles(id) CASCADE
  user_files.project_id → projects(id) CASCADE
  project_notes.project_id → projects(id) CASCADE
  project_notes.author_id → profiles(id) CASCADE
  user_notes.user_id → profiles(id) CASCADE
  user_notes.project_id → projects(id) CASCADE
  notifications.user_id → profiles(id) CASCADE
  notifications.project_id → projects(id) CASCADE
  activity_logs.project_id → projects(id) CASCADE
  activity_logs.user_id → profiles(id) SET NULL

UNIQUE CONSTRAINTS:
  profiles.email
  projects.key
  project_members(project_id, user_id)        -- Prevents duplicate membership
  project_files.storage_path
  user_files.storage_path
  task_attachments(task_id, file_id)

CHECK CONSTRAINTS:
  tasks.progress BETWEEN 0 AND 100
  tasks.due_date >= tasks.start_date
  projects.key ~ '^[A-Z][A-Z0-9]{1,9}$'

PARTIAL UNIQUE INDEXES (exclude soft-deleted):
  projects(key) WHERE deleted_at IS NULL
  tasks(project_id, position) WHERE deleted_at IS NULL


┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        KEY INDEXES                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

profiles:
  - idx_profiles_email (UNIQUE) ON email
  - idx_profiles_role ON role

projects:
  - idx_projects_owner ON owner_id
  - idx_projects_status ON status
  - idx_projects_key (UNIQUE) ON key
  - idx_projects_deleted_at ON deleted_at WHERE deleted_at IS NULL

project_members:
  - idx_project_members_project ON project_id
  - idx_project_members_user ON user_id
  - uq_project_members_unique (UNIQUE) ON (project_id, user_id)

tasks:
  - idx_tasks_project ON project_id
  - idx_tasks_assignee ON assignee_id
  - idx_tasks_status ON status
  - idx_tasks_priority ON priority
  - idx_tasks_due_date ON due_date
  - idx_tasks_position ON project_id, position
  - idx_tasks_deleted_at ON deleted_at WHERE deleted_at IS NULL
  - idx_tasks_project_status ON project_id, status
  - idx_tasks_assignee_status ON assignee_id, status

task_comments:
  - idx_task_comments_task ON task_id
  - idx_task_comments_user ON user_id
  - idx_task_comments_parent ON parent_id
  - idx_task_comments_deleted_at ON deleted_at WHERE deleted_at IS NULL

task_attachments:
  - idx_task_attachments_task ON task_id
  - idx_task_attachments_file ON file_id
  - uq_task_attachments_unique (UNIQUE) ON (task_id, file_id)

project_files:
  - idx_project_files_project ON project_id
  - idx_project_files_uploaded_by ON uploaded_by
  - idx_project_files_mime_type ON mime_type
  - idx_project_files_deleted_at ON deleted_at WHERE deleted_at IS NULL

user_files:
  - idx_user_files_user ON user_id
  - idx_user_files_project ON project_id
  - idx_user_files_deleted_at ON deleted_at WHERE deleted_at IS NULL

project_notes:
  - idx_project_notes_project ON project_id
  - idx_project_notes_author ON author_id
  - idx_project_notes_pinned ON project_id, is_pinned WHERE is_pinned = true
  - idx_project_notes_deleted_at ON deleted_at WHERE deleted_at IS NULL

user_notes:
  - idx_user_notes_user ON user_id
  - idx_user_notes_project ON project_id
  - idx_user_notes_pinned ON user_id, is_pinned WHERE is_pinned = true
  - idx_user_notes_deleted_at ON deleted_at WHERE deleted_at IS NULL

notifications:
  - idx_notifications_user_read_created ON user_id, read_at, created_at DESC
  - idx_notifications_project_user ON project_id, user_id
  - idx_notifications_unread ON user_id WHERE read_at IS NULL
  - idx_notifications_type ON type

activity_logs:
  - idx_activity_logs_project_created ON project_id, created_at DESC
  - idx_activity_logs_user_created ON user_id, created_at DESC
  - idx_activity_logs_entity ON entity_type, entity_id
  - idx_activity_logs_action ON action


┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CASCADE / DELETE BEHAVIOR                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┬────────────┬──────────────────────────────────────────────┐
│ Relationship                     │ On Delete  │ Reason                                       │
├──────────────────────────────────┼────────────┼──────────────────────────────────────────────┤
│ project_members → projects       │ CASCADE    │ Members deleted with project                 │
│ project_members → profiles       │ CASCADE    │ Membership removed when user deleted         │
│ tasks → projects                 │ CASCADE    │ Tasks deleted with project                   │
│ task_comments → tasks            │ CASCADE    │ Comments deleted with task                   │
│ task_attachments → tasks         │ CASCADE    │ Attachments deleted with task                │
│ task_attachments → project_files │ CASCADE    │ Attachment link removed if file deleted      │
│ project_files → projects         │ CASCADE    │ Files deleted with project                   │
│ user_files → profiles            │ CASCADE    │ Private files deleted with user              │
│ user_files → projects            │ CASCADE    │ Private files deleted with project           │
│ project_notes → projects         │ CASCADE    │ Notes deleted with project                   │
│ user_notes → profiles            │ CASCADE    │ Private notes deleted with user              │
│ user_notes → projects            │ CASCADE    │ Private notes deleted with project           │
│ notifications → profiles         │ CASCADE    │ Notifications deleted with user              │
│ notifications → projects         │ CASCADE    │ Notifications deleted with project           │
│ activity_logs → projects         │ CASCADE    │ Activity deleted with project                │
│ activity_logs → profiles         │ SET NULL   │ Keep activity, nullify user reference        │
│ task_comments → task_comments    │ CASCADE    │ Thread deleted with parent                   │
└──────────────────────────────────┴────────────┴──────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SOFT DELETE TABLES                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

Tables with soft delete (deleted_at column):
  ✓ projects
  ✓ tasks
  ✓ task_comments
  ✓ project_files
  ✓ user_files
  ✓ project_notes
  ✓ user_notes

Tables WITHOUT soft delete (hard delete):
  ✗ profiles           (synced with auth.users)
  ✗ project_members    (membership is binary)
  ✗ task_attachments   (join table)
  ✗ notifications      (notification lifecycle)
  ✗ activity_logs      (audit trail must persist)


┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     ACCESS PATTERNS                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

Common Queries & Supporting Indexes:

1. "Get user's projects"
   → project_members(user_id) + projects(deleted_at IS NULL)
   → idx_project_members_user + idx_projects_deleted_at

2. "Get project tasks by status (Kanban board)"
   → tasks(project_id, status, deleted_at IS NULL) ORDER BY position
   → idx_tasks_project_status + idx_tasks_position

3. "Get user's assigned tasks"
   → tasks(assignee_id, status, deleted_at IS NULL)
   → idx_tasks_assignee_status

4. "Get task with comments"
   → task_comments(task_id, deleted_at IS NULL) ORDER BY created_at
   → idx_task_comments_task + idx_task_comments_deleted_at

5. "Get project files"
   → project_files(project_id, deleted_at IS NULL)
   → idx_project_files_project + idx_project_files_deleted_at

6. "Get user's private files in project"
   → user_files(user_id, project_id, deleted_at IS NULL)
   → idx_user_files_user + idx_user_files_project

7. "Get user notifications (unread first)"
   → notifications(user_id) ORDER BY read_at NULLS FIRST, created_at DESC
   → idx_notifications_user_read_created

8. "Get project activity feed"
   → activity_logs(project_id) ORDER BY created_at DESC
   → idx_activity_logs_project_created

9. "Get user activity across projects"
   → activity_logs(user_id) ORDER BY created_at DESC
   → idx_activity_logs_user_created

10. "Get entity history"
    → activity_logs(entity_type, entity_id) ORDER BY created_at DESC
    → idx_activity_logs_entity


┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PERFORMANCE CONSIDERATIONS                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

1. PARTITIONING STRATEGY (for large datasets):
   activity_logs: Partition by month (created_at)
   notifications: Partition by month (created_at)

2. MATERIALIZED VIEWS (refresh hourly):
   - project_task_stats: project_id, total, by_status, by_priority, avg_progress
   - user_workload: user_id, assigned_count, overdue_count, by_priority

3. CONNECTION POOLING:
   Use Supabase PgBouncer in transaction mode
   Max connections: 100 per pool

4. QUERY OPTIMIZATION:
   - Always filter deleted_at IS NULL for soft-delete tables
   - Use LIMIT with ORDER BY created_at DESC for feeds
   - Prefer composite indexes over single-column
   - Use EXPLAIN ANALYZE for slow queries

5. ARCHIVING:
   - Archive projects older than 2 years to cold storage
   - Archive activity_logs older than 1 year to partitioned table
   - Keep notifications for 90 days, then soft-delete