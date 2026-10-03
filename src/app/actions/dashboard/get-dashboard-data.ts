/**
 * Dashboard Data Server Actions
 * Fetches all data needed for the Professional Project Management Dashboard
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
// Get User Role Context
// ============================================================================

// Cached per request: getFullDashboardData calls every section function, each of
// which previously re-resolved the user + role checks. React cache collapses
// these to a single resolution per request.
const getUserContext = cache(async () => {
  const user = await requireAuth();
  const isAdmin = await checkIsAdmin(user.id);
  const isPM = await checkIsProjectManager(user.id);

  return { user, isAdmin, isPM };
});

// ============================================================================
// KPIs
// ============================================================================

export async function getDashboardKPIs(): Promise<DashboardResponse<DashboardKPIs>> {
  try {
    const { user, isAdmin } = await getUserContext();
    const supabase = isAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();
    
    // Build base queries based on user role
    let projectQuery = supabase.from('projects').select('id, status', { count: 'exact' }).is('deleted_at', null);
    let taskQuery = supabase.from('tasks').select('id, status, due_date', { count: 'exact' }).is('deleted_at', null);
    let memberQuery = supabase.from('project_members').select('user_id', { count: 'exact' });
    let fileQuery = supabase.from('project_files').select('id', { count: 'exact' }).is('deleted_at', null);
    
    // For non-admin users, filter by accessible projects
    if (!isAdmin) {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      
      const projectIds = memberships?.map(m => m.project_id) || [];
      const ownerProjects = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      
      const ownerProjectIds = ownerProjects.data?.map(p => p.id) || [];
      const allProjectIds = [...new Set([...projectIds, ...ownerProjectIds])];
      
      if (allProjectIds.length > 0) {
        projectQuery = projectQuery.in('id', allProjectIds);
        taskQuery = taskQuery.in('project_id', allProjectIds);
        memberQuery = memberQuery.in('project_id', allProjectIds);
        fileQuery = fileQuery.in('project_id', allProjectIds);
      } else {
        // No accessible projects
        return {
          success: true,
          data: {
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
          }
        };
      }
    }
    
    // Execute all queries in parallel
    const [
      { count: totalProjects },
      { count: activeProjects },
      { count: completedProjects },
      { count: archivedProjects },
      { count: totalTasks },
      { count: inProgressTasks },
      { count: completedTasks },
      { data: overdueTasks },
      { count: teamMembers },
      { count: totalFiles }
    ] = await Promise.all([
      projectQuery,
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE').is('deleted_at', null),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED').is('deleted_at', null),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'ARCHIVED').is('deleted_at', null),
      taskQuery,
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS').is('deleted_at', null),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED').is('deleted_at', null),
      supabase.from('tasks').select('id').lt('due_date', new Date().toISOString()).neq('status', 'COMPLETED').is('deleted_at', null),
      memberQuery,
      fileQuery,
    ]);
    
    return {
      success: true,
      data: {
        total_projects: totalProjects || 0,
        active_projects: activeProjects || 0,
        completed_projects: completedProjects || 0,
        archived_projects: archivedProjects || 0,
        total_tasks: totalTasks || 0,
        in_progress_tasks: inProgressTasks || 0,
        completed_tasks: completedTasks || 0,
        overdue_tasks: overdueTasks?.length || 0,
        team_members: teamMembers || 0,
        total_files: totalFiles || 0,
      }
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
  try {
    const { user, isAdmin } = await getUserContext();
    const supabase = isAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();
    
    let query = supabase.from('tasks').select('status').is('deleted_at', null);
    
    if (!isAdmin) {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      const projectIds = memberships?.map(m => m.project_id) || [];
      const { data: ownerProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      const ownerProjectIds = ownerProjects?.map(p => p.id) || [];
      const allProjectIds = [...new Set([...projectIds, ...ownerProjectIds])];
      if (allProjectIds.length > 0) {
        query = query.in('project_id', allProjectIds);
      } else {
        return { success: true, data: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, BLOCKED: 0, COMPLETED: 0 } };
      }
    }
    
    const { data: tasks } = await query;
    
    const counts: TasksByStatusData = {
      TODO: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      BLOCKED: 0,
      COMPLETED: 0,
    };
    
    tasks?.forEach(task => {
      if (counts.hasOwnProperty(task.status)) {
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
  try {
    const { user, isAdmin } = await getUserContext();
    const supabase = isAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();
    
    let query = supabase.from('tasks').select('priority').is('deleted_at', null);
    
    if (!isAdmin) {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      const projectIds = memberships?.map(m => m.project_id) || [];
      const { data: ownerProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      const ownerProjectIds = ownerProjects?.map(p => p.id) || [];
      const allProjectIds = [...new Set([...projectIds, ...ownerProjectIds])];
      if (allProjectIds.length > 0) {
        query = query.in('project_id', allProjectIds);
      } else {
        return { success: true, data: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 } };
      }
    }
    
    const { data: tasks } = await query;
    
    const counts: TasksByPriorityData = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };
    
    tasks?.forEach(task => {
      if (counts.hasOwnProperty(task.priority)) {
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
    const { user, isAdmin } = await getUserContext();
    const supabase = isAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();
    
    let projectQuery = supabase
      .from('projects')
      .select('id, name, key, status')
      .is('deleted_at', null)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (!isAdmin) {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      const projectIds = memberships?.map(m => m.project_id) || [];
      const { data: ownerProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      const ownerProjectIds = ownerProjects?.map(p => p.id) || [];
      const allProjectIds = [...new Set([...projectIds, ...ownerProjectIds])];
      if (allProjectIds.length > 0) {
        projectQuery = projectQuery.in('id', allProjectIds);
      } else {
        return { success: true, data: [] };
      }
    }
    
    const { data: projects } = await projectQuery;
    
    if (!projects || projects.length === 0) {
      return { success: true, data: [] };
    }
    
    const projectIds = projects.map(p => p.id);
    
    // Get task counts for all projects in parallel
    const { data: tasks } = await supabase
      .from('tasks')
      .select('project_id, status')
      .in('project_id', projectIds)
      .is('deleted_at', null);
    
    const projectStats = projects.map(project => {
      const projectTasks = tasks?.filter(t => t.project_id === project.id) || [];
      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === 'COMPLETED').length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        project_id: project.id,
        project_name: project.name,
        project_key: project.key,
        progress,
        total_tasks: total,
        completed_tasks: completed,
      };
    });
    
    // Sort by progress ascending (least complete first)
    projectStats.sort((a, b) => a.progress - b.progress);
    
    return { success: true, data: projectStats };
  } catch (error) {
    console.error('getProjectProgress error:', error);
    return { success: false, error: 'Failed to fetch project progress', code: 'INTERNAL_ERROR' };
  }
}

export async function getCompletionTrend(days: number = 14): Promise<DashboardResponse<CompletionTrendData[]>> {
  try {
    const { user, isAdmin } = await getUserContext();
    const supabase = isAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();
    
    let projectIds: string[] = [];
    
    if (!isAdmin) {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      projectIds = memberships?.map(m => m.project_id) || [];
      const { data: ownerProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      projectIds = [...new Set([...projectIds, ...(ownerProjects?.map(p => p.id) || [])])];
      
      if (projectIds.length === 0) {
        return { success: true, data: [] };
      }
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    let taskQuery = supabase
      .from('tasks')
      .select('status, completed_at, created_at')
      .is('deleted_at', null)
      .gte('created_at', startDate.toISOString());
    
    if (!isAdmin && projectIds.length > 0) {
      taskQuery = taskQuery.in('project_id', projectIds);
    }
    
    const { data: tasks } = await taskQuery;
    
    if (!tasks || tasks.length === 0) {
      return { success: true, data: [] };
    }
    
    // Group by date
    const dateMap = new Map<string, { completed: number; created: number }>();
    
    // Initialize all dates
    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { completed: 0, created: 0 });
    }
    
    tasks.forEach(task => {
      const createdDate = task.created_at.split('T')[0];
      if (dateMap.has(createdDate)) {
        dateMap.get(createdDate)!.created++;
      }
      
      if (task.status === 'COMPLETED' && task.completed_at) {
        const completedDate = task.completed_at.split('T')[0];
        if (dateMap.has(completedDate)) {
          dateMap.get(completedDate)!.completed++;
        }
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
    const { user, isAdmin } = await getUserContext();
    const supabase = isAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();
    
    let projectIds: string[] = [];
    
    if (!isAdmin) {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      projectIds = memberships?.map(m => m.project_id) || [];
      const { data: ownerProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      projectIds = [...new Set([...projectIds, ...(ownerProjects?.map(p => p.id) || [])])];
      
      if (projectIds.length === 0) {
        return { success: true, data: [] };
      }
    }
    
    // Get all members in accessible projects
    let memberQuery = supabase
      .from('project_members')
      .select(`
        user_id,
        project_id,
        profile:profiles!project_members_user_id_fkey(id, full_name, avatar_url)
      `);
    
    if (!isAdmin && projectIds.length > 0) {
      memberQuery = memberQuery.in('project_id', projectIds);
    }
    
    const { data: members } = await memberQuery;
    
    if (!members || members.length === 0) {
      return { success: true, data: [] };
    }
    
    // Get unique user IDs
    const userIds = [...new Set(members.map(m => m.user_id))];
    
    // Get task counts for each user
    let taskQuery = supabase
      .from('tasks')
      .select('assignee_id, status, due_date')
      .in('assignee_id', userIds)
      .is('deleted_at', null);
    
    if (!isAdmin && projectIds.length > 0) {
      taskQuery = taskQuery.in('project_id', projectIds);
    }
    
    const { data: tasks } = await taskQuery;
    
    // Aggregate workload per user
    const workloadMap = new Map<string, TeamWorkloadData>();
    
    members.forEach(member => {
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
    
    tasks?.forEach(task => {
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
    const { user, isAdmin } = await getUserContext();
    const supabase = isAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();
    
    let projectIds: string[] = [];
    
    if (!isAdmin) {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      projectIds = memberships?.map(m => m.project_id) || [];
      const { data: ownerProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      projectIds = [...new Set([...projectIds, ...(ownerProjects?.map(p => p.id) || [])])];
      
      if (projectIds.length === 0) {
        return { success: true, data: [] };
      }
    }
    
    let activityQuery = supabase
      .from('activity_logs')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        created_at,
        metadata,
        user:profiles!activity_logs_user_id_fkey(id, full_name, avatar_url),
        project:projects!activity_logs_project_id_fkey(id, name, key)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!isAdmin && projectIds.length > 0) {
      activityQuery = activityQuery.in('project_id', projectIds);
    }
    
    const { data: activities } = await activityQuery;
    
    const transformedActivities: RecentActivityItem[] = (activities || []).map(activity => {
      // Handle user relation which may be an array
      const user = Array.isArray(activity.user) ? activity.user[0] : activity.user;
      // Handle project relation which may be an array
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
        project: project ? {
          id: project.id,
          name: project.name,
          key: project.key,
        } : undefined,
        metadata: activity.metadata,
      };
    });
    
    return { success: true, data: transformedActivities };
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
    const { user, isAdmin } = await getUserContext();
    const supabase = isAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();
    
    let projectIds: string[] = [];
    
    if (!isAdmin) {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      projectIds = memberships?.map(m => m.project_id) || [];
      const { data: ownerProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      projectIds = [...new Set([...projectIds, ...(ownerProjects?.map(p => p.id) || [])])];
      
      if (projectIds.length === 0) {
        return { success: true, data: [] };
      }
    }
    
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Get upcoming tasks
    let taskQuery = supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        project_id,
        assignee_id,
        project:projects(id, name, key),
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
      `)
      .gte('due_date', now.toISOString())
      .lte('due_date', nextWeek.toISOString())
      .neq('status', 'COMPLETED')
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(limit);
    
    if (!isAdmin && projectIds.length > 0) {
      taskQuery = taskQuery.in('project_id', projectIds);
    }
    
    const { data: tasks } = await taskQuery;
    
    const deadlines: UpcomingDeadline[] = (tasks || []).map(task => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      type: 'task' as const,
      project_id: task.project_id,
      project_name: (task.project as any)?.[0]?.name || 'Unknown',
      project_key: (task.project as any)?.[0]?.key || '',
      assignee: (task.assignee as any)?.[0] ? {
        id: (task.assignee as any)[0].id,
        full_name: (task.assignee as any)[0].full_name,
        avatar_url: (task.assignee as any)[0].avatar_url,
      } : undefined,
    }));
    
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
    const { user, isAdmin } = await getUserContext();
    const supabase = isAdmin ? createSupabaseAdminClient() : await createSupabaseServerClient();
    
    let projectIds: string[] = [];
    
    if (!isAdmin) {
      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      projectIds = memberships?.map(m => m.project_id) || [];
      const { data: ownerProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .is('deleted_at', null);
      projectIds = [...new Set([...projectIds, ...(ownerProjects?.map(p => p.id) || [])])];
      
      if (projectIds.length === 0) {
        return { success: true, data: [] };
      }
    }
    
    const now = new Date().toISOString();
    
    // Get overdue tasks
    let taskQuery = supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        project_id,
        assignee_id,
        project:projects(id, name, key),
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
      `)
      .lt('due_date', now)
      .neq('status', 'COMPLETED')
      .is('deleted_at', null)
      .order('due_date', { ascending: true })
      .limit(limit);
    
    if (!isAdmin && projectIds.length > 0) {
      taskQuery = taskQuery.in('project_id', projectIds);
    }
    
    const { data: tasks } = await taskQuery;
    
    const overdueItems: OverdueItem[] = (tasks || []).map(task => {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const diffTime = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        id: task.id,
        title: task.title,
        due_date: task.due_date,
        type: 'task' as const,
        project_id: task.project_id,
        project_name: (task.project as any)?.[0]?.name || 'Unknown',
        project_key: (task.project as any)?.[0]?.key || '',
        days_overdue: daysOverdue,
        assignee: (task.assignee as any)?.[0] ? {
          id: (task.assignee as any)[0].id,
          full_name: (task.assignee as any)[0].full_name,
          avatar_url: (task.assignee as any)[0].avatar_url,
        } : undefined,
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
    
    // Get all assigned tasks
    const { data: allAssignedTasks } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        progress,
        project:projects(id, name, key),
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
      `)
      .eq('assignee_id', user.id)
      .is('deleted_at', null)
      .order('due_date', { ascending: true });
    
    const tasksWithRelations: TaskWithMinimalRelations[] = (allAssignedTasks || []).map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      progress: task.progress,
      project: (task.project as any)?.[0] || { id: '', name: '', key: '' },
      assignee: (task.assignee as any)?.[0] ? {
        id: (task.assignee as any)[0].id,
        full_name: (task.assignee as any)[0].full_name,
        avatar_url: (task.assignee as any)[0].avatar_url,
      } : undefined,
    }));
    
    const myWork: MyWorkData = {
      assigned_tasks: tasksWithRelations.filter(t => t.status !== 'COMPLETED').slice(0, 10),
      today_tasks: tasksWithRelations.filter(t => 
        t.due_date && t.due_date >= todayStart && t.due_date < todayEnd && t.status !== 'COMPLETED'
      ).slice(0, 5),
      overdue_tasks: tasksWithRelations.filter(t => 
        t.due_date && t.due_date < now.toISOString() && t.status !== 'COMPLETED'
      ).slice(0, 5),
      upcoming_tasks: tasksWithRelations.filter(t => 
        t.due_date && t.due_date >= todayEnd && t.due_date <= nextWeek.toISOString() && t.status !== 'COMPLETED'
      ).slice(0, 5),
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
    const { user, isAdmin } = await getUserContext();
    
    if (!isAdmin) {
      return { success: false, error: 'Admin access required', code: 'FORBIDDEN' };
    }
    
    const supabase = createSupabaseAdminClient();
    
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalProjects },
      { count: totalTasks },
      { data: files }
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
      }
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
    const { user, isAdmin } = await getUserContext();
    
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
      adminStats
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
      }
    };
  } catch (error) {
    console.error('getFullDashboardData error:', error);
    return { success: false, error: 'Failed to fetch dashboard data', code: 'INTERNAL_ERROR' };
  }
}