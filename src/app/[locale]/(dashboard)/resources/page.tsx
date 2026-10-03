/**
 * Resources / Files Library Page
 * Centralized file browser across all accessible projects
 */

import { getUserProjects } from '@/lib/db/queries/projects';
import { ResourcesClient } from './resources-client';

interface ResourcesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    project?: string;
    type?: string;
    sort?: string;
    order?: string;
    q?: string;
    view?: 'grid' | 'list';
  }>;
}

export const dynamic = 'force-dynamic';

export default async function ResourcesPage({ params, searchParams }: ResourcesPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const isArabic = locale === 'ar';

  // Get user's projects for filter dropdown
  const { data: projects } = await getUserProjects({
    page: 1,
    page_size: 100,
    sort_by: 'name',
    sort_order: 'asc',
  });

  return (
    <ResourcesClient
      locale={locale}
      projects={projects || []}
      initialFilters={{
        projectId: query.project || '',
        mimeType: query.type || '',
        sortBy: query.sort || 'created_at',
        sortOrder: (query.order as 'asc' | 'desc') || 'desc',
        search: query.q || '',
        view: (query.view as 'grid' | 'list') || 'grid',
      }}
    />
  );
}