/**
 * Projects List Component
 * Server Component - fetches and renders project cards
 */

import { getUserProjects, getProjectsStatsBatch } from '@/lib/db/queries/projects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectsEmptyState } from '@/components/projects/ProjectsEmptyState';
import { ProjectsLoadingSkeleton } from '@/components/projects/ProjectsLoadingSkeleton';
import { ProjectsErrorState } from '@/components/projects/ProjectsErrorState';
import type { ProjectWithRelations } from '@/types/project';

export async function ProjectsList() {
  const { data: projects, error } = await getUserProjects({
    page: 1,
    page_size: 20,
    sort_by: 'updated_at',
    sort_order: 'desc',
  });

  if (error) {
    return <ProjectsErrorState />;
  }

  if (!projects || projects.length === 0) {
    return <ProjectsEmptyState />;
  }

  // Fetch stats and member counts for ALL projects in two batched queries
  // (previously 2 queries per project = up to 40 round-trips on page 1).
  const { data: statsMap } = await getProjectsStatsBatch(projects.map((p) => p.id));

  const projectsWithStats = projects.map((project) => {
    const stats = statsMap[project.id];
    return {
      ...project,
      member_count: stats?.member_count ?? 0,
      task_stats: stats?.task_stats ?? { total: 0, completed: 0, in_progress: 0 },
    };
  });

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
