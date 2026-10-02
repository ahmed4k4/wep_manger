/**
 * Files Page Server Component
 * Fetches initial data and renders the client component
 */

import { getProjectFilesAction, getUserFilesAction } from '@/app/actions/files-queries';
import { FilesClient } from './files-client';

interface FilesPageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default async function FilesPage({ params }: FilesPageProps) {
  const { id: projectId } = await params;

  // Fetch initial data for project files (first page)
  const projectFilesResult = await getProjectFilesAction({
    project_id: projectId,
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // For user files, we'll let the client component fetch based on session
  // The server action will get the user_id from the session
  const userFilesResult = await getUserFilesAction({
    user_id: '', // Will be filled by server action from auth context
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
      initialProjectFiles={initialProjectFiles}
      initialUserFiles={initialUserFiles}
    />
  );
}
