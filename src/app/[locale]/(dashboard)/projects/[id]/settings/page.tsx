/**
 * Project Settings Page
 * Server Component - displays project settings
 */

import { getProjectById, getProjectStats } from '@/lib/db/queries/projects';
import { ProjectSettingsContent } from '@/components/projects/ProjectSettingsContent';
import { notFound } from 'next/navigation';

interface ProjectSettingsPageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
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
    <ProjectSettingsContent project={project} stats={stats} />
  );
}