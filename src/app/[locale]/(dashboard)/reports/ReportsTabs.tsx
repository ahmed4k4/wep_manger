"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjectReportTab } from "./ProjectReportTab";
import { TeamReportTab } from "./TeamReportTab";
import { TaskReportTab } from "./TaskReportTab";
import { useTranslations } from "next-intl";

export function ReportsTabs() {
  const t = useTranslations("reports");
  const [activeTab, setActiveTab] = useState("project");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="project">{t("projectReport")}</TabsTrigger>
        <TabsTrigger value="team">{t("teamReport")}</TabsTrigger>
        <TabsTrigger value="task">{t("taskReport")}</TabsTrigger>
      </TabsList>

      <TabsContent value="project" className="space-y-6">
        <ProjectReportTab />
      </TabsContent>

      <TabsContent value="team" className="space-y-6">
        <TeamReportTab />
      </TabsContent>

      <TabsContent value="task" className="space-y-6">
        <TaskReportTab />
      </TabsContent>
    </Tabs>
  );
}
