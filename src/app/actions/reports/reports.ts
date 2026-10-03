"use server";

import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import type { ReportFilters, ProjectReportData, TeamReportData, TaskReportData, ActivityItem, TrendDataPoint } from "@/types/reports";

function getDateRangeFilter(dateRange: ReportFilters["dateRange"]) {
  const from = new Date(dateRange.from);
  const to = new Date(dateRange.to);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function getUserProjectsForReportsAction() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { data: [], error: "Unauthorized" };

  // Get projects user has access to
  const { data: memberships } = await supabase
    .from("project_members")
    .select("project_id, role")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    return { data: [], error: null };
  }

  const projectIds = memberships.map(m => m.project_id);

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, key")
    .in("id", projectIds)
    .order("name");

  return { data: projects || [], error };
}

export async function getProjectReportDataAction(filters: ReportFilters): Promise<{ data: ProjectReportData | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { data: null, error: "Unauthorized" };

  if (!filters.projectId) {
    return { data: null, error: "Project ID is required" };
  }

  const { from, to } = getDateRangeFilter(filters.dateRange);

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", filters.projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { data: null, error: "Access denied" };
  }

  // Get project info
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, key")
    .eq("id", filters.projectId)
    .single();

  if (projectError || !project) {
    return { data: null, error: "Project not found" };
  }

  // Build task query with filters
  let taskQuery = supabase
    .from("tasks")
    .select("id, status, priority, due_date, created_at, assignee_id")
    .eq("project_id", filters.projectId)
    .gte("created_at", from)
    .lte("created_at", to);

  if (filters.status && filters.status.length > 0) {
    taskQuery = taskQuery.in("status", filters.status);
  }
  if (filters.priority && filters.priority.length > 0) {
    taskQuery = taskQuery.in("priority", filters.priority);
  }
  if (filters.userId) {
    taskQuery = taskQuery.eq("assignee_id", filters.userId);
  }

  const { data: tasks, error: tasksError } = await taskQuery;

  if (tasksError) {
    return { data: null, error: tasksError.message };
  }

  const tasksData = tasks || [];
  const totalTasks = tasksData.length;
  const completedTasks = tasksData.filter(t => t.status === "completed" || t.status === "done").length;
  const overdueTasks = tasksData.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed" && t.status !== "done").length;
  const activeTasks = tasksData.filter(t => t.status === "in_progress" || t.status === "in_review" || t.status === "todo").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get team members count
  const { count: teamMembers } = await supabase
    .from("project_members")
    .select("*", { count: "exact", head: true })
    .eq("project_id", filters.projectId);

  // Get files count
  const { count: filesCount } = await supabase
    .from("files")
    .select("*", { count: "exact", head: true })
    .eq("project_id", filters.projectId)
    .gte("created_at", from)
    .lte("created_at", to);

  // Get recent activity
  let activityQuery = supabase
    .from("activity_log")
    .select(`
      id,
      user_id,
      action,
      entity_type,
      entity_id,
      created_at,
      profiles!activity_log_user_id_fkey(full_name, avatar_url)
    `)
    .eq("project_id", filters.projectId)
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: activity } = await activityQuery;

  const recentActivity: ActivityItem[] = (activity || []).map(a => ({
    id: a.id,
    userId: a.user_id,
    userName: (a.profiles as any)?.full_name || "Unknown",
    userAvatar: (a.profiles as any)?.avatar_url,
    action: a.action,
    entityType: a.entity_type,
    entityId: a.entity_id,
    entityName: "",
    createdAt: a.created_at,
  }));

  return {
    data: {
      projectId: project.id,
      projectName: project.name,
      projectKey: project.key,
      progress,
      totalTasks,
      completedTasks,
      overdueTasks,
      activeTasks,
      teamMembers: teamMembers || 0,
      filesCount: filesCount || 0,
      completionRate,
      recentActivity,
    },
    error: null,
  };
}

export async function getTeamReportDataAction(filters: ReportFilters): Promise<{ data: TeamReportData[] | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { data: null, error: "Unauthorized" };

  if (!filters.projectId) {
    return { data: null, error: "Project ID is required" };
  }

  const { from, to } = getDateRangeFilter(filters.dateRange);

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", filters.projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { data: null, error: "Access denied" };
  }

  // Get all project members
  const { data: members, error: membersError } = await supabase
    .from("project_members")
    .select(`
      user_id,
      role,
      profiles!project_members_user_id_fkey(full_name, avatar_url)
    `)
    .eq("project_id", filters.projectId);

  if (membersError) {
    return { data: null, error: membersError.message };
  }

  const memberIds = (members || []).map(m => m.user_id);

  // Get tasks for all members in date range
  let taskQuery = supabase
    .from("tasks")
    .select("id, status, priority, due_date, assignee_id, created_at")
    .eq("project_id", filters.projectId)
    .in("assignee_id", memberIds)
    .gte("created_at", from)
    .lte("created_at", to);

  if (filters.status && filters.status.length > 0) {
    taskQuery = taskQuery.in("status", filters.status);
  }
  if (filters.priority && filters.priority.length > 0) {
    taskQuery = taskQuery.in("priority", filters.priority);
  }
  if (filters.userId) {
    taskQuery = taskQuery.eq("assignee_id", filters.userId);
  }

  const { data: tasks, error: tasksError } = await taskQuery;

  if (tasksError) {
    return { data: null, error: tasksError.message };
  }

  const tasksData = tasks || [];

  // Aggregate per member
  const memberReports: TeamReportData[] = (members || []).map(member => {
    const memberTasks = tasksData.filter(t => t.assignee_id === member.user_id);
    const assignedTasks = memberTasks.length;
    const completedTasks = memberTasks.filter(t => t.status === "completed" || t.status === "done").length;
    const overdueTasks = memberTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed" && t.status !== "done").length;
    const workload = memberTasks.filter(t => t.status === "in_progress" || t.status === "in_review" || t.status === "todo").length;
    const completionRate = assignedTasks > 0 ? Math.round((completedTasks / assignedTasks) * 100) : 0;

    return {
      userId: member.user_id,
      userName: (member.profiles as any)?.full_name || "Unknown",
      userAvatar: (member.profiles as any)?.avatar_url,
      assignedTasks,
      completedTasks,
      overdueTasks,
      workload,
      completionRate,
    };
  });

  // Sort by completion rate descending
  memberReports.sort((a, b) => b.completionRate - a.completionRate);

  return { data: memberReports, error: null };
}

export async function getTaskReportDataAction(filters: ReportFilters): Promise<{ data: TaskReportData | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { data: null, error: "Unauthorized" };

  if (!filters.projectId) {
    return { data: null, error: "Project ID is required" };
  }

  const { from, to } = getDateRangeFilter(filters.dateRange);

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", filters.projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { data: null, error: "Access denied" };
  }

  // Build task query with filters
  let taskQuery = supabase
    .from("tasks")
    .select("id, status, priority, due_date, created_at, assignee_id")
    .eq("project_id", filters.projectId)
    .gte("created_at", from)
    .lte("created_at", to);

  if (filters.status && filters.status.length > 0) {
    taskQuery = taskQuery.in("status", filters.status);
  }
  if (filters.priority && filters.priority.length > 0) {
    taskQuery = taskQuery.in("priority", filters.priority);
  }
  if (filters.userId) {
    taskQuery = taskQuery.eq("assignee_id", filters.userId);
  }

  const { data: tasks, error: tasksError } = await taskQuery;

  if (tasksError) {
    return { data: null, error: tasksError.message };
  }

  const tasksData = tasks || [];

  // Status distribution
  const statusDistribution: Record<string, number> = {};
  tasksData.forEach(t => {
    statusDistribution[t.status] = (statusDistribution[t.status] || 0) + 1;
  });

  // Priority distribution
  const priorityDistribution: Record<string, number> = {};
  tasksData.forEach(t => {
    priorityDistribution[t.priority] = (priorityDistribution[t.priority] || 0) + 1;
  });

  // Overdue count
  const overdueCount = tasksData.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed" && t.status !== "done").length;

  // Tasks by status (formatted for charts)
  const tasksByStatus = Object.entries(statusDistribution).map(([status, count]) => ({ status, count }));

  // Tasks by priority (formatted for charts)
  const tasksByPriority = Object.entries(priorityDistribution).map(([priority, count]) => ({ priority, count }));

  // Completion trend - group by day
  const trendMap = new Map<string, { created: number; completed: number }>();
  tasksData.forEach(t => {
    const date = new Date(t.created_at).toISOString().split("T")[0];
    const existing = trendMap.get(date) || { created: 0, completed: 0 };
    existing.created++;
    if (t.status === "completed" || t.status === "done") {
      existing.completed++;
    }
    trendMap.set(date, existing);
  });

  const completionTrend: TrendDataPoint[] = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, value: data.completed }));

  // Created vs Completed trend
  const createdVsCompleted = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, created: data.created, completed: data.completed }));

  return {
    data: {
      statusDistribution,
      priorityDistribution,
      overdueCount,
      completionTrend,
      tasksByStatus,
      tasksByPriority,
      createdVsCompleted,
    },
    error: null,
  };
}
