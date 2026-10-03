"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle, TrendingUp, BarChart3, PieChart } from "lucide-react";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportExportButton } from "@/components/reports/ReportExportButton";
import { TaskReportCharts } from "@/components/reports/TaskReportCharts";
import { TaskStatusTable } from "@/components/reports/TaskStatusTable";
import { getUserProjectsForReportsAction, getTaskReportDataAction } from "@/app/actions/reports/reports";
import { useTranslations } from "next-intl";
import type { ReportFilters as ReportFiltersType, TaskReportData } from "@/types/reports";

interface TaskReportTabProps {
  initialProjects: { id: string; name: string; key: string }[];
}

function TaskReportContent({ initialProjects }: TaskReportTabProps) {
  const t = useTranslations("reports");
  const [projects, setProjects] = useState(initialProjects);
  const [filters, setFilters] = useState<ReportFiltersType>({
    projectId: initialProjects[0]?.id,
    dateRange: { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date(), preset: "30d" },
  });
  const [reportData, setReportData] = useState<TaskReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    async function loadProjects() {
      const { data } = await getUserProjectsForReportsAction();
      if (data && data.length > 0) {
        setProjects(data);
        setFilters(prev => ({ ...prev, projectId: data[0].id }));
      }
    }
    loadProjects();
  }, []);

  // Fetch report data when filters change
  useEffect(() => {
    if (!filters.projectId) return;

    async function fetchReport() {
      setLoading(true);
      setError(null);
      const { data, error } = await getTaskReportDataAction(filters);
      if (error) {
        setError(error);
        setReportData(null);
      } else {
        setReportData(data);
      }
      setLoading(false);
    }
    fetchReport();
  }, [filters]);

  const handleFiltersChange = (newFilters: ReportFiltersType) => {
    setFilters(newFilters);
  };

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const totalTasks = reportData?.tasksByStatus.reduce((sum, s) => sum + s.count, 0) || 0;
  const overdueCount = reportData?.overdueCount || 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        projects={projects}
        users={[]}
        showUserFilter={false}
      />

      {/* Export Button */}
      <div className="flex justify-end">
        <ReportExportButton
          reportType="task"
          filters={filters}
          disabled={loading || !reportData}
        />
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive">{error}</CardContent>
        </Card>
      )}

      {reportData && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("task.tasksByStatus")}</p>
                    <p className="text-3xl font-bold">{totalTasks}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("task.overdue")}</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{overdueCount}</p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("task.statusDistribution")}</p>
                    <p className="text-3xl font-bold">{Object.keys(reportData.statusDistribution).length}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                    <PieChart className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("task.priorityDistribution")}</p>
                    <p className="text-3xl font-bold">{Object.keys(reportData.priorityDistribution).length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <TaskReportCharts data={reportData} />

          {/* Status Table */}
          <TaskStatusTable data={reportData} />
        </>
      )}

      {!reportData && !error && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {t("noData")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function TaskReportTab() {
  const [projects, setProjects] = useState<{ id: string; name: string; key: string }[]>([]);

  useEffect(() => {
    async function loadProjects() {
      const { data } = await getUserProjectsForReportsAction();
      if (data) setProjects(data);
    }
    loadProjects();
  }, []);

  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-10 bg-muted rounded" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="h-24 bg-muted rounded" /><div className="h-24 bg-muted rounded" /><div className="h-24 bg-muted rounded" /><div className="h-24 bg-muted rounded" /></div></div>}>
      <TaskReportContent initialProjects={projects} />
    </Suspense>
  );
}
