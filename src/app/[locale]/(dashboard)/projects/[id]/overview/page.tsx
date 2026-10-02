/**
 * Project Overview Page
 * Server Component - displays project dashboard with stats, recent tasks, activity
 */

import { getProjectById, getProjectStats } from '@/lib/db/queries/projects';
import { ProjectOverviewContent } from '@/components/projects/ProjectOverviewContent';
import { notFound } from 'next/navigation';

interface ProjectOverviewPageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default async function ProjectOverviewPage({ params }: ProjectOverviewPageProps) {
  const { id } = await params;

  const [{ data: project, error: projectError }, { data: stats }] =
    await Promise.all([
      getProjectById(id),
      getProjectStats(id),
    ]);

  if (projectError || !project) {
    notFound();
  }

  return (
    <ProjectOverviewContent project={project} stats={stats} />
  );
}