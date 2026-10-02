# Database Schema & Migrations Audit

## Overview

**File**: `docs/database/migrations.sql`  
**Tables**: 12 core tables + 2 materialized views + 7 views  
**Enums**: 9 custom types  
**Indexes**: 40+  
**RLS Policies**: 40+  
**Triggers**: 10+

## Schema Quality Assessment: PASS

### Strengths

1. **Proper Normalization** - Clean 3NF design with clear entity separation
2. **UUID Primary Keys** - All tables use `gen_random_uuid()` for security
3. **Soft Delete Pattern** - Consistent `deleted_at` timestamp with partial indexes
4. **Comprehensive Constraints** - CHECK constraints, UNIQUE constraints, FK with CASCADE/SET NULL
5. **Audit Trail** - `created_at`/`updated_at` on all tables with auto-update triggers
6. **Materialized Views** - Pre-computed stats for dashboards (project_task_stats, user_workload)
7. **Helper Functions** - Database-level permission checks (`get_user_project_role`, `has_project_permission`)
8. **Realtime Ready** - Publication configured for notifications, tasks, comments, activity
9. **Security Definer Functions** - Properly secured helper functions

### Table Inventory

| Table | Purpose | RLS | Soft Delete | Indexes |
|-------|---------|-----|-------------|---------|
| `profiles` | User profiles (synced from auth) | ✅ | ❌ | 2 |
| `projects` | Project containers | ✅ | ✅ | 4 |
| `project_members` | Project membership & roles | ✅ | ❌ | 2 |
| `tasks` | Project tasks | ✅ | ✅ | 10 |
| `task_comments` | Task discussions (threaded) | ✅ | ✅ | 4 |
| `task_attachments` | Task-file many-to-many | ✅ | ❌ | 2 |
| `project_files` | Shared project files | ✅ | ✅ | 4 |
| `user_files` | Private user files per project | ✅ | ✅ | 3 |
| `project_notes` | Shared project notes | ✅ | ✅ | 4 |
| `user_notes` | Private user notes per project | ✅ | ✅ | 4 |
| `notifications` | User notifications | ✅ | ❌ | 4 |
| `activity_logs` | Audit trail | ✅ | ❌ | 4 |

### Enum Definitions

```sql
user_role: ADMIN | USER
project_status: ACTIVE | ARCHIVED | ON_HOLD
project_role: OWNER | ADMIN | MEMBER | VIEWER
task_status: TODO | IN_PROGRESS | REVIEW | BLOCKED | COMPLETED
task_priority: LOW | MEDIUM | HIGH | URGENT
notification_type: 18 types (MENTION, TASK_ASSIGNED, etc.)
activity_action: 30 types (PROJECT_CREATED, TASK_UPDATED, etc.)
entity_type: project | task | member | file | note | comment | user
```

### Critical Constraints

1. **Single Owner per Project** - Trigger `enforce_single_owner()` prevents multiple OWNER roles
2. **Project Key Format** - Regex `^[A-Z][A-Z0-9]{1,9}$` enforced
3. **Task Dates** - `due_date >= start_date` when both present
4. **Progress Range** - `0-100` enforced at DB level
5. **Unique Membership** - `(project_id, user_id)` unique
6. **Unique Attachments** - `(task_id, file_id)` unique

### Indexing Strategy

**Well-Designed Indexes:**
- Partial indexes on `deleted_at IS NULL` for soft-delete tables
- Composite indexes for common query patterns:
  - `idx_tasks_project_status` (project_id, status)
  - `idx_tasks_assignee_status` (assignee_id, status)
  - `idx_notifications_user_read_created` (user_id, read_at, created_at DESC)
  - `idx_activity_logs_project_created` (project_id, created_at DESC)
- Trigram extension for full-text search readiness

**Missing Indexes (Minor):**
- `idx_profiles_email` (though UNIQUE constraint covers it)
- Composite index on `task_comments(task_id, parent_id)` for threaded queries

### Materialized Views

```sql
-- project_task_stats: Dashboard statistics per project
-- user_workload: Assigned task counts per user
-- Refresh via: refresh_materialized_views() (CONCURRENTLY)
```

**Concerns:**
- No automatic refresh mechanism (needs pg_cron or application-level trigger)
- No last_refresh tracking column

### Migration Quality

| Aspect | Status | Notes |
|--------|--------|-------|
| Idempotency | ✅ | Uses `IF NOT EXISTS`, `CREATE OR REPLACE` |
| Rollback Plan | ⚠️ | No DOWN migrations documented |
| Data Migration | N/A | Fresh install only |
| Extension Management | ✅ | uuid-ossp, pgcrypto, pg_trgm |
| Commenting | ✅ | Well-documented sections |

### Issues Found

| Severity | Issue | Recommendation |
|----------|-------|----------------|
| **LOW** | No automatic materialized view refresh | Add pg_cron job or trigger-based refresh |
| **LOW** | `project_members` lacks `deleted_at` | Add soft delete for membership history |
| **LOW** | No `updated_at` trigger on `activity_logs` | Not critical (immutable), but inconsistent |
| **INFO** | `NOT NULL` on `project_members.joined_at` | Should default to `now()` (already does) |

### Recommendations

1. **Add pg_cron** for materialized view refresh (every 5-15 min)
2. **Add `deleted_at` to `project_members`** for membership audit trail
3. **Document rollback procedures** for each migration
4. **Consider partitioning** `activity_logs` by date for large datasets
5. **Add `last_refresh` column** to materialized views for monitoring

---

**Verdict**: **PASS** - Production-ready schema with excellent foundations. Minor improvements identified for operational maturity.