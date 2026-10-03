"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import type { TaskReportData } from "@/types/reports";

const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
const STATUS_COLORS: Record<string, string> = {
  todo: "#3b82f6",
  in_progress: "#f59e0b",
  in_review: "#8b5cf6",
  done: "#22c55e",
  completed: "#22c55e",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

const renderPieLabel = (props: PieLabelRenderProps) => {
  const labelName = props.name ?? "";
  const labelPercent = props.percent ?? 0;
  return `${labelName} ${(labelPercent * 100).toFixed(0)}%`;
};

const tooltipFormatter = (value: any) => {
  const val = Number(value) ?? 0;
  return [val.toString(), "tasks"];
};

export function TaskReportCharts({ data }: { data: TaskReportData }) {
  const t = useTranslations("reports");

  // Status distribution pie chart
  const statusData = data.tasksByStatus.map((s, i) => ({
    name: t(`tasks.${s.status}`) || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || COLORS[i % COLORS.length],
  })).filter(d => d.value > 0);

  // Priority distribution pie chart
  const priorityData = data.tasksByPriority.map((p, i) => ({
    name: t(`tasks.${p.priority}`) || p.priority,
    value: p.count,
    color: PRIORITY_COLORS[p.priority] || COLORS[i % COLORS.length],
  })).filter(d => d.value > 0);

  // Created vs Completed trend
  const trendData = data.createdVsCompleted.slice(-14); // Last 14 days

  const lineTooltipFormatter = (value: any, name: any) => {
    const val = Number(value) ?? 0;
    const label = name === "created" ? t("common.create") : t("tasks.done");
    return [val.toString(), label];
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t("task.statusDistribution")}</CardTitle>
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

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t("task.priorityDistribution")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label={renderPieLabel}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Created vs Completed Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t("task.createdVsCompleted")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                <YAxis />
                <Tooltip formatter={lineTooltipFormatter} />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name={t("common.create")} />
                <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name={t("tasks.done")} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
