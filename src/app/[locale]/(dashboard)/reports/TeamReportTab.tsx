"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, UserCheck, AlertTriangle, TrendingUp, Users, Trophy } from "lucide-react";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportExportButton } from "@/components/reports/ReportExportButton";
import { TeamReportChart } from "@/components/reports/TeamReportChart";
import { TeamReportTable } from "@/components/reports/TeamReportTable";
import { getUserProjectsForReportsAction, getTeamReportDataAction } from "@/app/actions/reports/reports";
import { useTranslations } from "next-intl";
import type { ReportFilters as ReportFiltersType, TeamReportData } from "@/types/reports";

interface TeamReportTabProps {
  initialProjects: { id: string; name: string; key: string }[];
}

function TeamReportContent({ initialProjects }: TeamReportTabProps) {
  const t = useTranslations("reports");
  const [projects, setProjects] = useState(initialProjects);
  const [filters, setFilters] = useState<ReportFiltersType>({
    projectId: initialProjects[0]?.id,
    dateRange: { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date(), preset: "30d" },
  });
  const [reportData, setReportData] = useState<TeamReportData[] | null>(null);
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
      const { data, error } = await getTeamReportDataAction(filters);
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

  // Get users for filter dropdown
  const users = reportData?.map(m => ({ id: m.userId, name: m.userName })) || [];

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const totalAssigned = reportData?.reduce((sum, m) => sum + m.assignedTasks, 0) || 0;
  const totalCompleted = reportData?.reduce((sum, m) => sum + m.completedTasks, 0) || 0;
  const totalOverdue = reportData?.reduce((sum, m) => sum + m.overdueTasks, 0) || 0;
  const avgCompletionRate = reportData && reportData.length > 0
    ? Math.round(reportData.reduce((sum, m) => sum + m.completionRate, 0) / reportData.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        projects={projects}
        users={users}
        showUserFilter={true}
      />

      {/* Export Button */}
      <div className="flex justify-end">
        <ReportExportButton
          reportType="team"
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
                    <p className="text-sm font-medium text-muted-foreground">{t("team.assignedTasks")}</p>
                    <p className="text-3xl font-bold">{totalAssigned}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("team.completed")}</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalCompleted}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("team.overdue")}</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{totalOverdue}</p>
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
                    <p className="text-sm font-medium text-muted-foreground">{t("team.completionRate")}</p>
                    <p className="text-3xl font-bold">{avgCompletionRate}%</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <TeamReportChart data={reportData} />

          {/* Team Table */}
          <TeamReportTable members={reportData} />
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

export function TeamReportTab() {
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
      <TeamReportContent initialProjects={projects} />
    </Suspense>
  );
}
