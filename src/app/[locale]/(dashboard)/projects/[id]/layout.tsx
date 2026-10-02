/**
 * Project Details Layout
 * Shared layout for all project detail pages with sidebar navigation
 */

import { getProjectById, getProjectStats } from '@/lib/db/queries/projects';
import { ProjectSidebar } from '@/components/projects/ProjectSidebar';
import { ProjectHeader } from '@/components/projects/ProjectHeader';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ProjectSidebarSkeleton } from '@/components/projects/ProjectSidebarSkeleton';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
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
    <div className="min-h-screen bg-background">
      <ProjectHeader project={project} stats={stats} />
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <Suspense fallback={<ProjectSidebarSkeleton />}>
              <ProjectSidebar project={project} />
            </Suspense>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}