'use server';

/**
 * Task Tags Server Actions
 */

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import type { Tag, PostgrestError } from '@/types/project';

// ============================================================================
// Types
// ============================================================================

export interface CreateTagInput {
  project_id: string;
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Get all tags for a project
 */
export async function getProjectTags(
  projectId: string
): Promise<{ data: Tag[] | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true });

  if (error) {
    return { data: null, error };
  }

  return { data: data as Tag[], error: null };
}

/**
 * Create a new tag
 */
export async function createTag(
  input: CreateTagInput
): Promise<{ data: Tag | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { data, error } = await supabase
    .from('tags')
    .insert({
      project_id: input.project_id,
      name: input.name,
      color: input.color ?? '#6366f1',
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as Tag, error: null };
}

/**
 * Update a tag
 */
export async function updateTag(
  tagId: string,
  input: UpdateTagInput
): Promise<{ data: Tag | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { data, error } = await supabase
    .from('tags')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tagId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as Tag, error: null };
}

/**
 * Delete a tag
 */
export async function deleteTag(
  tagId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', tagId);

  return { error };
}

/**
 * Get tags for a task
 */
export async function getTaskTags(
  taskId: string
): Promise<{ data: Tag[] | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('task_tags')
    .select('tags(*)')
    .eq('task_id', taskId);

  if (error) {
    return { data: null, error };
  }

  const tags = (data || []).map((d: any) => d.tags).filter(Boolean) as Tag[];
  return { data: tags, error: null };
}

/**
 * Add tag to task
 */
export async function addTagToTask(
  taskId: string,
  tagId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { error } = await supabase
    .from('task_tags')
    .insert({
      task_id: taskId,
      tag_id: tagId,
    });

  return { error };
}

/**
 * Remove tag from task
 */
export async function removeTagFromTask(
  taskId: string,
  tagId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { error } = await supabase
    .from('task_tags')
    .delete()
    .eq('task_id', taskId)
    .eq('tag_id', tagId);

  return { error };
}