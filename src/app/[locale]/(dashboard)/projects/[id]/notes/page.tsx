import { NotesManager, type NoteRecord } from '@/components/notes/NotesManager';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getUserProjectRole } from '@/lib/db/queries/projects';

export default async function ProjectNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <p className="rounded-xl border p-6 text-sm text-muted-foreground">Sign in to view project notes.</p>;
  const [{ data, error }, role] = await Promise.all([
    supabase.from('project_notes')
    .select('id, project_id, author_id, title, content, is_pinned, created_at, updated_at, deleted_at')
    .eq('project_id', id).is('deleted_at', null).order('is_pinned', { ascending: false }).order('updated_at', { ascending: false }),
    getUserProjectRole(id, user.id),
  ]);
  if (error) throw new Error(error.message);
  return <NotesManager mode="project" projectId={id} currentUserId={user.id} canCreate={role !== 'VIEWER'} canManageAll={role === 'OWNER' || role === 'ADMIN'} initialNotes={(data || []) as NoteRecord[]} />;
}
