import { NotesManager, type NoteRecord } from '@/components/notes/NotesManager';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';

export default async function PersonalNotesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ar = locale === 'ar';
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <p className="rounded-xl border p-6 text-sm text-muted-foreground">{ar ? 'سجّل الدخول لعرض ملاحظاتك.' : 'Sign in to view your notes.'}</p>;
  const [notesResult, projectsResult] = await Promise.all([
    supabase.from('user_notes').select('id, user_id, project_id, title, content, is_pinned, created_at, updated_at, deleted_at')
      .eq('user_id', user.id).is('deleted_at', null).order('is_pinned', { ascending: false }).order('updated_at', { ascending: false }),
    supabase.from('projects').select('id, name, key').is('deleted_at', null).order('name'),
  ]);
  if (notesResult.error) throw new Error(notesResult.error.message);
  if (projectsResult.error) throw new Error(projectsResult.error.message);
  return <NotesManager mode="personal" currentUserId={user.id} initialNotes={(notesResult.data || []) as NoteRecord[]} projects={projectsResult.data || []} />;
}
