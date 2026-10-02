/**
 * Project Activity Page
 * Displays activity timeline for a project
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { getProjectById } from '@/lib/db/queries/projects';
import { ActivityTimelineClient } from '@/components/activity/ActivityTimelineClient';
import { ActivityLoadingSkeleton } from '@/components/activity/ActivityLoadingSkeleton';
import { ProjectSidebar } from '@/components/projects/ProjectSidebar';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: project } = await getProjectById(id);
  return {
    title: project ? `Activity - ${project.name}` : 'Activity',
  };
}

export default async function ActivityPage({ params }: PageProps) {
  const { id } = await params;
  const { data: project } = await getProjectById(id);

  if (!project) {
    return null; // Will be handled by not-found
  }

  return (
    <div className="flex h-screen bg-background">
      <ProjectSidebar project={project} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectHeader project={project} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">{project.name} Activity</h1>
            <p className="text-muted-foreground mt-1">
              Track all project activities and changes
            </p>
          </div>
          <Suspense fallback={<ActivityLoadingSkeleton />}>
            <ActivityTimelineClient projectId={id} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}