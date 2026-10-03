'use server';

/**
 * Task Checklist Server Actions
 */

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import type { TaskChecklist, PostgrestError } from '@/types/project';

// ============================================================================
// Types
// ============================================================================

export interface CreateChecklistInput {
  task_id: string;
  title: string;
  position?: number;
}

export interface UpdateChecklistInput {
  title?: string;
  is_completed?: boolean;
  position?: number;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Get all checklists for a task
 */
export async function getTaskChecklists(
  taskId: string
): Promise<{ data: TaskChecklist[] | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('task_checklists')
    .select('*')
    .eq('task_id', taskId)
    .order('position', { ascending: true });

  if (error) {
    return { data: null, error };
  }

  return { data: data as TaskChecklist[], error: null };
}

/**
 * Create a new checklist item
 */
export async function createChecklistItem(
  input: CreateChecklistInput
): Promise<{ data: TaskChecklist | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  // Get max position for this task
  const { data: maxPos } = await supabase
    .from('task_checklists')
    .select('position')
    .eq('task_id', input.task_id)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('task_checklists')
    .insert({
      task_id: input.task_id,
      title: input.title,
      position: input.position ?? (maxPos?.position ?? 0) + 1,
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as TaskChecklist, error: null };
}

/**
 * Update a checklist item
 */
export async function updateChecklistItem(
  checklistId: string,
  input: UpdateChecklistInput
): Promise<{ data: TaskChecklist | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const updateData: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // If completing, set completed_at and completed_by
  if (input.is_completed === true) {
    updateData.completed_at = new Date().toISOString();
    updateData.completed_by = userData.user.id;
  } else if (input.is_completed === false) {
    updateData.completed_at = null;
    updateData.completed_by = null;
  }

  const { data, error } = await supabase
    .from('task_checklists')
    .update(updateData)
    .eq('id', checklistId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as TaskChecklist, error: null };
}

/**
 * Delete a checklist item
 */
export async function deleteChecklistItem(
  checklistId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { error } = await supabase
    .from('task_checklists')
    .delete()
    .eq('id', checklistId);

  return { error };
}

/**
 * Reorder checklist items
 */
export async function reorderChecklistItems(
  checklistIds: string[]
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const updates = checklistIds.map((id, index) =>
    supabase.from('task_checklists').update({ position: index }).eq('id', id)
  );

  const results = await Promise.all(updates);
  const error = results.find(r => r.error)?.error;

  return { error: error || null };
}