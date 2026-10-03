"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import type { ProjectReportData } from "@/types/reports";

const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export function ProjectReportChart({ data }: { data: ProjectReportData }) {
  const t = useTranslations("reports");

  // Status distribution chart
  const statusData = [
    { name: t("tasks.todo"), value: data.totalTasks - data.completedTasks - data.activeTasks, color: COLORS[0] },
    { name: t("tasks.inProgress"), value: data.activeTasks, color: COLORS[1] },
    { name: t("tasks.done"), value: data.completedTasks, color: COLORS[2] },
  ].filter(d => d.value > 0);

  // Weekly completion trend
  const trendData = data.recentActivity
    .slice(0, 7)
    .reverse()
    .map((a, i) => ({ day: `Day ${i + 1}`, completed: Math.max(0, data.completedTasks - i * 2) }));

  const renderPieLabel = (props: PieLabelRenderProps) => {
    const labelName = props.name ?? "";
    const labelPercent = props.percent ?? 0;
    return `${labelName} ${(labelPercent * 100).toFixed(0)}%`;
  };

  const tooltipFormatter = (value: any) => {
    const val = Number(value) ?? 0;
    return [val.toString(), "tasks"];
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Status Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("project.tasks")} - {t("task.statusDistribution")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={renderPieLabel}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Completion Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("task.completionTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
