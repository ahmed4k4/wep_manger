import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getProjectReportData, getTeamReportData, getTaskReportData } from "@/lib/db/queries/reports";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") as "project" | "team" | "task";
  const format = searchParams.get("format") as "csv" | "pdf";
  const projectId = searchParams.get("projectId") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status")?.split(",") || undefined;
  const priority = searchParams.get("priority")?.split(",") || undefined;

  if (!type || !format) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filters = {
    projectId,
    userId,
    dateRange: {
      from: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: to ? new Date(to) : new Date(),
      preset: "custom" as const,
    },
    status,
    priority,
  };

  let reportData: any;
  let error: string | null = null;

  switch (type) {
    case "project":
      if (!projectId) {
        return NextResponse.json({ error: "Project ID required for project report" }, { status: 400 });
      }
      const projectResult = await getProjectReportData(filters);
      reportData = projectResult.data;
      error = projectResult.error;
      break;
    case "team":
      if (!projectId) {
        return NextResponse.json({ error: "Project ID required for team report" }, { status: 400 });
      }
      const teamResult = await getTeamReportData(filters);
      reportData = teamResult.data;
      error = teamResult.error;
      break;
    case "task":
      if (!projectId) {
        return NextResponse.json({ error: "Project ID required for task report" }, { status: 400 });
      }
      const taskResult = await getTaskReportData(filters);
      reportData = taskResult.data;
      error = taskResult.error;
      break;
    default:
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!reportData) {
    return NextResponse.json({ error: "No data found" }, { status: 404 });
  }

  if (format === "csv") {
    const csv = generateCSV(type, reportData);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${type}-report-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  // For PDF, we'd need a PDF generation library
  // For now, return a simple text response
  return NextResponse.json({ error: "PDF export not yet implemented" }, { status: 501 });
}

function generateCSV(type: string, data: any): string {
  let csv = "";

  switch (type) {
    case "project":
      if (!data) return "";
      csv = [
        ["Metric", "Value"],
        ["Project Name", data.projectName],
        ["Project Key", data.projectKey],
        ["Total Tasks", data.totalTasks.toString()],
        ["Completed Tasks", data.completedTasks.toString()],
        ["Active Tasks", data.activeTasks.toString()],
        ["Overdue Tasks", data.overdueTasks.toString()],
        ["Progress %", data.progress.toString()],
        ["Completion Rate %", data.completionRate.toString()],
        ["Team Members", data.teamMembers.toString()],
        ["Files Count", data.filesCount.toString()],
      ].map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(",")).join("\n");
      break;

    case "team":
      if (!Array.isArray(data)) return "";
      csv = [
        ["User", "Assigned Tasks", "Completed Tasks", "Overdue Tasks", "Workload", "Completion Rate %"],
        ...data.map((m: any) => [
          m.userName,
          m.assignedTasks.toString(),
          m.completedTasks.toString(),
          m.overdueTasks.toString(),
          m.workload.toString(),
          m.completionRate.toString(),
        ]),
      ].map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(",")).join("\n");
      break;

    case "task":
      if (!data) return "";
      csv = [
        ["Status", "Count"],
        ...data.tasksByStatus.map((s: any) => [s.status, s.count.toString()]),
        [],
        ["Priority", "Count"],
        ...data.tasksByPriority.map((p: any) => [p.priority, p.count.toString()]),
        [],
        ["Date", "Created", "Completed"],
        ...data.createdVsCompleted.map((c: any) => [c.date, c.created.toString(), c.completed.toString()]),
      ].map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(",")).join("\n");
      break;
  }

  return csv;
}
