/**
 * Project Workspace Page
 * Premium project workspace with tabs: Overview, Tasks, Files, Team, Activity, Notes
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { getProjectById, getProjectStats } from '@/lib/db/queries/projects';
import { getTasks } from '@/lib/db/queries/tasks';
import { getActivityLogs } from '@/lib/db/queries/activity';
import { ProjectWorkspaceClient } from './workspace-client';
import { WorkspaceLoadingSkeleton } from '@/components/projects/WorkspaceLoadingSkeleton';
import { notFound } from 'next/navigation';

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: WorkspacePageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: project } = await getProjectById(id);
  return {
    title: project ? `Workspace - ${project.name}` : 'Workspace',
  };
}

export default async function WorkspacePage({ params, searchParams }: WorkspacePageProps) {
  const { id } = await params;
  const { tab = 'overview' } = await searchParams;

  const [{ data: project, error: projectError }, { data: stats }, { data: tasks }, { data: activity }] =
    await Promise.all([
      getProjectById(id),
      getProjectStats(id),
      getTasks({ project_id: id, page: 1, page_size: 5, sort_by: 'updated_at', sort_order: 'desc' }),
      getActivityLogs({ project_id: id, page: 1, page_size: 5 }),
    ]);

  if (projectError || !project) {
    notFound();
  }

  return (
    <Suspense fallback={<WorkspaceLoadingSkeleton />}>
      <ProjectWorkspaceClient
        project={project}
        stats={stats}
        initialTasks={tasks || []}
        initialActivity={activity || []}
        activeTab={tab}
      />
    </Suspense>
  );
}