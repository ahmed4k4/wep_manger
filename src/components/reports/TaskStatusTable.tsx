"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import type { TaskReportData } from "@/types/reports";

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  in_review: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface TaskStatusTableProps {
  data: TaskReportData;
}

export function TaskStatusTable({ data }: TaskStatusTableProps) {
  const t = useTranslations("reports");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("task.tasksByStatus")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.tasksByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className={STATUS_COLORS[item.status] || "bg-gray-100 text-gray-700"}>
                    {t(`tasks.${item.status}`) || STATUS_LABELS[item.status] || item.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.tasksByStatus.reduce((sum, s) => sum + s.count, 0) > 0
                      ? `${((item.count / data.tasksByStatus.reduce((sum, s) => sum + s.count, 0)) * 100).toFixed(1)}%`
                      : "0%"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Priority Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("task.tasksByPriority")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.tasksByPriority.map((item) => (
              <div key={item.priority} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className={PRIORITY_COLORS[item.priority] || "bg-gray-100 text-gray-700"}>
                    {t(`tasks.${item.priority}`) || PRIORITY_LABELS[item.priority] || item.priority}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.tasksByPriority.reduce((sum, p) => sum + p.count, 0) > 0
                      ? `${((item.count / data.tasksByPriority.reduce((sum, p) => sum + p.count, 0)) * 100).toFixed(1)}%`
                      : "0%"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
