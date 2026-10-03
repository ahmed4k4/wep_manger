/**
 * Reports Types
 * Type definitions for the reports system
 */

export type DateRangePreset = "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  from: Date | string;
  to: Date | string;
  preset?: DateRangePreset;
}

export interface ReportFilters {
  projectId?: string;
  userId?: string;
  dateRange: DateRange;
  status?: string[];
  priority?: string[];
}

export interface ProjectReportData {
  projectId: string;
  projectName: string;
  projectKey: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeTasks: number;
  teamMembers: number;
  filesCount: number;
  completionRate: number;
  recentActivity: ActivityItem[];
}

export interface TeamReportData {
  userId: string;
  userName: string;
  userAvatar?: string;
  assignedTasks: number;
  completedTasks: number;
  overdueTasks: number;
  workload: number;
  completionRate: number;
}

export interface TaskReportData {
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  overdueCount: number;
  completionTrend: TrendDataPoint[];
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  createdVsCompleted: { date: string; created: number; completed: number }[];
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  createdAt: string;
}

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface ReportExportOptions {
  format: "csv" | "pdf";
  filters: ReportFilters;
  reportType: "project" | "team" | "task";
}
