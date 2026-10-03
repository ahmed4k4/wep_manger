"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, AlertTriangle, UserCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TeamReportData } from "@/types/reports";

interface TeamReportTableProps {
  members: TeamReportData[];
}

export function TeamReportTable({ members }: TeamReportTableProps) {
  const t = useTranslations("reports");

  if (!members || members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("teamReport")}</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-muted-foreground">
          {t("noData")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("teamReport")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="pb-3 pr-4">{t("team.assignedTasks")}</th>
                <th className="pb-3 pr-4">{t("team.completed")}</th>
                <th className="pb-3 pr-4">{t("team.overdue")}</th>
                <th className="pb-3 pr-4">{t("team.workload")}</th>
                <th className="pb-3 pr-4">{t("team.completionRate")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((member, index) => (
                <tr key={member.userId} className="hover:bg-muted/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.userAvatar || ""} alt={member.userName} />
                        <AvatarFallback>{member.userName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.userName}</p>
                        {index === 0 && (
                          <Badge className="mt-1 text-xs" variant="default">
                            <Trophy className="h-3 w-3 mr-1" />
                            {t("team.topPerformers")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">{member.completedTasks}</span>
                      <span className="text-muted-foreground">/ {member.assignedTasks}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {member.overdueTasks > 0 ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-semibold">{member.overdueTasks}</span>
                      </div>
                    ) : (
                      <span className="text-green-600 font-semibold">0</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium w-16">{member.workload}</span>
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="w-32">
                      <Progress value={member.completionRate} className="h-2" />
                      <p className="text-xs text-right text-muted-foreground mt-1">{member.completionRate}%</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
