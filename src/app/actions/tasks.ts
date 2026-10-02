/**
 * Task Server Actions
 * Server-side mutations for tasks - called from Client Components
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createTask as createTaskQuery,
  updateTask as updateTaskQuery,
  deleteTask as deleteTaskQuery,
  getTaskById as getTaskByIdQuery,
  reorderTasks as reorderTasksQuery,
  canManageTask,
  canAssignTask,
  canCommentOnTask,
  createTaskComment as createTaskCommentQuery,
  updateTaskComment as updateTaskCommentQuery,
  deleteTaskComment as deleteTaskCommentQuery,
  addTaskAttachment as addTaskAttachmentQuery,
  removeTaskAttachment as removeTaskAttachmentQuery,
} from '@/lib/db/queries/tasks';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  CreateCommentInput,
  UpdateCommentInput,
  TaskStatus,
  TaskPriority,
} from '@/types/project';

// ============================================================================
// Task Actions
// ============================================================================

/**
 * Create a new task
 */
export async function createTaskAction(
  input: CreateTaskInput
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const { data, error } = await createTaskQuery(input);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${input.project_id}/tasks`);
    revalidatePath(`/projects/${input.project_id}/overview`);
    revalidatePath('/tasks');
    redirect(`/projects/${input.project_id}/tasks/${data!.id}`);
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
      throw err;
    }
    return { success: false, error: 'Failed to create task' };
  }
}

/**
 * Update a task
 */
export async function updateTaskAction(
  taskId: string,
  input: UpdateTaskInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get task to find project_id for revalidation
    const { data: task } = await getTaskByIdQuery(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // Check permission
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const canManage = await canManageTask(taskId, userData.user.id);
    if (!canManage) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Additional check for assignee changes - only owners/admins can reassign
    if (input.assignee_id !== undefined && input.assignee_id !== task.assignee_id) {
      const canAssign = await canAssignTask(task.project_id, userData.user.id);
      if (!canAssign) {
        return { success: false, error: 'Only project owners and admins can reassign tasks' };
      }
    }

    const { error } = await updateTaskQuery(taskId, input);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${task.project_id}/tasks`);
    revalidatePath(`/projects/${task.project_id}/tasks/${taskId}`);
    revalidatePath(`/projects/${task.project_id}/overview`);
    revalidatePath('/tasks');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update task' };
  }
}

/**
 * Delete (archive) a task
 */
export async function deleteTaskAction(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get task for revalidation
    const { data: task } = await getTaskByIdQuery(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // Check permission
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const canManage = await canManageTask(taskId, userData.user.id);
    if (!canManage) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const { error } = await deleteTaskQuery(taskId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${task.project_id}/tasks`);
    revalidatePath(`/projects/${task.project_id}/overview`);
    revalidatePath('/tasks');
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete task' };
  }
}

/**
 * Reorder tasks (drag and drop)
 */
export async function reorderTasksAction(
  taskIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get project_id from first task
    const { data: firstTask } = await getTaskByIdQuery(taskIds[0]);
    if (!firstTask) {
      return { success: false, error: 'Task not found' };
    }

    // Check permission (need to be project member with edit rights)
    const canManage = await canManageTask(taskIds[0], userData.user.id);
    if (!canManage) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const { error } = await reorderTasksQuery(taskIds);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${firstTask.project_id}/tasks`);
    revalidatePath(`/projects/${firstTask.project_id}/kanban`);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to reorder tasks' };
  }
}

/**
 * Quick status update (for Kanban drag-drop)
 */
export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus
): Promise<{ success: boolean; error?: string }> {
  return updateTaskAction(taskId, { status });
}

/**
 * Quick priority update
 */
export async function updateTaskPriorityAction(
  taskId: string,
  priority: TaskPriority
): Promise<{ success: boolean; error?: string }> {
  return updateTaskAction(taskId, { priority });
}

/**
 * Quick progress update
 */
export async function updateTaskProgressAction(
  taskId: string,
  progress: number
): Promise<{ success: boolean; error?: string }> {
  if (progress < 0 || progress > 100) {
    return { success: false, error: 'Progress must be between 0 and 100' };
  }
  return updateTaskAction(taskId, { progress });
}

/**
 * Assign task to user
 */
export async function assignTaskAction(
  taskId: string,
  assigneeId: string | null
): Promise<{ success: boolean; error?: string }> {
  return updateTaskAction(taskId, { assignee_id: assigneeId });
}

/**
 * Update task due date
 */
export async function updateTaskDueDateAction(
  taskId: string,
  dueDate: string | null
): Promise<{ success: boolean; error?: string }> {
  return updateTaskAction(taskId, { due_date: dueDate });
}

// ============================================================================
// Task Comment Actions
// ============================================================================

/**
 * Create a task comment
 */
export async function createTaskCommentAction(
  input: CreateCommentInput
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  try {
    // Get task for permission check
    const { data: task } = await getTaskByIdQuery(input.task_id);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // Check permission
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const canComment = await canCommentOnTask(input.task_id, userData.user.id);
    if (!canComment) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const { data, error } = await createTaskCommentQuery(input);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${task.project_id}/tasks/${input.task_id}`);
    return { success: true, commentId: data!.id };
  } catch {
    return { success: false, error: 'Failed to create comment' };
  }
}

/**
 * Update a task comment
 */
export async function updateTaskCommentAction(
  commentId: string,
  input: UpdateCommentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // The query already checks user_id, but we can add additional validation here
    const { error } = await updateTaskCommentQuery(commentId, input);

    if (error) {
      return { success: false, error: error.message };
    }

    // Need to get task for revalidation
    const { data: comment } = await supabase
      .from('task_comments')
      .select('task_id')
      .eq('id', commentId)
      .single();

    if (comment) {
      const { data: task } = await getTaskByIdQuery(comment.task_id);
      if (task) {
        revalidatePath(`/projects/${task.project_id}/tasks/${comment.task_id}`);
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update comment' };
  }
}

/**
 * Delete a task comment
 */
export async function deleteTaskCommentAction(
  commentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get task for revalidation
    const { data: comment } = await supabase
      .from('task_comments')
      .select('task_id')
      .eq('id', commentId)
      .single();

    const { error } = await deleteTaskCommentQuery(commentId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (comment) {
      const { data: task } = await getTaskByIdQuery(comment.task_id);
      if (task) {
        revalidatePath(`/projects/${task.project_id}/tasks/${comment.task_id}`);
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete comment' };
  }
}

// ============================================================================
// Task Attachment Actions
// ============================================================================

/**
 * Add attachment to task
 */
export async function addTaskAttachmentAction(
  taskId: string,
  fileId: string
): Promise<{ success: boolean; attachmentId?: string; error?: string }> {
  try {
    // Get task for permission check
    const { data: task } = await getTaskByIdQuery(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    // Check permission
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const canManage = await canManageTask(taskId, userData.user.id);
    if (!canManage) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const { data, error } = await addTaskAttachmentQuery(taskId, fileId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${task.project_id}/tasks/${taskId}`);
    return { success: true, attachmentId: data!.id };
  } catch {
    return { success: false, error: 'Failed to add attachment' };
  }
}

/**
 * Remove attachment from task
 */
export async function removeTaskAttachmentAction(
  attachmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createSupabaseServerClient } = await import('@/lib/db/supabase-server');
    const supabase = await createSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get attachment for revalidation
    const { data: attachment } = await supabase
      .from('task_attachments')
      .select('task_id')
      .eq('id', attachmentId)
      .single();

    const { error } = await removeTaskAttachmentQuery(attachmentId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (attachment) {
      const { data: task } = await getTaskByIdQuery(attachment.task_id);
      if (task) {
        revalidatePath(`/projects/${task.project_id}/tasks/${attachment.task_id}`);
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to remove attachment' };
  }
}