/**
 * Projects List Page
 * Server Component - fetches projects and renders the list
 */

import { Suspense } from 'react';
import { ProjectsList } from './ProjectsList';
import { ProjectsLoadingSkeleton } from '@/components/projects/ProjectsLoadingSkeleton';
import { CreateProjectButton } from './CreateProjectButton';
import { useTranslations } from 'next-intl';

export const metadata = {
  title: 'Projects | Project Management',
  description: 'View and manage all your projects',
};

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  const t = useTranslations('projects');
  return (
    <div className="projects-page">
      <div className="projects-heading">
        <div className="min-w-0">
          <div className="page-eyebrow">{t('workspace')}</div>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        <CreateProjectButton />
      </div>

      <Suspense fallback={<ProjectsLoadingSkeleton />}>
        <ProjectsList />
      </Suspense>
    </div>
  );
}
