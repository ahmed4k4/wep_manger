'use server';

/**
 * Notification Server Actions
 * Used by Server Components and Client Components
 */

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { revalidatePath } from 'next/cache';
import type { NotificationType } from '@/types/project';
import { 
  getNotifications, 
  getUnreadNotificationCount, 
  markNotificationAsRead, 
  markNotificationsAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  getRecentNotifications,
  createNotification,
  createNotificationsForUsers
} from '@/lib/db/queries/notifications';

// ============================================================================
// Fetch Actions
// ============================================================================

export async function getNotificationsAction(filters: {
  project_id?: string;
  type?: NotificationType;
  read?: boolean;
  page?: number;
  page_size?: number;
} = {}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], count: 0, error: 'Unauthorized' };
  }

  const { data, count, error } = await getNotifications({
    user_id: user.id,
    ...filters,
  });

  return { data, count: count || 0, error: error?.message || null };
}

export async function getUnreadNotificationCountAction(projectId?: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { count: 0, error: 'Unauthorized' };
  }

  const { count, error } = await getUnreadNotificationCount(user.id, projectId);

  return { count: count || 0, error: error?.message || null };
}

export async function getRecentNotificationsAction(limit = 10) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Unauthorized' };
  }

  const { data, error } = await getRecentNotifications(user.id, limit);

  return { data: data || [], error: error?.message || null };
}

// ============================================================================
// Mutation Actions
// ============================================================================

export async function markNotificationAsReadAction(notificationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data, error } = await markNotificationAsRead(notificationId, user.id);

  if (!error) {
    revalidatePath('/notifications');
    revalidatePath('/api/notifications');
  }

  return { data, error: error?.message || null };
}

export async function markNotificationsAsReadAction(notificationIds: string[]) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data, error } = await markNotificationsAsRead(notificationIds, user.id);

  if (!error) {
    revalidatePath('/notifications');
    revalidatePath('/api/notifications');
  }

  return { data, error: error?.message || null };
}

export async function markAllNotificationsAsReadAction(projectId?: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data, error } = await markAllNotificationsAsRead(user.id, projectId);

  if (!error) {
    revalidatePath('/notifications');
    revalidatePath('/api/notifications');
  }

  return { data, error: error?.message || null };
}

export async function deleteNotificationAction(notificationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await deleteNotification(notificationId, user.id);

  if (!error) {
    revalidatePath('/notifications');
    revalidatePath('/api/notifications');
  }

  return { error: error?.message || null };
}

// ============================================================================
// Notification Creation Helpers (used by other server actions)
// ============================================================================

/**
 * Create task assigned notification
 */
async function createTaskAssignedNotification(
  assigneeId: string,
  taskId: string,
  taskTitle: string,
  projectId: string,
  projectName: string,
  projectKey: string,
  assignedBy: string
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: assignedByUser } } = await supabase.auth.getUser();

  // Don't notify if user assigned to themselves
  if (assigneeId === assignedByUser?.id) {
    return { data: null, error: null };
  }

  return createNotification({
    user_id: assigneeId,
    project_id: projectId,
    type: 'TASK_ASSIGNED',
    title: `Task Assigned: ${taskTitle}`,
    message: `${assignedByUser?.user_metadata?.full_name || 'Someone'} assigned you to "${taskTitle}" in ${projectName} (${projectKey})`,
    action_url: `/projects/${projectId}/tasks/${taskId}`,
    action_label: 'View Task',
    metadata: { task_id: taskId, assigned_by: assignedByUser?.id },
  });
}

/**
 * Create task status changed notification
 */
async function createTaskStatusChangedNotification(
  recipientIds: string[],
  taskId: string,
  taskTitle: string,
  projectId: string,
  projectName: string,
  projectKey: string,
  oldStatus: string,
  newStatus: string,
  changedBy: string
) {
  if (!recipientIds.length) return { data: [], error: null };

  return createNotificationsForUsers({
    user_ids: recipientIds.filter(id => id !== changedBy), // Don't notify the person who made the change
    project_id: projectId,
    type: 'TASK_STATUS_CHANGED',
    title: `Task Status Changed: ${taskTitle}`,
    message: `Status changed from ${oldStatus} to ${newStatus} in ${projectName} (${projectKey})`,
    action_url: `/projects/${projectId}/tasks/${taskId}`,
    action_label: 'View Task',
    metadata: { task_id: taskId, old_status: oldStatus, new_status: newStatus, changed_by: changedBy },
  });
}

/**
 * Create task priority changed notification
 */
async function createTaskPriorityChangedNotification(
  recipientIds: string[],
  taskId: string,
  taskTitle: string,
  projectId: string,
  projectName: string,
  projectKey: string,
  oldPriority: string,
  newPriority: string,
  changedBy: string
) {
  if (!recipientIds.length) return { data: [], error: null };

  return createNotificationsForUsers({
    user_ids: recipientIds.filter(id => id !== changedBy),
    project_id: projectId,
    type: 'TASK_UPDATED',
    title: `Task Priority Changed: ${taskTitle}`,
    message: `Priority changed from ${oldPriority} to ${newPriority} in ${projectName} (${projectKey})`,
    action_url: `/projects/${projectId}/tasks/${taskId}`,
    action_label: 'View Task',
    metadata: { task_id: taskId, old_priority: oldPriority, new_priority: newPriority, changed_by: changedBy },
  });
}

/**
 * Create task due date changed notification
 */
async function createTaskDueDateChangedNotification(
  recipientIds: string[],
  taskId: string,
  taskTitle: string,
  projectId: string,
  projectName: string,
  projectKey: string,
  oldDueDate: string | null,
  newDueDate: string | null,
  changedBy: string
) {
  if (!recipientIds.length) return { data: [], error: null };

  const oldDate = oldDueDate ? new Date(oldDueDate).toLocaleDateString() : 'no due date';
  const newDate = newDueDate ? new Date(newDueDate).toLocaleDateString() : 'no due date';

  return createNotificationsForUsers({
    user_ids: recipientIds.filter(id => id !== changedBy),
    project_id: projectId,
    type: 'TASK_UPDATED',
    title: `Task Due Date Changed: ${taskTitle}`,
    message: `Due date changed from ${oldDate} to ${newDate} in ${projectName} (${projectKey})`,
    action_url: `/projects/${projectId}/tasks/${taskId}`,
    action_label: 'View Task',
    metadata: { task_id: taskId, old_due_date: oldDueDate, new_due_date: newDueDate, changed_by: changedBy },
  });
}

/**
 * Create user added to project notification
 */
async function createUserAddedToProjectNotification(
  userId: string,
  projectId: string,
  projectName: string,
  projectKey: string,
  addedBy: string,
  role: string
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: addedByUser } } = await supabase.auth.getUser();

  if (userId === addedByUser?.id) {
    return { data: null, error: null };
  }

  return createNotification({
    user_id: userId,
    project_id: projectId,
    type: 'MEMBER_ADDED',
    title: `Added to Project: ${projectName}`,
    message: `${addedByUser?.user_metadata?.full_name || 'Someone'} added you to ${projectName} (${projectKey}) as ${role}`,
    action_url: `/projects/${projectId}`,
    action_label: 'View Project',
    metadata: { added_by: addedByUser?.id, role },
  });
}

/**
 * Create user removed from project notification
 */
async function createUserRemovedFromProjectNotification(
  userId: string,
  projectId: string,
  projectName: string,
  projectKey: string,
  removedBy: string
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: removedByUser } } = await supabase.auth.getUser();

  // Notify the removed user (they're no longer a member, so project_id is for context only)
  return createNotification({
    user_id: userId,
    project_id: projectId,
    type: 'MEMBER_ROLE_CHANGED', // Using closest available type
    title: `Removed from Project: ${projectName}`,
    message: `${removedByUser?.user_metadata?.full_name || 'Someone'} removed you from ${projectName} (${projectKey})`,
    action_url: '/projects',
    action_label: 'View Projects',
    metadata: { removed_by: removedByUser?.id },
  });
}

/**
 * Create comment notification
 */
async function createCommentNotification(
  recipientIds: string[],
  taskId: string,
  taskTitle: string,
  projectId: string,
  projectName: string,
  projectKey: string,
  commentId: string,
  commentAuthorId: string,
  commentContent: string
) {
  if (!recipientIds.length) return { data: [], error: null };

  const supabase = await createSupabaseServerClient();
  const { data: { user: authorUser } } = await supabase.auth.getUser();

  // Don't notify the comment author
  const filteredRecipients = recipientIds.filter(id => id !== commentAuthorId);

  if (!filteredRecipients.length) return { data: [], error: null };

  return createNotificationsForUsers({
    user_ids: filteredRecipients,
    project_id: projectId,
    type: 'TASK_COMMENT',
    title: `New Comment on: ${taskTitle}`,
    message: `${authorUser?.user_metadata?.full_name || 'Someone'} commented on "${taskTitle}" in ${projectName} (${projectKey})`,
    action_url: `/projects/${projectId}/tasks/${taskId}?comment=${commentId}`,
    action_label: 'View Comment',
    metadata: { task_id: taskId, comment_id: commentId, comment_author: commentAuthorId, content_preview: commentContent.slice(0, 100) },
  });
}

/**
 * Create file uploaded notification
 */
async function createFileUploadedNotification(
  recipientIds: string[],
  fileId: string,
  fileName: string,
  projectId: string,
  projectName: string,
  projectKey: string,
  uploadedBy: string
) {
  if (!recipientIds.length) return { data: [], error: null };

  const supabase = await createSupabaseServerClient();
  const { data: { user: uploadedByUser } } = await supabase.auth.getUser();

  const filteredRecipients = recipientIds.filter(id => id !== uploadedBy);

  if (!filteredRecipients.length) return { data: [], error: null };

  return createNotificationsForUsers({
    user_ids: filteredRecipients,
    project_id: projectId,
    type: 'FILE_UPLOADED',
    title: `File Uploaded: ${fileName}`,
    message: `${uploadedByUser?.user_metadata?.full_name || 'Someone'} uploaded "${fileName}" to ${projectName} (${projectKey})`,
    action_url: `/projects/${projectId}/files/${fileId}`,
    action_label: 'View File',
    metadata: { file_id: fileId, file_name: fileName, uploaded_by: uploadedBy },
  });
}
