/**
 * Files Page Server Component
 * Fetches initial data and renders the client component
 */

import { getProjectFilesAction, getUserFilesAction } from '@/app/actions/files-queries';
import { getProjectById, getProjectStats } from '@/lib/db/queries/projects';
import { FilesClient } from './files-client';
import { notFound } from 'next/navigation';

interface FilesPageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default async function FilesPage({ params }: FilesPageProps) {
  const { id: projectId } = await params;

  // Fetch project info for header
  const { data: project, error: projectError } = await getProjectById(projectId);
  const { data: stats } = await getProjectStats(projectId);

  if (projectError || !project) {
    notFound();
  }

  // Fetch initial data for project files (first page)
  const projectFilesResult = await getProjectFilesAction({
    project_id: projectId,
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const userFilesResult = await getUserFilesAction({
    project_id: projectId,
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const initialProjectFiles = projectFilesResult.success ? projectFilesResult.data || [] : [];
  const initialUserFiles = userFilesResult.success ? userFilesResult.data || [] : [];

  return (
    <FilesClient
      projectId={projectId}
      project={project}
      stats={stats}
      initialProjectFiles={initialProjectFiles}
      initialUserFiles={initialUserFiles}
    />
  );
}
