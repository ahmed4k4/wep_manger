/**
 * Dashboard Data Server Actions
 * Fetches all data needed for the Professional Project Management Dashboard
 *
 * Performance:
 * All section functions share two request-scoped React `cache()` helpers:
 *   - getUserContext()          -> user + role checks (single resolution)
 *   - getAccessibleProjectIds() -> member + owner project ids (single resolution)
 *
 * Previously EVERY section re-ran the same two membership/owner queries, so a
 * single dashboard load issued ~16 duplicate queries. They are now resolved once
 * per request and reused. Counts are also scoped to the accessible projects for
 * non-admins (they were previously global, which was both slow and incorrect).
 */

'use server';

import { cache } from 'react';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/db/supabase-server';
import { getCurrentUser, checkIsAdmin, checkIsProjectManager, requireAuth } from '@/lib/authorization';
import type { ProjectStatus, TaskStatus, TaskPriority, ProjectRole, Profile, Project, Task } from '@/types/project';

// ============================================================================
// Types
// ============================================================================

export interface DashboardKPIs {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  archived_projects: number;
  total_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  team_members: number;
  total_files: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TasksByStatusData {
  TODO: number;
  IN_PROGRESS: number;
  REVIEW: number;
  BLOCKED: number;
  COMPLETED: number;
}

export interface TasksByPriorityData {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  URGENT: number;
}

export interface ProjectProgressData {
  project_id: string;
  project_name: string;
  project_key: string;
  progress: number;
  total_tasks: number;
  completed_tasks: number;
}

export interface CompletionTrendData {
  date: string;
  completed: number;
  created: number;
}

export interface TeamWorkloadData {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  assigned_count: number;
  todo_count: number;
  in_progress_count: number;
  overdue_count: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  project?: {
    id: string;
    name: string;
    key: string;
  };
  metadata?: Record<string, unknown>;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  due_date: string;
  type: 'task' | 'project';
  project_id: string;
  project_name: string;
  project_key: string;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface OverdueItem {
  id: string;
  title: string;
  due_date: string;
  type: 'task' | 'project';
  project_id: string;
  project_name: string;
  project_key: string;
  days_overdue: number;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface MyWorkData {
  assigned_tasks: TaskWithMinimalRelations[];
  today_tasks: TaskWithMinimalRelations[];
  overdue_tasks: TaskWithMinimalRelations[];
  upcoming_tasks: TaskWithMinimalRelations[];
}

export interface TaskWithMinimalRelations {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  progress: number;
  project: Pick<Project, 'id' | 'name' | 'key'>;
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

export interface DashboardResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ============================================================================
// Shared, request-scoped context
// ============================================================================

// Cached per request: resolve the user + global role checks exactly once.
const getUserContext = cache(async () => {
  const user = await requireAuth();
  const isAdmin = await checkIsAdmin(user.id);
  const isPM = await checkIsProjectManager(user.id);

  return { user, isAdmin, isPM };
});

// Cached per request: the set of project ids accessible to the current user
// (member of, or owner of). Admins get `isAdmin: true` and an empty id list
// because admin queries do not need an `in (...)` filter.
const getAccessibleProjectIds = cache(
  async (): Promise<{ isAdmin: boolean; projectIds: string[] }> => {
    const { user, isAdmin } = await getUserContext();
    if (isAdmin) return { isAdmin: true, projectIds: [] };

    const supabase = await createSupabaseServerClient();
    const [{ data: memberships }, { data: ownerProjects }] = await Promise.all([
      supabase.from('project_members').select('project_id').eq('user_id', user.id),
      supabase.from('projects').select('id').eq('owner_id', user.id).is('deleted_at', null),
    ]);

    const projectIds = [
      ...new Set([
        ...(memberships?.map((m) => m.project_id) || []),
        ...(ownerProjects?.map((p) => p.id) || []),
      ]),
    ];

    return { isAdmin: false, projectIds };
  }
);

// Pick the correct Supabase client for the current user without re-resolving
// the role: admins use the service client (bypasses RLS for global stats).
async function getScopedClient(isAdmin: boolean) {
  return isAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();
}

// ============================================================================
// KPIs
// ============================================================================

export async function getDashboardKPIs(): Promise<DashboardResponse<DashboardKPIs>> {
  const empty: DashboardKPIs = {
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    archived_projects: 0,
    total_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    overdue_tasks: 0,
    team_members: 0,
    total_files: 0,
  };

  try {
    const { isAdmin, projectIds } = await getAccessibleProjectIds();
    if (!isAdmin && projectIds.length === 0) {
      return { success: true, data: empty };
    }

    const supabase = await getScopedClient(isAdmin);
    const now = new Date().toISOString();

    // Fetch the minimal columns once and aggregate in memory, scoped correctly.
    let projectsQuery = supabase.from('projects').select('status').is('deleted_at', null);
    let tasksQuery = supabase.from('tasks').select('status, due_date').is('deleted_at', null);
    let membersQuery = supabase.from('project_members').select('project_id, user_id');
    let filesQuery = supabase.from('project_files').select('id').is('deleted_at', null);

    if (!isAdmin) {
      projectsQuery = projectsQuery.in('id', projectIds);
      tasksQuery = tasksQuery.in('project_id', projectIds);
      membersQuery = membersQuery.in('project_id', projectIds);
      filesQuery = filesQuery.in('project_id', projectIds);
    }

    const [{ data: projects }, { data: tasks }, { data: members }, { data: files }] =
      await Promise.all([projectsQuery, tasksQuery, membersQuery, filesQuery]);

    const projectRows = projects || [];
    const taskRows = tasks || [];
    const uniqueMembers = new Set((members || []).map((m) => m.user_id));

    return {
      success: true,
      data: {
        total_projects: projectRows.length,
        active_projects: projectRows.filter((p) => p.status === 'ACTIVE').length,
        completed_projects: projectRows.filter((p) => p.status === 'ARCHIVED').length,
        archived_projects: projectRows.filter((p) => p.status === 'ARCHIVED').length,
        total_tasks: taskRows.length,
        in_progress_tasks: taskRows.filter((t) => t.status === 'IN_PROGRESS').length,
        completed_tasks: taskRows.filter((t) => t.status === 'COMPLETED').length,
        overdue_tasks: taskRows.filter(
          (t) => t.due_date && t.due_date < now && t.status !== 'COMPLETED'
        ).length,
        team_members: uniqueMembers.size,
        total_files: (files || []).length,
      },
    };
  } catch (error) {
    console.error('getDashboardKPIs error:', error);
    return { success: false, error: 'Failed to fetch KPIs', code: 'INTERNAL_ERROR' };
  }
}

// ============================================================================
// Charts Data
// ============================================================================

export async function getTasksByStatus(): Promise<DashboardResponse<TasksByStatusData>> {
  const empty: TasksByStatusData = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, BLOCKED: 0, COMPLETED: 0 };
  try {
    const { isAdmin, projectIds } = await getAccessibleProjectIds();
    if (!isAdmin && projectIds.length === 0) return { success: true, data: empty };

    const supabase = await getScopedClient(isAdmin);
    let query = supabase.from('tasks').select('status').is('deleted_at', null);
    if (!isAdmin) query = query.in('project_id', projectIds);

    const { data: tasks } = await query;
    const counts: TasksByStatusData = { ...empty };
    tasks?.forEach((task) => {
      if (Object.prototype.hasOwnProperty.call(counts, task.status)) {
        counts[task.status as keyof TasksByStatusData]++;
      }
    });

    return { success: true, data: counts };
  } catch (error) {
    console.error('getTasksByStatus error:', error);
    return { success: false, error: 'Failed to fetch tasks by status', code: 'INTERNAL_ERROR' };
  }
}

export async function getTasksByPriority(): Promise<DashboardResponse<TasksByPriorityData>> {
  const empty: TasksByPriorityData = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  try {
    const { isAdmin, projectIds } = await getAccessibleProjectIds();
    if (!isAdmin && projectIds.length === 0) return { success: true, data: empty };

    const supabase = await getScopedClient(isAdmin);
    let query = supabase.from('tasks').select('priority').is('deleted_at', null);
    if (!isAdmin) query = query.in('project_id', projectIds);

    const { data: tasks } = await query;
    const counts: TasksByPriorityData = { ...empty };
    tasks?.forEach((task) => {
      if (Object.prototype.hasOwnProperty.call(counts, task.priority)) {
        counts[task.priority as keyof TasksByPriorityData]++;
      }
    });

    return { success: true, data: counts };
  } catch (error) {
    console.error('getTasksByPriority error:', error);
    return { success: false, error: 'Failed to fetch tasks by priority', code: 'INTERNAL_ERROR' };
  }
}

export async function getProjectProgress(limit: number = 10): Promise<DashboardResponse<ProjectProgressData[]>> {
  try {
    const { isAdmin, projectIds } = await getAccessibleProjectIds();
    if (!isAdmin && projectIds.length === 0) return { success: true, data: [] };

    const supabase = await getScopedClient(isAdmin);
    let projectQuery = supabase
      .from('projects')
      .select('id, name, key, status')
      .is('deleted_at', null)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (!isAdmin) projectQuery = projectQuery.in('id', projectIds);

    const { data: projects } = await projectQuery;
    if (!projects || projects.length === 0) return { success: true, data: [] };

    const ids = projects.map((p) => p.id);
    const { data: tasks } = await supabase
      .from('tasks')
      .select('project_id, status')
      .in('project_id', ids)
      .is('deleted_at', null);

    const projectStats = projects.map((project) => {
      const projectTasks = tasks?.filter((t) => t.project_id === project.id) || [];
      const total = projectTasks.length;
      const completed = projectTasks.filter((t) => t.status === 'COMPLETED').length;
      return {
        project_id: project.id,
        project_name: project.name,
        project_key: project.key,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        total_tasks: total,
        completed_tasks: completed,
      };
    });

    projectStats.sort((a, b) => a.progress - b.progress);
    return { success: true, data: projectStats };
  } catch (error) {
    console.error('getProjectProgress error:', error);
    return { success: false, error: 'Failed to fetch project progress', code: 'INTERNAL_ERROR' };
  }
}

export async function getCompletionTrend(days: number = 14): Promise<DashboardResponse<CompletionTrendData[]>> {
  try {
    const { isAdmin, projectIds } = await getAccessibleProjectIds();
    if (!isAdmin && projectIds.length === 0) return { success: true, data: [] };

    const supabase = await getScopedClient(isAdmin);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let taskQuery = supabase
      .from('tasks')
      .select('status, completed_at, created_at')
      .is('deleted_at', null)
      .gte('created_at', startDate.toISOString());

    if (!isAdmin) taskQuery = taskQuery.in('project_id', projectIds);

    const { data: tasks } = await taskQuery;
    if (!tasks || tasks.length === 0) return { success: true, data: [] };

    const dateMap = new Map<string, { completed: number; created: number }>();
    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dateMap.set(date.toISOString().split('T')[0], { completed: 0, created: 0 });
    }

    tasks.forEach((task) => {
      const createdDate = task.created_at.split('T')[0];
      if (dateMap.has(createdDate)) dateMap.get(createdDate)!.created++;
      if (task.status === 'COMPLETED' && task.completed_at) {
        const completedDate = task.completed_at.split('T')[0];
        if (dateMap.has(completedDate)) dateMap.get(completedDate)!.completed++;
      }
    });

    const trendData: CompletionTrendData[] = Array.from(dateMap.entries())
      .map(([date, counts]) => ({ date, completed: counts.completed, created: counts.created }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: trendData };
  } catch (error) {
    console.error('getCompletionTrend error:', error);
    return { success: false, error: 'Failed to fetch completion trend', code: 'INTERNAL_ERROR' };
  }
}

export async function getTeamWorkload(limit: number = 10): Promise<DashboardResponse<TeamWorkloadData[]>> {
  try {
    const { isAdmin, projectIds } = await getAccessibleProjectIds();
    if (!isAdmin && projectIds.length === 0) return { success: true, data: [] };

    const supabase = await getScopedClient(isAdmin);

    let memberQuery = supabase
      .from('project_members')
      .select(
        `
        user_id,
        project_id,
        profile:profiles!project_members_user_id_fkey(id, full_name, avatar_url)
      `
      );
    if (!isAdmin) memberQuery = memberQuery.in('project_id', projectIds);

    const { data: members } = await memberQuery;
    if (!members || members.length === 0) return { success: true, data: [] };

    const userIds = [...new Set(members.map((m) => m.user_id))];

    let taskQuery = supabase
      .from('tasks')
      .select('assignee_id, status, due_date')
      .in('assignee_id', userIds)
      .is('deleted_at', null);
    if (!isAdmin) taskQuery = taskQuery.in('project_id', projectIds);

    const { data: tasks } = await taskQuery;

    const workloadMap = new Map<string, TeamWorkloadData>();
    members.forEach((member) => {
      const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile;
      if (!profile) return;
      if (!workloadMap.has(member.user_id)) {
        workloadMap.set(member.user_id, {
          user_id: member.user_id,
          full_name: profile.full_name || 'Unknown',
          avatar_url: profile.avatar_url,
          assigned_count: 0,
          todo_count: 0,
          in_progress_count: 0,
          overdue_count: 0,
        });
      }
    });

    const now = new Date().toISOString().split('T')[0];
    tasks?.forEach((task) => {
      const workload = workloadMap.get(task.assignee_id);
      if (!workload) return;
      workload.assigned_count++;
      if (task.status === 'TODO') workload.todo_count++;
      else if (task.status === 'IN_PROGRESS') workload.in_progress_count++;
      if (task.due_date && task.due_date < now && task.status !== 'COMPLETED') {
        workload.overdue_count++;
      }
    });

    const workloadData = Array.from(workloadMap.values())
      .sort((a, b) => b.assigned_count - a.assigned_count)
      .slice(0, limit);

    return { success: true, data: workloadData };
  } catch (error) {
    console.error('getTeamWorkload error:', error);
    return { success: false, error: 'Failed to fetch team workload', code: 'INTERNAL_ERROR' };
  }
}

// ============================================================================
// Recent Activity
// ============================================================================

export async function getRecentActivity(limit: number = 20): Promise<DashboardResponse<RecentActivityItem[]>> {
  try {
    const { isAdmin, projectIds } = await getAccessibleProjectIds();
    if (!isAdmin && projectIds.length === 0) return { success: true, data: [] };

    const supabase = await getScopedClient(isAdmin);
    let activityQuery = supabase
      .from('activity_logs')
      .select(
        `
        id,
        action,
        entity_type,
        entity_id,
        created_at,
        metadata,
        user:profiles!activity_logs_user_id_fkey(id, full_name, avatar_url),
        project:projects!activity_logs_project_id_fkey(id, name, key)
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!isAdmin) activityQuery = activityQuery.in('project_id', projectIds);

    const { data: activities } = await activityQuery;

    const transformed: RecentActivityItem[] = (activities || []).map((activity) => {
      const user = Array.isArray(activity.user) ? activity.user[0] : activity.user;
      const project = Array.isArray(activity.project) ? activity.project[0] : activity.project;
      return {
        id: activity.id,
        action: activity.action,
        entity_type: activity.entity_type,
        entity_id: activity.entity_id,
        created_at: activity.created_at,
        user: {
          id: user?.id || '',
          full_name: user?.full_name,
          avatar_url: user?.avatar_url,
        },
        project: project ? { id: project.id, name: project.name, key: project.key } : undefined,
        metadata: activity.metadata,
      };
    });

    return { success: true, data: transformed };
  } catch (error) {
    console.error('getRecentActivity error:', error);
    return { success: false, error: 'Failed to fetch recent activity', code: 'INTERNAL_ERROR' };
  }
}

// ============================================================================
// Upcoming Deadlines
// ============================================================================

export async function getUpcomingDeadlines(limit: number = 10): Promise<DashboardResponse<UpcomingDeadline[]>> {
  try {
    const { isAdmin, projectIds } = await getAccessibleProjectIds();
    if (!isAdmin && projectIds.length === 0) return { success: true, data: [] };

    const supabase = await getScopedClient(isAdmin);
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    let taskQuery = supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        due_date,
        project_id,
        assignee_id,
        project:projects(id, name, key),
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
      `
      )
      .gte('due_date', now.toISOString())
      .lte('due_date', nextWeek.toISOString())
      .neq('status', 'COMPLETED')
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(limit);

    if (!isAdmin) taskQuery = taskQuery.in('project_id', projectIds);

    const { data: tasks } = await taskQuery;

    const deadlines: UpcomingDeadline[] = (tasks || []).map((task) => {
      const project = Array.isArray(task.project) ? task.project[0] : task.project;
      const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
      return {
        id: task.id,
        title: task.title,
        due_date: task.due_date,
        type: 'task' as const,
        project_id: task.project_id,
        project_name: project?.name || 'Unknown',
        project_key: project?.key || '',
        assignee: assignee
          ? { id: assignee.id, full_name: assignee.full_name, avatar_url: assignee.avatar_url }
          : undefined,
      };
    });

    return { success: true, data: deadlines };
  } catch (error) {
    console.error('getUpcomingDeadlines error:', error);
    return { success: false, error: 'Failed to fetch upcoming deadlines', code: 'INTERNAL_ERROR' };
  }
}

// ============================================================================
// Overdue Items
// ============================================================================

export async function getOverdueItems(limit: number = 10): Promise<DashboardResponse<OverdueItem[]>> {
  try {
    const { isAdmin, projectIds } = await getAccessibleProjectIds();
    if (!isAdmin && projectIds.length === 0) return { success: true, data: [] };

    const supabase = await getScopedClient(isAdmin);
    const now = new Date().toISOString();

    let taskQuery = supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        due_date,
        project_id,
        assignee_id,
        project:projects(id, name, key),
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
      `
      )
      .lt('due_date', now)
      .neq('status', 'COMPLETED')
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(limit);

    if (!isAdmin) taskQuery = taskQuery.in('project_id', projectIds);

    const { data: tasks } = await taskQuery;

    const overdueItems: OverdueItem[] = (tasks || []).map((task) => {
      const project = Array.isArray(task.project) ? task.project[0] : task.project;
      const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
      const diffTime = new Date().getTime() - new Date(task.due_date).getTime();
      return {
        id: task.id,
        title: task.title,
        due_date: task.due_date,
        type: 'task' as const,
        project_id: task.project_id,
        project_name: project?.name || 'Unknown',
        project_key: project?.key || '',
        days_overdue: Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
        assignee: assignee
          ? { id: assignee.id, full_name: assignee.full_name, avatar_url: assignee.avatar_url }
          : undefined,
      };
    });

    return { success: true, data: overdueItems };
  } catch (error) {
    console.error('getOverdueItems error:', error);
    return { success: false, error: 'Failed to fetch overdue items', code: 'INTERNAL_ERROR' };
  }
}

// ============================================================================
// My Work
// ============================================================================

export async function getMyWork(): Promise<DashboardResponse<MyWorkData>> {
  try {
    const { user } = await getUserContext();
    const supabase = await createSupabaseServerClient();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: allAssignedTasks } = await supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        status,
        priority,
        due_date,
        progress,
        project:projects(id, name, key),
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
      `
      )
      .eq('assignee_id', user.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true });

    const tasksWithRelations: TaskWithMinimalRelations[] = (allAssignedTasks || []).map((task) => {
      const project = Array.isArray(task.project) ? task.project[0] : task.project;
      const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        progress: task.progress,
        project: project || { id: '', name: '', key: '' },
        assignee: assignee
          ? { id: assignee.id, full_name: assignee.full_name, avatar_url: assignee.avatar_url }
          : undefined,
      };
    });

    const myWork: MyWorkData = {
      assigned_tasks: tasksWithRelations.filter((t) => t.status !== 'COMPLETED').slice(0, 10),
      today_tasks: tasksWithRelations
        .filter((t) => t.due_date && t.due_date >= todayStart && t.due_date < todayEnd && t.status !== 'COMPLETED')
        .slice(0, 5),
      overdue_tasks: tasksWithRelations
        .filter((t) => t.due_date && t.due_date < now.toISOString() && t.status !== 'COMPLETED')
        .slice(0, 5),
      upcoming_tasks: tasksWithRelations
        .filter((t) => t.due_date && t.due_date >= todayEnd && t.due_date <= nextWeek.toISOString() && t.status !== 'COMPLETED')
        .slice(0, 5),
    };

    return { success: true, data: myWork };
  } catch (error) {
    console.error('getMyWork error:', error);
    return { success: false, error: 'Failed to fetch my work', code: 'INTERNAL_ERROR' };
  }
}

// ============================================================================
// Admin Stats
// ============================================================================

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_projects: number;
  total_tasks: number;
  storage_used_gb: number;
}

export async function getAdminStats(): Promise<DashboardResponse<AdminStats>> {
  try {
    const { isAdmin } = await getUserContext();

    if (!isAdmin) {
      return { success: false, error: 'Admin access required', code: 'FORBIDDEN' };
    }

    const supabase = createSupabaseAdminClient();

    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalProjects },
      { count: totalTasks },
      { data: files },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('projects').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('project_files').select('size').is('deleted_at', null),
    ]);

    const totalSizeBytes = files?.reduce((sum, f) => sum + (f.size || 0), 0) || 0;
    const storageUsedGB = totalSizeBytes / (1024 * 1024 * 1024);

    return {
      success: true,
      data: {
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,
        total_projects: totalProjects || 0,
        total_tasks: totalTasks || 0,
        storage_used_gb: Math.round(storageUsedGB * 100) / 100,
      },
    };
  } catch (error) {
    console.error('getAdminStats error:', error);
    return { success: false, error: 'Failed to fetch admin stats', code: 'INTERNAL_ERROR' };
  }
}

// ============================================================================
// Combined Dashboard Data (for single fetch)
// ============================================================================

export interface FullDashboardData {
  kpis: DashboardKPIs;
  tasksByStatus: TasksByStatusData;
  tasksByPriority: TasksByPriorityData;
  projectProgress: ProjectProgressData[];
  completionTrend: CompletionTrendData[];
  teamWorkload: TeamWorkloadData[];
  recentActivity: RecentActivityItem[];
  upcomingDeadlines: UpcomingDeadline[];
  overdueItems: OverdueItem[];
  myWork: MyWorkData;
  adminStats?: AdminStats;
}

export async function getFullDashboardData(): Promise<DashboardResponse<FullDashboardData>> {
  try {
    const { isAdmin } = await getUserContext();

    const [
      kpis,
      tasksByStatus,
      tasksByPriority,
      projectProgress,
      completionTrend,
      teamWorkload,
      recentActivity,
      upcomingDeadlines,
      overdueItems,
      myWork,
      adminStats,
    ] = await Promise.all([
      getDashboardKPIs(),
      getTasksByStatus(),
      getTasksByPriority(),
      getProjectProgress(10),
      getCompletionTrend(14),
      getTeamWorkload(10),
      getRecentActivity(20),
      getUpcomingDeadlines(10),
      getOverdueItems(10),
      getMyWork(),
      isAdmin ? getAdminStats() : Promise.resolve({ success: true, data: undefined }),
    ]);

    return {
      success: true,
      data: {
        kpis: kpis.data!,
        tasksByStatus: tasksByStatus.data!,
        tasksByPriority: tasksByPriority.data!,
        projectProgress: projectProgress.data!,
        completionTrend: completionTrend.data!,
        teamWorkload: teamWorkload.data!,
        recentActivity: recentActivity.data!,
        upcomingDeadlines: upcomingDeadlines.data!,
        overdueItems: overdueItems.data!,
        myWork: myWork.data!,
        adminStats: adminStats.data,
      },
    };
  } catch (error) {
    console.error('getFullDashboardData error:', error);
    return { success: false, error: 'Failed to fetch dashboard data', code: 'INTERNAL_ERROR' };
  }
}