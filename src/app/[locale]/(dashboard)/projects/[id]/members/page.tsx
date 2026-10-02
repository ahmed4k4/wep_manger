/**
 * Project Members Page
 * Server Component - displays project members with management capabilities
 */

import { getProjectById, getProjectStats, getProjectMembers, getUserProjectRole } from '@/lib/db/queries/projects';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { ProjectMembersContent } from '@/components/projects/ProjectMembersContent';
import { notFound } from 'next/navigation';

interface ProjectMembersPageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering - this page uses database queries
export const dynamic = 'force-dynamic';

export default async function ProjectMembersPage({ params }: ProjectMembersPageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const [{ data: project, error: projectError }, { data: stats }, { data: members }] =
    await Promise.all([
      getProjectById(id),
      getProjectStats(id),
      getProjectMembers(id),
    ]);

  if (projectError || !project) {
    notFound();
  }

  const currentUserId = authData.user?.id || '';
  const currentUserRole = currentUserId ? await getUserProjectRole(id, currentUserId) : null;

  return (
    <ProjectMembersContent project={project} stats={stats} members={members || []} currentUserId={currentUserId} currentUserRole={currentUserRole} />
  );
}
