"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Users, CheckCircle, AlertTriangle, Clock, BarChart3, PieChart, TrendingUp } from "lucide-react";
import { ReportFilters as ReportFiltersComponent } from "@/components/reports/ReportFilters";
import { ReportExportButton } from "@/components/reports/ReportExportButton";
import { ProjectReportChart } from "@/components/reports/ProjectReportChart";
import { RecentActivityTable } from "@/components/reports/RecentActivityTable";
import { getUserProjectsForReportsAction, getProjectReportDataAction } from "@/app/actions/reports/reports";
import { useTranslations } from "next-intl";
import type { ReportFilters, ProjectReportData } from "@/types/reports";

interface ProjectReportTabProps {
  initialProjects: { id: string; name: string; key: string }[];
}

function ProjectReportContent({ initialProjects }: ProjectReportTabProps) {
  const t = useTranslations("reports");
  const [projects, setProjects] = useState(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjects[0]?.id);
  const [filters, setFilters] = useState<ReportFilters>({
    projectId: initialProjects[0]?.id,
    dateRange: { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date(), preset: "30d" },
  });
  const [reportData, setReportData] = useState<ProjectReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    async function loadProjects() {
      const { data, error } = await getUserProjectsForReportsAction();
      if (data && data.length > 0) {
        setProjects(data);
        if (!selectedProjectId) {
          setSelectedProjectId(data[0].id);
          setFilters(prev => ({ ...prev, projectId: data[0].id }));
        }
      }
    }
    loadProjects();
  }, [selectedProjectId]);

  // Fetch report data when filters change
  useEffect(() => {
    if (!filters.projectId) return;

    async function fetchReport() {
      setLoading(true);
      setError(null);
      const { data, error } = await getProjectReportDataAction(filters);
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

  const handleFiltersChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
  };

  const handleProjectChange = (projectId: string | undefined) => {
    setSelectedProjectId(projectId);
    setFilters(prev => ({ ...prev, projectId }));
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        projects={projects}
        users={reportData ? [{ id: "", name: t("filters.allUsers") }] : []}
        showUserFilter={false}
      />

      {/* Export Button */}
      <div className="flex justify-end">
        <ReportExportButton
          reportType="project"
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
                    <p className="text-sm font-medium text-muted-foreground">{t("project.totalTasks")}</p>
                    <p className="text-3xl font-bold">{reportData.totalTasks}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("project.completedTasks")}</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{reportData.completedTasks}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("project.overdueTasks")}</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{reportData.overdueTasks}</p>
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
                    <p className="text-sm font-medium text-muted-foreground">{t("project.completionRate")}</p>
                    <p className="text-3xl font-bold">{reportData.completionRate}%</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress & Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t("project.progress")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Progress value={reportData.progress} className="flex-1 h-4" />
                  <span className="text-2xl font-bold w-16 text-right">{reportData.progress}%</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-green-600">{reportData.completedTasks}</p>
                    <p className="text-muted-foreground">{t("project.completedTasks")}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-600">{reportData.activeTasks}</p>
                    <p className="text-muted-foreground">{t("project.activeTasks")}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-red-600">{reportData.overdueTasks}</p>
                    <p className="text-muted-foreground">{t("project.overdue")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  {t("project.team")} & {t("project.files")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{reportData.teamMembers}</p>
                    <p className="text-sm text-muted-foreground">{t("project.teamMembers")}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{reportData.filesCount}</p>
                    <p className="text-sm text-muted-foreground">{t("project.filesCount")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-green-600">
                    <Users className="h-4 w-4" />
                    <span>{t("project.recentActivity")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <Clock className="h-4 w-4" />
                    <span>{reportData.recentActivity.length} {t("activity.title").toLowerCase()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <ProjectReportChart data={reportData} />

          {/* Recent Activity */}
          <RecentActivityTable activities={reportData.recentActivity} />
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

export function ProjectReportTab() {
  const t = useTranslations("reports");
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
      <ProjectReportContent initialProjects={projects} />
    </Suspense>
  );
}
