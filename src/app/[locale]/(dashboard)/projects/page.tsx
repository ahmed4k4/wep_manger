/**
 * Projects List Page
 * Server Component - fetches projects and renders the list
 */

import { Suspense } from 'react';
import { ProjectsList } from './ProjectsList';
import { ProjectsLoadingSkeleton } from '@/components/projects/ProjectsLoadingSkeleton';
import { CreateProjectButton } from './CreateProjectButton';
import { ThemeSwitcher } from '@/components/theme-switcher';

export const metadata = {
  title: 'Projects | Project Management',
  description: 'View and manage all your projects',
};

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all your projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <CreateProjectButton />
        </div>
      </div>

      <Suspense fallback={<ProjectsLoadingSkeleton />}>
        <ProjectsList />
      </Suspense>
    </div>
  );
}
