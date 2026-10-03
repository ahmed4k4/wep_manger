/**
 * Reports Page
 * Server Component - renders the reports dashboard with tabs for Project, Team, and Task reports
 */

import { Suspense } from "react";
import { ReportsTabs } from "./ReportsTabs";
import { ReportsLoadingSkeleton } from "@/components/reports/ReportsLoadingSkeleton";
import { useTranslations } from "next-intl";

export const metadata = {
  title: "Reports & Analytics | Project Management",
  description: "Comprehensive insights into your projects, team, and tasks",
};

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  const t = useTranslations("reports");
  return (
    <div className="reports-page space-y-6">
      <div className="projects-heading">
        <div className="min-w-0">
          <div className="page-eyebrow">{t("title")}</div>
          <h1 className="text-3xl font-bold tracking-tight">{t("subtitle")}</h1>
        </div>
      </div>

      <Suspense fallback={<ReportsLoadingSkeleton />}>
        <ReportsTabs />
      </Suspense>
    </div>
  );
}
