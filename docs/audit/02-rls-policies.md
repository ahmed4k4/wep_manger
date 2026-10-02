# RLS Policies Audit (Database & Storage)

## Overview

**Files Audited**:
- `docs/database/migrations.sql` (database RLS policies)
- `docs/architecture/07-supabase-rls-policies.md` (documentation & storage policies)

**Tables with RLS**: 12/12 ✅  
**Storage Buckets**: 3 (project-files, user-files, avatars)

## Assessment: PASS with Minor Concerns

### Database RLS Policy Coverage

| Table | SELECT | INSERT | UPDATE | DELETE | Service Role |
|-------|--------|--------|--------|--------|--------------|
| profiles | ✅ | ❌ | ✅ | ❌ | ✅ |
| projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| project_members | ✅ | ✅ | ✅ | ✅ | ✅ |
| tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| task_comments | ✅ | ✅ | ✅ | ✅ | ✅ |
| task_attachments | ✅ | ✅ | ❌ | ✅ | ✅ |
| project_files | ✅ | ✅ | ✅ | ✅ | ✅ |
| user_files | ✅ | ✅ | ✅ | ✅ | ✅ |
| project_notes | ✅ | ✅ | ✅ | ✅ | ✅ |
| user_notes | ✅ | ✅ | ✅ | ✅ | ✅ |
| notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| activity_logs | ✅ | ✅ | ❌ | ❌ | ✅ |

### Policy Quality Analysis

#### ✅ Strengths

1. **All Tables Have RLS Enabled** - Including the DO block at end ensuring coverage
2. **Service Role Policies** - Every table has `auth.role() = 'service_role'` policy for system operations
3. **Default Deny** - Explicit allow policies only (PostgreSQL default)
4. **Project Membership Checks** - Consistent pattern using `EXISTS (SELECT 1 FROM project_members...)`
5. **Admin Bypass** - Global ADMIN role can access all projects (cross-project visibility)
6. **Ownership Tracking** - Policies distinguish between owner, admin, member, viewer roles
7. **Soft Delete Awareness** - SELECT policies filter `deleted_at IS NULL`
8. **Storage Policies Documented** - Comprehensive storage bucket policies in architecture doc

#### ⚠️ Issues Found

| Severity | Table/Policy | Issue | Impact |
|----------|--------------|-------|--------|
| **MEDIUM** | `task_attachments` | Missing UPDATE policy | Attachments can't be modified (may be intentional) |
| **MEDIUM** | `activity_logs` | No UPDATE/DELETE policies | Immutable by design - OK if intentional |
| **LOW** | `profiles` | No INSERT policy | Relies on auth trigger - OK |
| **LOW** | `notifications` | INSERT only via service_role | App can't create notifications directly - OK |
| **LOW** | `project_members` | No `deleted_at` column | Can't soft-delete memberships |

#### Policy Logic Verification

**Projects - SELECT:**
```sql
-- Members + Owner + Admin can view
-- ✅ Correct: Includes admin bypass
```

**Tasks - UPDATE:**
```sql
-- Owner/Admin/Assignee/Creator + Admin
-- ✅ Correct: Assignee can update their tasks
```

**Task Comments - SELECT:**
```sql
-- Subquery to get project_id from tasks
-- ⚠️ PERFORMANCE: Correlated subquery per row
-- Recommendation: Add project_id denormalized column or use JOIN
```

**User Files - SELECT:**
```sql
-- Only owner (user_id = auth.uid())
-- ✅ Correct: Private files isolated
```

**User Notes - SELECT:**
```sql
-- Only owner
-- ✅ Correct: Private notes isolated
```

### Storage Policies

#### Buckets Configuration

| Bucket | Public | Path Pattern | Use Case |
|--------|--------|--------------|----------|
| project-files | false | `{project_id}/{file_id}/{filename}` | Shared project files |
| user-files | false | `{user_id}/{project_id}/{file_id}/{filename}` | Private user files |
| avatars | true | `{user_id}/{filename}` | Profile pictures |

#### Storage Policy Analysis

**project-files:**
```sql
-- SELECT: Project members can view
-- ✅ Uses storage.foldername(name))[1]::uuid to extract project_id
-- ✅ Checks project_members table

-- INSERT: Project members (OWNER, ADMIN, MEMBER) can upload
-- ✅ Role check included

-- UPDATE/DELETE: Uploader or project ADMIN/OWNER
-- ✅ Proper ownership + admin override
```

**user-files:**
```sql
-- ALL: Only owner (folder name = user_id)
-- ✅ Simple and secure: (storage.foldername(name))[1] = auth.uid()::text
```

**avatars:**
```sql
-- SELECT: Public read
-- INSERT/UPDATE/DELETE: Own folder only
-- ✅ Standard avatar pattern
```

### Cross-Table Consistency

**Pattern Compliance:**
- ✅ All policies use `auth.uid()` for user identification
- ✅ Admin bypass uses `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')`
- ✅ Project membership checks consistent across tables
- ✅ Role hierarchy respected (OWNER > ADMIN > MEMBER > VIEWER)

**Inconsistencies:**
- Some policies use `project_members` subquery, others join through parent table
- `task_comments` uses correlated subquery (performance concern)
- `activity_logs` allows `project_id IS NULL` for system-wide logs

### Testing Coverage (from architecture doc)

The architecture document includes:
- Manual test cases with `SET ROLE` and `SET request.jwt.claims`
- Automated test structure using `@supabase/supabase-js`
- Policy debugging queries

**Missing:** CI/CD integration for automated RLS testing

### Recommendations

| Priority | Action |
|----------|--------|
| **HIGH** | Add `project_id` column to `task_comments` to avoid correlated subquery |
| **HIGH** | Add `project_id` column to `task_attachments` for same reason |
| **MEDIUM** | Implement automated RLS tests in CI pipeline |
| **MEDIUM** | Add `deleted_at` to `project_members` for membership history |
| **LOW** | Document policy intent more explicitly in migration comments |
| **LOW** | Consider policy for `task_attachments` UPDATE (if needed) |

### Storage Security Verification

✅ **No public access** to project-files or user-files buckets  
✅ **Signed URLs required** for all downloads (verified in file actions)  
✅ **Path-based isolation** using folder structure  
✅ **Avatar bucket public read** - acceptable for profile pictures  

---

**Verdict**: **PASS** - RLS policies are comprehensive and secure. Minor performance optimizations and testing automation needed.