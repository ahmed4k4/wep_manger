'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { logActivity } from '@/lib/db/queries/activity';
import { createNotificationsForUsers } from '@/lib/db/queries/notifications';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateNote(title: string, content: string) {
  if (!title.trim() || title.trim().length > 160) return 'Title must be between 1 and 160 characters';
  if (!content.trim() || content.trim().length > 20000) return 'Note content must be between 1 and 20000 characters';
  return null;
}

export async function createProjectNoteAction(projectId: string, title: string, content: string) {
  const invalid = validateNote(title, content);
  if (!uuidPattern.test(projectId) || invalid) return { success: false, error: invalid || 'Invalid project' };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const { data, error } = await supabase.from('project_notes')
    .insert({ project_id: projectId, author_id: user.id, title: title.trim(), content: content.trim() })
    .select('id, project_id, author_id, title, content, is_pinned, created_at, updated_at, deleted_at')
    .single();
  if (error) return { success: false, error: error.message };
  await logActivity({ project_id: projectId, user_id: user.id, action: 'NOTE_CREATED', entity_type: 'note', entity_id: data.id, metadata: { title: data.title } });
  const { data: members } = await supabase.from('project_members').select('user_id').eq('project_id', projectId).neq('user_id', user.id);
  if (members?.length) await createNotificationsForUsers({
    user_ids: members.map((member) => member.user_id), project_id: projectId, type: 'NOTE_CREATED',
    title: `New project note: ${data.title}`, message: 'A project member added a note.',
    action_url: `/projects/${projectId}/notes`, action_label: 'View Notes', metadata: { note_id: data.id, author_id: user.id },
  });
  revalidatePath(`/projects/${projectId}/notes`);
  return { success: true, note: data };
}

export async function updateProjectNoteAction(noteId: string, title: string, content: string, isPinned: boolean) {
  const invalid = validateNote(title, content);
  if (!uuidPattern.test(noteId) || invalid) return { success: false, error: invalid || 'Invalid note' };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const { data, error } = await supabase.from('project_notes')
    .update({ title: title.trim(), content: content.trim(), is_pinned: isPinned })
    .eq('id', noteId).select('id, project_id, author_id, title, content, is_pinned, created_at, updated_at, deleted_at').single();
  if (error) return { success: false, error: error.message };
  await logActivity({ project_id: data.project_id, user_id: user.id, action: 'NOTE_UPDATED', entity_type: 'note', entity_id: data.id, metadata: { title: data.title } });
  revalidatePath(`/projects/${data.project_id}/notes`);
  return { success: true, note: data };
}

export async function deleteProjectNoteAction(noteId: string) {
  if (!uuidPattern.test(noteId)) return { success: false, error: 'Invalid note' };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const { data, error } = await supabase.from('project_notes').delete().eq('id', noteId).select('project_id').single();
  if (error) return { success: false, error: error.message };
  await logActivity({ project_id: data.project_id, user_id: user.id, action: 'NOTE_DELETED', entity_type: 'note', entity_id: noteId });
  revalidatePath(`/projects/${data.project_id}/notes`);
  return { success: true };
}

export async function createUserNoteAction(projectId: string, title: string, content: string) {
  const invalid = validateNote(title, content);
  if (!uuidPattern.test(projectId) || invalid) return { success: false, error: invalid || 'Invalid project' };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const { data, error } = await supabase.from('user_notes')
    .insert({ user_id: user.id, project_id: projectId, title: title.trim(), content: content.trim() })
    .select('id, user_id, project_id, title, content, is_pinned, created_at, updated_at, deleted_at').single();
  if (error) return { success: false, error: error.message };
  revalidatePath('/notes');
  return { success: true, note: data };
}

export async function updateUserNoteAction(noteId: string, title: string, content: string, isPinned: boolean) {
  const invalid = validateNote(title, content);
  if (!uuidPattern.test(noteId) || invalid) return { success: false, error: invalid || 'Invalid note' };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const { data, error } = await supabase.from('user_notes')
    .update({ title: title.trim(), content: content.trim(), is_pinned: isPinned })
    .eq('id', noteId).eq('user_id', user.id)
    .select('id, user_id, project_id, title, content, is_pinned, created_at, updated_at, deleted_at').single();
  if (error) return { success: false, error: error.message };
  revalidatePath('/notes');
  return { success: true, note: data };
}

export async function deleteUserNoteAction(noteId: string) {
  if (!uuidPattern.test(noteId)) return { success: false, error: 'Invalid note' };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const { error } = await supabase.from('user_notes').delete().eq('id', noteId).eq('user_id', user.id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/notes');
  return { success: true };
}
