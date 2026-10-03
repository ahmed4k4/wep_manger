"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import type { TeamReportData } from "@/types/reports";

const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

const tooltipFormatter = (value: any) => {
  const val = Number(value) ?? 0;
  return [val.toString(), "tasks"];
};

export function TeamReportChart({ data }: { data: TeamReportData[] }) {
  const t = useTranslations("reports");

  // Top performers chart
  const topPerformers = data.slice(0, 5).map((m, i) => ({
    name: m.userName.length > 12 ? m.userName.substring(0, 12) + "..." : m.userName,
    completed: m.completedTasks,
    assigned: m.assignedTasks,
    color: COLORS[i % COLORS.length],
  }));

  // Workload distribution
  const workloadData = data.map(m => ({
    name: m.userName.length > 12 ? m.userName.substring(0, 12) + "..." : m.userName,
    workload: m.workload,
    overdue: m.overdueTasks,
    color: COLORS[0],
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>{t("team.topPerformers")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="completed" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="assigned" fill="#94a3b8" radius={[4, 0, 0, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Workload Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t("team.workload")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={tooltipFormatter} />
                <Bar dataKey="workload" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="overdue" fill="#ef4444" radius={[4, 0, 0, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
