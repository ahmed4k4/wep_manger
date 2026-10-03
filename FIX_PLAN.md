# Projects System Fix Plan

## Issues Identified

### 1. chk_projects_key_format Constraint Violation
**Root Cause**: The project key format is `^[A-Z][A-Z0-9]{1,9}$` (uppercase letter + 1-9 alphanumeric = 2-10 chars total). The CreateProjectButton.tsx validation appears correct but may have edge cases with certain Unicode inputs or race conditions.

### 2. "Failed to load projects" Error
**Root Cause**: The RLS policy "Members can view active projects" uses `public.is_project_member()` function which queries `project_members` table. However, the `project_members` SELECT policy restricts MEMBER/VIEWER roles from seeing other members' records. This breaks the profiles join in `getUserProjects` when fetching owner information.

**RLS Policy Chain Issue**:
- Projects SELECT policy calls `is_project_member(id, auth.uid())`
- Function queries `project_members` table
- project_members RLS policy only allows OWNER/ADMIN to see other members
- Profiles join in getUserProjects needs to see owner's profile
- Profiles policy "Members can view profiles in shared projects" joins project_members
- But project_members RLS blocks MEMBER/VIEWER from seeing owner's membership record

### 3. RLS Policy Issues
- `is_admin()` function has potential circular dependency with profiles RLS
- `is_project_member()` function may not bypass RLS properly
- project_members SELECT policy too restrictive for collaboration features

## Fixes Needed

### Frontend (TypeScript)
1. **CreateProjectButton.tsx**: Strengthen key generation and validation
2. **ProjectsList.tsx**: Handle RLS join errors gracefully

### Database (SQL - to be applied via migration)
1. **Fix project_members SELECT policy**: Allow all project members to see other members
2. **Fix projects SELECT policy**: Use direct check instead of helper function to avoid recursion
3. **Fix profiles SELECT policy**: Ensure it works with updated project_members policy

### Testing
1. Test project creation with various key formats
2. Test project listing for different user roles
3. Test page refresh persistence
4. Test Arabic/English locales
5. Run npm run build