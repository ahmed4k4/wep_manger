/**
 * Project Workspace Client
 * Main client component with tab navigation and lazy-loaded tab content
 */

'use client';

import { useState, useCallback, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProjectSidebar } from '@/components/projects/ProjectSidebar';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ProjectOverviewTab } from '@/components/projects/tabs/ProjectOverviewTab';
import { ProjectTasksTab } from '@/components/projects/tabs/ProjectTasksTab';
import { ProjectFilesTab } from '@/components/projects/tabs/ProjectFilesTab';
import { ProjectTeamTab } from '@/components/projects/tabs/ProjectTeamTab';
import { ProjectActivityTab } from '@/components/projects/tabs/ProjectActivityTab';
import { ProjectNotesTab } from '@/components/projects/tabs/ProjectNotesTab';
import { ProjectWorkspaceError } from '@/components/projects/ProjectWorkspaceError';
import type { Project, ProjectStats } from '@/types/project';
import type { TaskWithRelations } from '@/lib/db/queries/tasks';
import type { ActivityLogWithUser } from '@/lib/db/queries/activity';

interface ProjectWorkspaceClientProps {
  project: Project;
  stats?: ProjectStats | null;
  initialTasks?: TaskWithRelations[];
  initialActivity?: ActivityLogWithUser[];
  activeTab: string;
}

type TabKey = 'overview' | 'tasks' | 'files' | 'team' | 'activity' | 'notes';

const TABS: { key: TabKey; label: { ar: string; en: string }; icon: React.ReactNode }[] = [
  { key: 'overview', label: { ar: 'نظرة عامة', en: 'Overview' }, icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'tasks', label: { ar: 'المهام', en: 'Tasks' }, icon: <ClipboardList className="h-4 w-4" /> },
  { key: 'files', label: { ar: 'الملفات', en: 'Files' }, icon: <FolderOpen className="h-4 w-4" /> },
  { key: 'team', label: { ar: 'الفريق', en: 'Team' }, icon: <Users className="h-4 w-4" /> },
  { key: 'activity', label: { ar: 'النشاط', en: 'Activity' }, icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'notes', label: { ar: 'الملاحظات', en: 'Notes' }, icon: <FileText className="h-4 w-4" /> },
];

// Import icons
import {
  LayoutDashboard,
  ClipboardList,
  FolderOpen,
  Users,
  MessageSquare,
  FileText,
} from 'lucide-react';

export function ProjectWorkspaceClient({
  project,
  stats,
  initialTasks = [],
  initialActivity = [],
  activeTab: initialActiveTab,
}: ProjectWorkspaceClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [activeTab, setActiveTab] = useState<TabKey>(
    (initialActiveTab as TabKey) || 'overview'
  );

  // Sync with URL
  const updateTab = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [searchParams]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ProjectSidebar project={project} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Project Header */}
        <ProjectHeader project={project} stats={stats} />

        {/* Tab Navigation */}
        <div className="border-b bg-card px-4 hidden md:flex">
          <Tabs value={activeTab} onValueChange={(value) => updateTab(value as TabKey)} className="w-full">
            <TabsList className="w-full grid grid-cols-6 h-12" role="tablist" aria-label="Project sections">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className={cn(
                    'flex items-center justify-center gap-2 text-sm font-medium',
                    'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
                  )}
                  role="tab"
                >
                  {tab.icon}
                  <span>{tab.label[isArabic ? 'ar' : 'en']}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="border-b bg-card px-2 md:hidden overflow-x-auto">
          <Tabs value={activeTab} onValueChange={(value) => updateTab(value as TabKey)} className="w-max">
            <TabsList className="h-10 min-w-max gap-1" role="tablist" aria-label="Project sections">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium whitespace-nowrap px-3',
                    'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
                  )}
                  role="tab"
                >
                  {tab.icon}
                  <span>{tab.label[isArabic ? 'ar' : 'en']}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content */}
        <main className="flex-1 overflow-auto" role="tabpanel" aria-labelledby="project-tabs">
          {activeTab === 'overview' && (
            <ProjectOverviewTab project={project} stats={stats} initialTasks={initialTasks} initialActivity={initialActivity} />
          )}
          {activeTab === 'tasks' && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <ProjectTasksTab projectId={project.id} project={project} />
            </Suspense>
          )}
          {activeTab === 'files' && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <ProjectFilesTab projectId={project.id} project={project} />
            </Suspense>
          )}
          {activeTab === 'team' && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <ProjectTeamTab projectId={project.id} project={project} />
            </Suspense>
          )}
          {activeTab === 'activity' && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <ProjectActivityTab projectId={project.id} project={project} initialActivity={initialActivity} />
            </Suspense>
          )}
          {activeTab === 'notes' && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <ProjectNotesTab projectId={project.id} project={project} />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}

function TabLoadingSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-muted rounded" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 bg-card border rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
              <div className="h-12 w-12 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}