/**
 * Project Overview Page
 * Server Component - displays project dashboard with stats, recent tasks, activity
 */

import { getProjectById, getProjectStats } from '@/lib/db/queries/projects';
import { ProjectOverviewContent } from '@/components/projects/ProjectOverviewContent';
import { notFound } from 'next/navigation';
import { getTasks } from '@/lib/db/queries/tasks';
import { getActivityLogs } from '@/lib/db/queries/activity';

interface ProjectOverviewPageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default async function ProjectOverviewPage({ params }: ProjectOverviewPageProps) {
  const { id } = await params;

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
    <ProjectOverviewContent project={project} stats={stats} tasks={tasks || []} activity={activity || []} />
  );
}
