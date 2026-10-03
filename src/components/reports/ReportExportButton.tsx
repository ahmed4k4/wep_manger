"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import type { ReportFilters } from "@/types/reports";

interface ReportExportButtonProps {
  reportType: "project" | "team" | "task";
  filters: ReportFilters;
  disabled?: boolean;
}

export function ReportExportButton({ reportType, filters, disabled = false }: ReportExportButtonProps) {
  const t = useTranslations("reports");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(format);
    try {
      // Build query params
      const params = new URLSearchParams();
      params.set("type", reportType);
      params.set("format", format);
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.dateRange.from) params.set("from", new Date(filters.dateRange.from).toISOString());
      if (filters.dateRange.to) params.set("to", new Date(filters.dateRange.to).toISOString());
      if (filters.status?.length) params.set("status", filters.status.join(","));
      if (filters.priority?.length) params.set("priority", filters.priority.join(","));

      const response = await fetch(`/api/reports/export?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}-report-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert(t("export.error"));
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || !!exporting}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("export.downloading")}
            </>
          ) : (
            t("export.title")
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")} disabled={disabled || exporting === "csv"}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {t("export.csv")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={disabled || exporting === "pdf"}>
          <FileText className="h-4 w-4 mr-2" />
          {t("export.pdf")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
