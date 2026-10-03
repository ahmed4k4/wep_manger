"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";
import type { ActivityItem } from "@/types/reports";

interface RecentActivityTableProps {
  activities: ActivityItem[];
}

export function RecentActivityTable({ activities }: RecentActivityTableProps) {
  const t = useTranslations("reports");

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("project.recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-muted-foreground">
          {t("noData")}
        </CardContent>
      </Card>
    );
  }

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      "task_created": "created task",
      "task_updated": "updated task",
      "task_status_changed": "changed task status",
      "task_assigned": "assigned task",
      "task_priority_changed": "changed task priority",
      "task_deleted": "deleted task",
      "project_created": "created project",
      "project_updated": "updated project",
      "member_invited": "invited member",
      "member_joined": "joined project",
      "file_uploaded": "uploaded file",
      "note_created": "created note",
      "comment_created": "commented",
    };
    return actionMap[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes("created")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (action.includes("updated") || action.includes("changed")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (action.includes("deleted")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (action.includes("assigned")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("project.recentActivity")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 10).map((activity) => (
            <div key={activity.id} className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.userAvatar || ""} alt={activity.userName} />
                <AvatarFallback>{activity.userName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  <span className="font-semibold">{activity.userName}</span> {getActionLabel(activity.action)}
                  {activity.entityName && <span className="text-muted-foreground"> &quot;{activity.entityName}&quot;</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.entityType}: {activity.entityId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={getActionColor(activity.action)}>
                  {getActionLabel(activity.action)}
                </Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
