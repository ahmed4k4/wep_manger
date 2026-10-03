# RBAC Team Management Implementation Plan

## Overview
Implement a professional Role-Based Access Control system for Team Management with roles: ADMIN, PROJECT_MANAGER, USER.

## Phase 1: Database & Migration
- [ ] Create safe migration to update existing roles to new RBAC system
- [ ] Add `role` column to profiles (global role)
- [ ] Update `project_members` to use new project roles: OWNER, ADMIN, MEMBER, VIEWER
- [ ] Add `status` column to profiles (active/inactive)
- [ ] Create permissions table/matrix

## Phase 2: Permission System
- [ ] Create `lib/permissions.ts` - Permission definitions and checking functions
- [ ] Create `lib/auth-utils.ts` - Authentication helpers (getUser, getSession)
- [ ] Create `lib/authorization.ts` - Authorization helpers (canAccess, canModify, etc.)
- [ ] Middleware to check permissions on all Server Actions/API routes

## Phase 3: Server Actions for Team Management
- [ ] `app/actions/team/get-team-members.ts` - List with filters (search, role, status, project)
- [ ] `app/actions/team/add-member.ts` - Add member to project
- [ ] `app/actions/team/remove-member.ts` - Remove member from project
- [ ] `app/actions/team/update-member-role.ts` - Change project role
- [ ] `app/actions/team/get-member-workload.ts` - View member workload
- [ ] `app/actions/admin/create-user.ts` - Admin create user
- [ ] `app/actions/admin/update-user.ts` - Admin update user
- [ ] `app/actions/admin/disable-user.ts` - Admin disable user
- [ ] `app/actions/admin/reset-password.ts` - Admin reset password
- [ ] `app/actions/admin/change-user-role.ts` - Admin change global role

## Phase 4: User Profile Server Actions
- [ ] `app/actions/user/get-user-profile.ts` - Get full user profile with stats
- [ ] `app/actions/user/get-assigned-projects.ts`
- [ ] `app/actions/user/get-assigned-tasks.ts`
- [ ] `app/actions/user/get-completed-tasks.ts`
- [ ] `app/actions/user/get-overdue-tasks.ts`

## Phase 5: Team Page UI
- [ ] `components/team/TeamPage.tsx` - Main team page with tabs
- [ ] `components/team/TeamTable.tsx` - Searchable, filterable table
- [ ] `components/team/TeamFilters.tsx` - Search, role, status, project filters
- [ ] `components/team/MemberDetailModal.tsx` - Member details drawer/modal
- [ ] `components/team/AddMemberDialog.tsx` - Add member dialog
- [ ] `components/team/ChangeRoleDialog.tsx` - Change role dialog

## Phase 6: User Profile Page UI
- [ ] `app/[locale]/(dashboard)/team/[userId]/page.tsx` - User profile page
- [ ] `components/user/UserProfileHeader.tsx` - Avatar, name, email, role, joined date
- [ ] `components/user/UserStats.tsx` - Assigned projects, tasks, completed, overdue
- [ ] `components/user/UserProjectsList.tsx` - Assigned projects
- [ ] `components/user/UserTasksList.tsx` - Assigned tasks with filters

## Phase 7: Admin Panel
- [ ] `app/[locale]/(dashboard)/admin/users/page.tsx` - Admin user management
- [ ] `components/admin/UserManagementTable.tsx`
- [ ] `components/admin/CreateUserDialog.tsx`
- [ ] `components/admin/ResetPasswordDialog.tsx`

## Phase 8: Security & Testing
- [ ] Audit all existing Server Actions for permission checks
- [ ] Add permission checks to project/task/file operations
- [ ] Test all permission scenarios
- [ ] Verify RLS policies align with RBAC

## Migration Strategy (Safe)
Current roles in project_members: OWNER, ADMIN, MEMBER, VIEWER
New global roles in profiles: ADMIN, PROJECT_MANAGER, USER

Mapping:
- Existing OWNER/ADMIN in any project → PROJECT_MANAGER (or ADMIN if super admin)
- Existing MEMBER/VIEWER → USER
- First user / explicit admin → ADMIN

The migration will:
1. Add `global_role` column to profiles with default 'USER'
2. Add `status` column to profiles with default 'active'
3. Update existing users based on project membership
4. Keep project_members roles unchanged (they're project-specific)