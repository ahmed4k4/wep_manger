/**
 * Projects List Component
 * Server Component - fetches and renders project cards
 */

import { getUserProjects } from '@/lib/db/queries/projects';
import { getProjectStats } from '@/lib/db/queries/projects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectsEmptyState } from '@/components/projects/ProjectsEmptyState';
import { ProjectsLoadingSkeleton } from '@/components/projects/ProjectsLoadingSkeleton';
import type { ProjectWithRelations } from '@/types/project';

export async function ProjectsList() {
  const { data: projects, error } = await getUserProjects({
    page: 1,
    page_size: 20,
    sort_by: 'updated_at',
    sort_order: 'desc',
  });

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        <p>Failed to load projects: {error.message}</p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return <ProjectsEmptyState />;
  }

  // Fetch stats for each project in parallel
  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      const { data: stats } = await getProjectStats(project.id);
      return {
        ...project,
        member_count: project.members?.length || 0,
        task_stats: stats
          ? {
              total: stats.total_tasks,
              completed: stats.completed_count,
              in_progress: stats.in_progress_count,
            }
          : {
              total: 0,
              completed: 0,
              in_progress: 0,
            },
      };
    })
  );

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="list"
      aria-label="Projects"
    >
      {projectsWithStats.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

// Suspense boundary for loading state
export async function ProjectsListWithSuspense() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {await Promise.all([
        // This will show skeleton while loading
        <ProjectsLoadingSkeleton key="skeleton" />,
        // This is the actual data
        <ProjectsList key="data" />,
      ])}
    </div>
  );
}
