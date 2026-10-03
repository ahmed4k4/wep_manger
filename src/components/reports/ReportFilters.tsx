"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronDown, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ReportFilters, DateRange } from "@/types/reports";

interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  projects: { id: string; name: string; key: string }[];
  users: { id: string; name: string }[];
  showUserFilter?: boolean;
}

export function ReportFilters({ filters, onFiltersChange, projects, users, showUserFilter = true }: ReportFiltersProps) {
  const t = useTranslations("reports");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: filters.dateRange.from instanceof Date ? filters.dateRange.from : new Date(filters.dateRange.from),
    to: filters.dateRange.to instanceof Date ? filters.dateRange.to : new Date(filters.dateRange.to),
    preset: filters.dateRange.preset,
  });

  useEffect(() => {
    if (filters.dateRange.from instanceof Date) {
      setDateRange({
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        preset: filters.dateRange.preset,
      });
    } else {
      setDateRange({
        from: new Date(filters.dateRange.from),
        to: new Date(filters.dateRange.to),
        preset: filters.dateRange.preset,
      });
    }
  }, [filters.dateRange]);

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    onFiltersChange({
      ...filters,
      dateRange: newRange,
    });
  };

  const handlePresetChange = (preset: DateRange["preset"]) => {
    const now = new Date();
    let from: Date;
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    switch (preset) {
      case "7d":
        from = new Date(now);
        from.setDate(from.getDate() - 7);
        break;
      case "30d":
        from = new Date(now);
        from.setDate(from.getDate() - 30);
        break;
      case "90d":
        from = new Date(now);
        from.setDate(from.getDate() - 90);
        break;
      default:
        return;
    }
    from.setHours(0, 0, 0, 0);

    const newRange = { from, to, preset };
    setDateRange(newRange);
    onFiltersChange({ ...filters, dateRange: newRange });
  };

  const hasActiveFilters =
    filters.projectId ||
    (showUserFilter && filters.userId) ||
    filters.dateRange.preset !== "30d" ||
    (filters.status && filters.status.length > 0) ||
    (filters.priority && filters.priority.length > 0);

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-card border rounded-lg">
      {/* Project Filter */}
      <Select value={filters.projectId || ""} onValueChange={(value) => onFiltersChange({ ...filters, projectId: value || undefined })}>
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder={t("filters.allProjects")} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.key} - {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* User Filter */}
      {showUserFilter && users.length > 0 && (
        <Select value={filters.userId || ""} onValueChange={(value) => onFiltersChange({ ...filters, userId: value || undefined })}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder={t("filters.allUsers")} />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("flex items-center gap-2 h-10", hasActiveFilters && "border-primary text-primary")}
          >
            <Calendar className="h-4 w-4" />
            <span>{format(dateRange.from, "PP")} - {format(dateRange.to, "PP")}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <Button
                variant={dateRange.preset === "7d" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => handlePresetChange("7d")}
              >
                {t("filters.last7Days")}
              </Button>
              <Button
                variant={dateRange.preset === "30d" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => handlePresetChange("30d")}
              >
                {t("filters.last30Days")}
              </Button>
              <Button
                variant={dateRange.preset === "90d" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => handlePresetChange("90d")}
              >
                {t("filters.last90Days")}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("filters.from")}</label>
                <input
                  type="date"
                  value={format(dateRange.from, "yyyy-MM-dd")}
                  onChange={(e) => handleDateRangeChange({ ...dateRange, from: new Date(e.target.value), preset: "custom" })}
                  className="w-full h-9 px-3 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("filters.to")}</label>
                <input
                  type="date"
                  value={format(dateRange.to, "yyyy-MM-dd")}
                  onChange={(e) => handleDateRangeChange({ ...dateRange, to: new Date(e.target.value), preset: "custom" })}
                  className="w-full h-9 px-3 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Status Filter */}
      <Select
        value={filters.status?.join(",") || ""}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value ? value.split(",") : undefined })}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder={t("filters.allStatuses")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todo">{t("tasks.todo")}</SelectItem>
          <SelectItem value="in_progress">{t("tasks.inProgress")}</SelectItem>
          <SelectItem value="review">{t("tasks.review")}</SelectItem>
          <SelectItem value="done">{t("tasks.done")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={filters.priority?.join(",") || ""}
        onValueChange={(value) => onFiltersChange({ ...filters, priority: value ? value.split(",") : undefined })}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder={t("filters.allPriorities")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">{t("tasks.low")}</SelectItem>
          <SelectItem value="medium">{t("tasks.medium")}</SelectItem>
          <SelectItem value="high">{t("tasks.high")}</SelectItem>
          <SelectItem value="urgent">{t("tasks.urgent")}</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={() => onFiltersChange({ projectId: undefined, userId: undefined, dateRange: { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date(), preset: "30d" }, status: undefined, priority: undefined })} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
