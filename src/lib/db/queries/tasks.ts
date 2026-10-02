/**
 * Task Data Access Layer
 * Server-side queries for tasks - used in Server Components and Server Actions
 */

import { createSupabaseServerClient, createSupabaseAdminClient } from '../supabase-server';
import type {
  Task,
  TaskComment,
  TaskAttachment,
  TaskStatus,
  TaskPriority,
  ProjectMember,
  Profile,
  Project,
  ProjectFile,
  PostgrestError,
} from '@/types/project';

// ============================================================================
// Task Filters & Types
// ============================================================================

export interface TaskFilters {
  project_id?: string;
  assignee_id?: string;
  created_by?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  overdue?: boolean;
  due_soon_days?: number;
  page?: number;
  page_size?: number;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'progress' | 'position';
  sort_order?: 'asc' | 'desc';
}

export type TaskWithRelations = Task & {
  assignee: Profile | null;
  creator: Profile;
  reporter: Profile | null;
  comments: TaskComment[];
  attachments: (TaskAttachment & { file: ProjectFile })[];
  project?: Pick<Project, 'id' | 'name' | 'key'>;
  comments_count?: number;
  attachments_count?: number;
};

export interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  review: number;
  blocked: number;
  completed: number;
  overdue: number;
  due_soon: number;
  by_priority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string | null;
  reporter_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  progress?: number;
  assignee_id?: string | null;
  reporter_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  position?: number;
}

export interface CreateCommentInput {
  task_id: string;
  content: string;
  parent_id?: string | null;
}

export interface UpdateCommentInput {
  content: string;
}

// ============================================================================
// Task Queries
// ============================================================================

/**
 * Get tasks with filters, pagination, and relations
 */
export async function getTasks(
  filters: TaskFilters = {}
): Promise<{ data: TaskWithRelations[]; count: number; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: [], count: 0, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const {
    project_id,
    assignee_id,
    created_by,
    status,
    priority,
    search,
    overdue,
    due_soon_days,
    page = 1,
    page_size = 20,
    sort_by = 'position',
    sort_order = 'asc',
  } = filters;

  let query = supabase
    .from('tasks')
    .select(
      `
      *,
      assignee:profiles!tasks_assignee_id_fkey(*),
      creator:profiles!tasks_created_by_fkey(*),
      reporter:profiles!tasks_reporter_id_fkey(*),
      project:projects(id, name, key),
      comments:task_comments(count),
      attachments:task_attachments(count)
    `,
      { count: 'exact' }
    )
    .is('deleted_at', null);

  // Project filter
  if (project_id) {
    query = query.eq('project_id', project_id);
  }

  // Assignee filter
  if (assignee_id) {
    query = query.eq('assignee_id', assignee_id);
  }

  // Creator filter
  if (created_by) {
    query = query.eq('created_by', created_by);
  }

  // Status filter
  if (status) {
    query = query.eq('status', status);
  }

  // Priority filter
  if (priority) {
    query = query.eq('priority', priority);
  }

  // Search
  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  // Overdue filter
  if (overdue) {
    query = query.lt('due_date', new Date().toISOString()).neq('status', 'COMPLETED');
  }

  // Due soon filter
  if (due_soon_days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + due_soon_days);
    query = query
      .lte('due_date', futureDate.toISOString())
      .gte('due_date', new Date().toISOString())
      .neq('status', 'COMPLETED');
  }

  // Sorting
  query = query.order(sort_by, { ascending: sort_order === 'asc' });

  // Pagination
  query = query.range((page - 1) * page_size, page * page_size - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: [], count: 0, error };
  }

  // Transform data to include counts
  const tasksWithCounts = (data || []).map((task) => ({
    ...task,
    comments_count: task.comments?.[0]?.count || 0,
    attachments_count: task.attachments?.[0]?.count || 0,
  })) as TaskWithRelations[];

  return { data: tasksWithCounts, count: count || 0, error: null };
}

/**
 * Get a single task by ID with full relations
 */
export async function getTaskById(
  taskId: string
): Promise<{ data: TaskWithRelations | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      *,
      assignee:profiles!tasks_assignee_id_fkey(*),
      creator:profiles!tasks_created_by_fkey(*),
      reporter:profiles!tasks_reporter_id_fkey(*),
      project:projects(id, name, key),
      comments:task_comments(count),
      attachments:task_attachments(count)
    `
    )
    .eq('id', taskId)
    .is('deleted_at', null)
    .single();

  if (error) {
    return { data: null, error };
  }

  const taskWithCounts = {
    ...data,
    comments_count: data.comments?.[0]?.count || 0,
    attachments_count: data.attachments?.[0]?.count || 0,
  } as TaskWithRelations;

  return { data: taskWithCounts, error: null };
}

/**
 * Get task statistics for a project
 */
export async function getTaskStats(
  projectId: string
): Promise<{ data: TaskStats | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  // Use materialized view if available, otherwise compute
  const { data, error } = await supabase
    .from('project_task_stats')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error };
  }

  // If materialized view doesn't exist or no data, compute from tasks
  if (!data) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status, priority, due_date')
      .eq('project_id', projectId)
      .is('deleted_at', null);

    if (tasks) {
      const now = new Date();
      const stats: TaskStats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'TODO').length,
        in_progress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        review: tasks.filter(t => t.status === 'REVIEW').length,
        blocked: tasks.filter(t => t.status === 'BLOCKED').length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'COMPLETED').length,
        due_soon: tasks.filter(t => {
          if (!t.due_date || t.status === 'COMPLETED') return false;
          const due = new Date(t.due_date);
          const diff = due.getTime() - now.getTime();
          return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000; // 3 days
        }).length,
        by_priority: {
          low: tasks.filter(t => t.priority === 'LOW').length,
          medium: tasks.filter(t => t.priority === 'MEDIUM').length,
          high: tasks.filter(t => t.priority === 'HIGH').length,
          urgent: tasks.filter(t => t.priority === 'URGENT').length,
        },
      };
      return { data: stats, error: null };
    }
  }

  return {
    data: data ? {
      total: data.total_tasks || 0,
      todo: data.todo_count || 0,
      in_progress: data.in_progress_count || 0,
      review: data.review_count || 0,
      blocked: data.blocked_count || 0,
      completed: data.completed_count || 0,
      overdue: data.overdue_count || 0,
      due_soon: data.due_soon_count || 0,
      by_priority: {
        low: data.low_priority_count || 0,
        medium: data.medium_priority_count || 0,
        high: data.high_priority_count || 0,
        urgent: data.urgent_priority_count || 0,
      },
    } : null,
    error: null,
  };
}

/**
 * Get tasks for Kanban board (grouped by status)
 */
export async function getTasksForKanban(
  projectId: string
): Promise<{ data: Record<TaskStatus, TaskWithRelations[]>; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      *,
      assignee:profiles!tasks_assignee_id_fkey(*),
      creator:profiles!tasks_created_by_fkey(*),
      reporter:profiles!tasks_reporter_id_fkey(*)
    `
    )
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('position', { ascending: true });

  if (error) {
    return { data: {} as Record<TaskStatus, TaskWithRelations[]>, error };
  }

  // Group by status
  const grouped: Record<TaskStatus, TaskWithRelations[]> = {
    TODO: [],
    IN_PROGRESS: [],
    REVIEW: [],
    BLOCKED: [],
    COMPLETED: [],
  };

  (data as TaskWithRelations[]).forEach((task) => {
    if (grouped[task.status]) {
      grouped[task.status].push(task);
    }
  });

  return { data: grouped, error: null };
}

/**
 * Get user's tasks (assigned to current user)
 */
export async function getMyTasks(
  filters: Omit<TaskFilters, 'assignee_id'> = {}
): Promise<{ data: TaskWithRelations[]; count: number; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: [], count: 0, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  return getTasks({ ...filters, assignee_id: userData.user.id });
}

/**
 * Get tasks created by user
 */
export async function getCreatedTasks(
  filters: Omit<TaskFilters, 'created_by'> = {}
): Promise<{ data: TaskWithRelations[]; count: number; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: [], count: 0, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  return getTasks({ ...filters, created_by: userData.user.id });
}

/**
 * Create a new task
 */
export async function createTask(
  input: CreateTaskInput
): Promise<{ data: Task | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  // Get max position for the project/status
  const { data: maxPosition } = await supabase
    .from('tasks')
    .select('position')
    .eq('project_id', input.project_id)
    .eq('status', input.status || 'TODO')
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: input.project_id,
      title: input.title,
      description: input.description || null,
      status: input.status || 'TODO',
      priority: input.priority || 'MEDIUM',
      assignee_id: input.assignee_id || null,
      reporter_id: input.reporter_id || userData.user.id,
      created_by: userData.user.id,
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      position: (maxPosition?.position || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // Log activity
  await logTaskActivity(data.id, userData.user.id, 'TASK_CREATED', 'task', data.id, {
    title: data.title,
    status: data.status,
    priority: data.priority,
  });

  return { data: data as Task, error: null };
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<{ data: Task | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  // Get current task for activity log
  const { data: currentTask } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  const updateData: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  // If status changed to COMPLETED, set completed_at
  if (input.status === 'COMPLETED' && currentTask?.status !== 'COMPLETED') {
    updateData.completed_at = new Date().toISOString();
    updateData.progress = 100;
  }

  // If status changed from COMPLETED, clear completed_at
  if (input.status && input.status !== 'COMPLETED' && currentTask?.status === 'COMPLETED') {
    updateData.completed_at = null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // Log activity
  const changedFields: string[] = [];
  if (input.status && input.status !== currentTask?.status) changedFields.push('status');
  if (input.priority && input.priority !== currentTask?.priority) changedFields.push('priority');
  if (input.assignee_id !== undefined && input.assignee_id !== currentTask?.assignee_id) changedFields.push('assignee');
  if (input.progress !== undefined && input.progress !== currentTask?.progress) changedFields.push('progress');

  await logTaskActivity(taskId, userData.user.id, 'TASK_UPDATED', 'task', taskId, {
    previous: currentTask,
    current: data,
    changed_fields: changedFields,
  });

  // Specific activity for status/priority/assignee changes
  if (input.status && input.status !== currentTask?.status) {
    await logTaskActivity(taskId, userData.user.id, 'TASK_STATUS_CHANGED', 'task', taskId, {
      previous_status: currentTask?.status,
      new_status: input.status,
    });
  }

  if (input.priority && input.priority !== currentTask?.priority) {
    await logTaskActivity(taskId, userData.user.id, 'TASK_PRIORITY_CHANGED', 'task', taskId, {
      previous_priority: currentTask?.priority,
      new_priority: input.priority,
    });
  }

  if (input.assignee_id !== undefined && input.assignee_id !== currentTask?.assignee_id) {
    await logTaskActivity(taskId, userData.user.id, 'TASK_ASSIGNED', 'task', taskId, {
      previous_assignee: currentTask?.assignee_id,
      new_assignee: input.assignee_id,
    });
  }

  return { data: data as Task, error: null };
}

/**
 * Soft delete a task (archive)
 */
export async function deleteTask(
  taskId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  // Get task for activity log
  const { data: task } = await supabase
    .from('tasks')
    .select('title, project_id')
    .eq('id', taskId)
    .single();

  const { error } = await supabase
    .from('tasks')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId);

  if (error) {
    return { error };
  }

  // Log activity
  await logTaskActivity(
    taskId,
    userData.user.id,
    'TASK_DELETED',
    'task',
    taskId,
    {
      title: task?.title,
      project_id: task?.project_id,
    }
  );

  return { error: null };
}

/**
 * Reorder tasks (update positions)
 */
export async function reorderTasks(
  taskIds: string[]
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const updates = taskIds.map((id, index) =>
    supabase.from('tasks').update({ position: index }).eq('id', id)
  );

  const results = await Promise.all(updates);
  const error = results.find(r => r.error)?.error;

  return { error: error || null };
}

// ============================================================================
// Task Comments
// ============================================================================

export async function getTaskComments(
  taskId: string
): Promise<{ data: TaskComment[]; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('task_comments')
    .select(
      `
      *,
      user:profiles(*)
    `
    )
    .eq('task_id', taskId)
    .is('deleted_at', null)
    .is('parent_id', null)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: [], error };
  }

  // Fetch replies for each comment
  const commentsWithReplies = await Promise.all(
    (data as TaskComment[]).map(async (comment) => {
      const { data: replies } = await supabase
        .from('task_comments')
        .select('*, user:profiles(*)')
        .eq('parent_id', comment.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      return { ...comment, replies: replies as TaskComment[] };
    })
  );

  return { data: commentsWithReplies, error: null };
}

export async function createTaskComment(
  input: CreateCommentInput
): Promise<{ data: TaskComment | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: input.task_id,
      user_id: userData.user.id,
      content: input.content,
      parent_id: input.parent_id || null,
      is_system: false,
    })
    .select('*, user:profiles(*)')
    .single();

  if (error) {
    return { data: null, error };
  }

  // Log activity
  await logTaskActivity(input.task_id, userData.user.id, 'COMMENT_CREATED', 'comment', data.id, {
    is_reply: !!input.parent_id,
  });

  return { data: data as TaskComment, error: null };
}

export async function updateTaskComment(
  commentId: string,
  input: UpdateCommentInput
): Promise<{ data: TaskComment | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { data, error } = await supabase
    .from('task_comments')
    .update({
      content: input.content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .eq('user_id', userData.user.id) // Only allow editing own comments
    .select('*, user:profiles(*)')
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as TaskComment, error: null };
}

export async function deleteTaskComment(
  commentId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  // Get comment for activity log
  const { data: comment } = await supabase
    .from('task_comments')
    .select('task_id')
    .eq('id', commentId)
    .single();

  const { error } = await supabase
    .from('task_comments')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .eq('user_id', userData.user.id); // Only allow deleting own comments

  if (error) {
    return { error };
  }

  // Log activity
  if (comment) {
    await logTaskActivity(comment.task_id, userData.user.id, 'COMMENT_DELETED', 'comment', commentId, {});
  }

  return { error: null };
}

// ============================================================================
// Task Attachments
// ============================================================================

export async function getTaskAttachments(
  taskId: string
): Promise<{ data: TaskAttachment[]; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('task_attachments')
    .select(
      `
      *,
      file:project_files(*),
      uploader:profiles(*)
    `
    )
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error };
  }

  return { data: data as TaskAttachment[], error: null };
}

export async function addTaskAttachment(
  taskId: string,
  fileId: string
): Promise<{ data: TaskAttachment | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  const { data, error } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      file_id: fileId,
      uploaded_by: userData.user.id,
    })
    .select('*, file:project_files(*), uploader:profiles(*)')
    .single();

  if (error) {
    return { data: null, error };
  }

  // Log activity
  await logTaskActivity(taskId, userData.user.id, 'FILE_UPLOADED', 'attachment', data.id, {
    file_id: fileId,
  });

  return { data: data as TaskAttachment, error: null };
}

export async function removeTaskAttachment(
  attachmentId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }

  // Get attachment for activity log
  const { data: attachment } = await supabase
    .from('task_attachments')
    .select('task_id, file_id')
    .eq('id', attachmentId)
    .single();

  const { error } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId);

  if (error) {
    return { error };
  }

  // Log activity
  if (attachment) {
    await logTaskActivity(attachment.task_id, userData.user.id, 'FILE_DELETED', 'attachment', attachmentId, {
      file_id: attachment.file_id,
    });
  }

  return { error: null };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function logTaskActivity(
  taskId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  // First get project_id from task
  const supabase = await createSupabaseServerClient();
  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .single();

  if (!task?.project_id) return;

  const adminClient = (await import('../supabase-server')).createSupabaseAdminClient();
  await adminClient.from('activity_logs').insert({
    project_id: task.project_id,
    user_id: userId,
    action: action as any,
    entity_type: entityType as any,
    entity_id: entityId,
    metadata,
  });
}

// ============================================================================
// Permission Helpers
// ============================================================================

export async function canManageTask(
  taskId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data: task } = await supabase
    .from('tasks')
    .select('project_id, assignee_id, created_by')
    .eq('id', taskId)
    .single();

  if (!task) return false;

  // Check project role
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', task.project_id)
    .eq('user_id', userId)
    .single();

  const isOwnerOrAdmin = member !== null && ['OWNER', 'ADMIN'].includes(member.role);
  const isAssignee = task.assignee_id === userId;
  const isCreator = task.created_by === userId;

  return isOwnerOrAdmin || isAssignee || isCreator;
}

export async function canAssignTask(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();

  return member !== null && ['OWNER', 'ADMIN'].includes(member.role);
}

export async function canCommentOnTask(
  taskId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data: task } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .single();

  if (!task) return false;

  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', task.project_id)
    .eq('user_id', userId)
    .single();

  return member !== null && ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(member.role);
}
