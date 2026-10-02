import { notFound } from 'next/navigation';
import { getProjectById, getProjectMembers } from '@/lib/db/queries/projects';
import { TaskCreateForm } from '@/components/tasks/TaskCreateForm';

export const dynamic = 'force-dynamic';

export default async function NewTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [{ data: project, error }, { data: members }] = await Promise.all([
    getProjectById(id),
    getProjectMembers(id),
  ]);

  if (error || !project) notFound();

  return <TaskCreateForm projectId={id} members={members || []} initialStatus={query.status} />;
}
