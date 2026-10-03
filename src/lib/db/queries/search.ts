/**
 * Global Search Data Access Layer
 * Server-side queries for global search across all entities with RLS awareness
 */

import { createSupabaseServerClient } from '../supabase-server';
import type {
  Project,
  Task,
  Profile,
  ProjectFile,
  ProjectNote,
  TaskComment,
  PostgrestError,
} from '@/types/project';

export interface SearchFilters {
  query: string;
  types?: SearchType[];
  projects?: {
    status?: Project['status'];
    owner_id?: string;
  };
  tasks?: {
    status?: Task['status'];
    priority?: Task['priority'];
    assignee_id?: string;
    project_id?: string;
    overdue?: boolean;
    due_soon_days?: number;
  };
  files?: {
    project_id?: string;
    task_id?: string;
    mime_type?: string;
    uploaded_by?: string;
    date_from?: string;
    date_to?: string;
  };
  page?: number;
  page_size?: number;
}

export type SearchType = 'projects' | 'tasks' | 'users' | 'files' | 'notes' | 'comments';

export interface SearchResultProject {
  id: string;
  type: 'project';
  title: string;
  subtitle: string;
  description: string | null;
  key: string;
  status: Project['status'];
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  created_at: string;
  updated_at: string;
  url: string;
  highlight?: {
    title?: string;
    description?: string;
  };
}

export interface SearchResultTask {
  id: string;
  type: 'task';
  title: string;
  subtitle: string;
  description: string | null;
  status: Task['status'];
  priority: Task['priority'];
  project_id: string;
  project_name: string;
  project_key: string;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  url: string;
  highlight?: {
    title?: string;
    description?: string;
  };
}

export interface SearchResultUser {
  id: string;
  type: 'user';
  title: string;
  subtitle: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Profile['role'];
  created_at: string;
  url: string;
  highlight?: {
    title?: string;
  };
}

export interface SearchResultFile {
  id: string;
  type: 'file';
  title: string;
  subtitle: string;
  name: string;
  mime_type: string;
  size: number;
  project_id: string | null;
  project_name: string | null;
  project_key: string | null;
  task_id: string | null;
  uploader_id: string;
  uploader_name: string | null;
  uploader_avatar: string | null;
  created_at: string;
  url: string;
  highlight?: {
    title?: string;
  };
}

export interface SearchResultNote {
  id: string;
  type: 'note';
  title: string;
  subtitle: string;
  content: string;
  project_id: string;
  project_name: string;
  project_key: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  url: string;
  highlight?: {
    title?: string;
    content?: string;
  };
}

export interface SearchResultComment {
  id: string;
  type: 'comment';
  title: string;
  subtitle: string;
  content: string;
  task_id: string;
  task_title: string;
  project_id: string;
  project_name: string;
  project_key: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
  url: string;
  highlight?: {
    content?: string;
  };
}

export type SearchResultItem =
  | SearchResultProject
  | SearchResultTask
  | SearchResultUser
  | SearchResultFile
  | SearchResultNote
  | SearchResultComment;

export interface SearchResults {
  projects: SearchResultProject[];
  tasks: SearchResultTask[];
  users: SearchResultUser[];
  files: SearchResultFile[];
  notes: SearchResultNote[];
  comments: SearchResultComment[];
  total: number;
}

function highlightText(text: string | null | undefined, query: string): string | undefined {
  if (!text || !query.trim()) return undefined;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const highlighted = text.replace(regex, '<mark>$1</mark>');
  return highlighted !== text ? highlighted : undefined;
}

function buildTsQuery(query: string): string {
  // Split query into terms, prefix each with *:* for prefix matching
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `${term}:*`)
    .join(' & ');
  return terms || query.trim() + ':*';
}

export async function globalSearch(
  filters: SearchFilters
): Promise<{ data: SearchResults; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return {
      data: { projects: [], tasks: [], users: [], files: [], notes: [], comments: [], total: 0 },
      error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
    };
  }

  const userId = userData.user.id;
  const query = filters.query.trim();

  if (!query || query.length < 2) {
    return {
      data: { projects: [], tasks: [], users: [], files: [], notes: [], comments: [], total: 0 },
      error: null,
    };
  }

  const tsQuery = buildTsQuery(query);
  const types = filters.types || ['projects', 'tasks', 'users', 'files', 'notes', 'comments'];
  const page = filters.page || 1;
  const pageSize = filters.page_size || 10;
  const offset = (page - 1) * pageSize;

  try {
    const results: SearchResults = {
      projects: [],
      tasks: [],
      users: [],
      files: [],
      notes: [],
      comments: [],
      total: 0,
    };

    // Run searches in parallel for better performance
    const searches = await Promise.all([
      types.includes('projects')
        ? searchProjects(supabase, userId, tsQuery, query, filters.projects, pageSize)
        : Promise.resolve([]),
      types.includes('tasks')
        ? searchTasks(supabase, userId, tsQuery, query, filters.tasks, pageSize)
        : Promise.resolve([]),
      types.includes('users')
        ? searchUsers(supabase, userId, query, pageSize)
        : Promise.resolve([]),
      types.includes('files')
        ? searchFiles(supabase, userId, tsQuery, query, filters.files, pageSize)
        : Promise.resolve([]),
      types.includes('notes')
        ? searchNotes(supabase, userId, tsQuery, query, pageSize)
        : Promise.resolve([]),
      types.includes('comments')
        ? searchComments(supabase, userId, tsQuery, query, pageSize)
        : Promise.resolve([]),
    ]);

    results.projects = searches[0];
    results.tasks = searches[1];
    results.users = searches[2];
    results.files = searches[3];
    results.notes = searches[4];
    results.comments = searches[5];

    results.total =
      results.projects.length +
      results.tasks.length +
      results.users.length +
      results.files.length +
      results.notes.length +
      results.comments.length;

    return { data: results, error: null };
  } catch (error) {
    console.error('Global search error:', error);
    return {
      data: { projects: [], tasks: [], users: [], files: [], notes: [], comments: [], total: 0 },
      error: { message: 'Search failed', code: 'SEARCH_ERROR' },
    };
  }
}

async function searchProjects(
  supabase: any,
  userId: string,
  tsQuery: string,
  originalQuery: string,
  projectFilters: SearchFilters['projects'] | undefined,
  limit: number
): Promise<SearchResultProject[]> {
  let query = supabase
    .from('projects')
    .select(
      `
      id,
      name,
      key,
      description,
      status,
      owner_id,
      created_at,
      updated_at,
      owner:profiles!projects_owner_id_fkey(id, full_name, avatar_url)
    `
    )
    .is('deleted_at', null)
    .or(`name.ilike.%${originalQuery}%,key.ilike.%${originalQuery}%,description.ilike.%${originalQuery}%`)
    .limit(limit);

  // RLS policy "Members can view active projects" handles filtering
  // The policy ensures: owner_id = auth.uid() OR is_project_member(id, auth.uid()) OR is_admin(auth.uid())

  if (projectFilters?.status) {
    query = query.eq('status', projectFilters.status);
  }
  if (projectFilters?.owner_id) {
    query = query.eq('owner_id', projectFilters.owner_id);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return (data as any[]).map((project) => ({
    id: project.id,
    type: 'project' as const,
    title: project.name,
    subtitle: `${project.key} • ${project.status}`,
    description: project.description,
    key: project.key,
    status: project.status,
    owner_id: project.owner_id,
    owner_name: project.owner?.[0]?.full_name || null,
    owner_avatar: project.owner?.[0]?.avatar_url || null,
    created_at: project.created_at,
    updated_at: project.updated_at,
    url: `/${getLocale()}/projects/${project.id}/overview`,
    highlight: {
      title: highlightText(project.name, originalQuery),
      description: highlightText(project.description, originalQuery),
    },
  }));
}

async function searchTasks(
  supabase: any,
  userId: string,
  tsQuery: string,
  originalQuery: string,
  taskFilters: SearchFilters['tasks'] | undefined,
  limit: number
): Promise<SearchResultTask[]> {
  let query = supabase
    .from('tasks')
    .select(
      `
      id,
      project_id,
      title,
      description,
      status,
      priority,
      assignee_id,
      due_date,
      created_at,
      updated_at,
      project:projects!tasks_project_id_fkey(id, name, key),
      assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
    `
    )
    .is('deleted_at', null)
    .or(`title.ilike.%${originalQuery}%,description.ilike.%${originalQuery}%`)
    .limit(limit);

  // RLS policy "Members can view project tasks" handles filtering

  if (taskFilters?.status) {
    query = query.eq('status', taskFilters.status);
  }
  if (taskFilters?.priority) {
    query = query.eq('priority', taskFilters.priority);
  }
  if (taskFilters?.assignee_id) {
    query = query.eq('assignee_id', taskFilters.assignee_id);
  }
  if (taskFilters?.project_id) {
    query = query.eq('project_id', taskFilters.project_id);
  }
  if (taskFilters?.overdue) {
    const today = new Date().toISOString().split('T')[0];
    query = query.lt('due_date', today).neq('status', 'COMPLETED');
  }
  if (taskFilters?.due_soon_days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + taskFilters.due_soon_days);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    query = query.gte('due_date', today).lte('due_date', futureDateStr).neq('status', 'COMPLETED');
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return (data as any[]).map((task) => ({
    id: task.id,
    type: 'task' as const,
    title: task.title,
    subtitle: `${task.project?.key || 'N/A'} • ${task.status} • ${task.priority}`,
    description: task.description,
    status: task.status,
    priority: task.priority,
    project_id: task.project_id,
    project_name: task.project?.name || '',
    project_key: task.project?.key || '',
    assignee_id: task.assignee_id,
    assignee_name: task.assignee?.[0]?.full_name || null,
    assignee_avatar: task.assignee?.[0]?.avatar_url || null,
    due_date: task.due_date,
    created_at: task.created_at,
    updated_at: task.updated_at,
    url: `/${getLocale()}/projects/${task.project_id}/tasks/${task.id}`,
    highlight: {
      title: highlightText(task.title, originalQuery),
      description: highlightText(task.description, originalQuery),
    },
  }));
}

async function searchUsers(
  supabase: any,
  userId: string,
  originalQuery: string,
  limit: number
): Promise<SearchResultUser[]> {
  // Search users in shared projects (RLS handles this via profiles policy)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, created_at')
    .or(`full_name.ilike.%${originalQuery}%,email.ilike.%${originalQuery}%`)
    .limit(limit);

  if (error || !data) return [];

  return (data as any[]).map((profile) => ({
    id: profile.id,
    type: 'user' as const,
    title: profile.full_name || profile.email,
    subtitle: profile.email,
    email: profile.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    role: profile.role,
    created_at: profile.created_at,
    url: `/${getLocale()}/users/${profile.id}`,
    highlight: {
      title: highlightText(profile.full_name || profile.email, originalQuery),
    },
  }));
}

async function searchFiles(
  supabase: any,
  userId: string,
  tsQuery: string,
  originalQuery: string,
  fileFilters: SearchFilters['files'] | undefined,
  limit: number
): Promise<SearchResultFile[]> {
  let query = supabase
    .from('project_files')
    .select(
      `
      id,
      project_id,
      name,
      mime_type,
      size,
      uploaded_by,
      created_at,
      project:projects!project_files_project_id_fkey(id, name, key),
      uploader:profiles!project_files_uploaded_by_fkey(id, full_name, avatar_url)
    `
    )
    .is('deleted_at', null)
    .ilike('name', `%${originalQuery}%`)
    .limit(limit);

  // RLS policy "Members can view project files" handles filtering

  if (fileFilters?.project_id) {
    query = query.eq('project_id', fileFilters.project_id);
  }
  if (fileFilters?.mime_type) {
    query = query.eq('mime_type', fileFilters.mime_type);
  }
  if (fileFilters?.uploaded_by) {
    query = query.eq('uploaded_by', fileFilters.uploaded_by);
  }
  if (fileFilters?.date_from) {
    query = query.gte('created_at', fileFilters.date_from);
  }
  if (fileFilters?.date_to) {
    query = query.lte('created_at', fileFilters.date_to);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return (data as any[]).map((file) => ({
    id: file.id,
    type: 'file' as const,
    title: file.name,
    subtitle: `${file.project?.key || 'Personal'} • ${formatFileSize(file.size)} • ${file.mime_type}`,
    name: file.name,
    mime_type: file.mime_type,
    size: file.size,
    project_id: file.project_id,
    project_name: file.project?.name || null,
    project_key: file.project?.key || null,
    task_id: null,
    uploader_id: file.uploaded_by,
    uploader_name: file.uploader?.[0]?.full_name || null,
    uploader_avatar: file.uploader?.[0]?.avatar_url || null,
    created_at: file.created_at,
    url: `/${getLocale()}/projects/${file.project_id}/files/${file.id}`,
    highlight: {
      title: highlightText(file.name, originalQuery),
    },
  }));
}

async function searchNotes(
  supabase: any,
  userId: string,
  tsQuery: string,
  originalQuery: string,
  limit: number
): Promise<SearchResultNote[]> {
  // Search project notes
  const { data: projectNotes, error: projectNotesError } = await supabase
    .from('project_notes')
    .select(
      `
      id,
      project_id,
      title,
      content,
      is_pinned,
      author_id,
      created_at,
      updated_at,
      project:projects!project_notes_project_id_fkey(id, name, key),
      author:profiles!project_notes_author_id_fkey(id, full_name, avatar_url)
    `
    )
    .is('deleted_at', null)
    .or(`title.ilike.%${originalQuery}%,content.ilike.%${originalQuery}%`)
    .limit(limit);

  // Search user notes
  const { data: userNotes, error: userNotesError } = await supabase
    .from('user_notes')
    .select(
      `
      id,
      project_id,
      title,
      content,
      is_pinned,
      user_id,
      created_at,
      updated_at,
      project:projects!user_notes_project_id_fkey(id, name, key),
      author:profiles!user_notes_user_id_fkey(id, full_name, avatar_url)
    `
    )
    .is('deleted_at', null)
    .or(`title.ilike.%${originalQuery}%,content.ilike.%${originalQuery}%`)
    .limit(limit);

  if ((projectNotesError && userNotesError) || (!projectNotes && !userNotes)) return [];

  const notes: SearchResultNote[] = [];

  if (projectNotes) {
    for (const note of projectNotes as any[]) {
      notes.push({
        id: note.id,
        type: 'note' as const,
        title: note.title,
        subtitle: `${note.project?.key || ''} • ${note.author?.[0]?.full_name || ''}`,
        content: note.content,
        project_id: note.project_id,
        project_name: note.project?.name || '',
        project_key: note.project?.key || '',
        author_id: note.author_id,
        author_name: note.author?.[0]?.full_name || null,
        author_avatar: note.author?.[0]?.avatar_url || null,
        is_pinned: note.is_pinned,
        created_at: note.created_at,
        updated_at: note.updated_at,
        url: `/${getLocale()}/projects/${note.project_id}/notes/${note.id}`,
        highlight: {
          title: highlightText(note.title, originalQuery),
          content: highlightText(note.content, originalQuery),
        },
      });
    }
  }

  if (userNotes) {
    for (const note of userNotes as any[]) {
      notes.push({
        id: note.id,
        type: 'note' as const,
        title: note.title,
        subtitle: `${note.project?.key || 'Personal'} • ${note.author?.[0]?.full_name || ''}`,
        content: note.content,
        project_id: note.project_id,
        project_name: note.project?.name || '',
        project_key: note.project?.key || '',
        author_id: note.user_id,
        author_name: note.author?.[0]?.full_name || null,
        author_avatar: note.author?.[0]?.avatar_url || null,
        is_pinned: note.is_pinned,
        created_at: note.created_at,
        updated_at: note.updated_at,
        url: `/${getLocale()}/notes/${note.id}`,
        highlight: {
          title: highlightText(note.title, originalQuery),
          content: highlightText(note.content, originalQuery),
        },
      });
    }
  }

  return notes.slice(0, limit);
}

async function searchComments(
  supabase: any,
  userId: string,
  tsQuery: string,
  originalQuery: string,
  limit: number
): Promise<SearchResultComment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select(
      `
      id,
      task_id,
      content,
      created_at,
      updated_at,
      user_id,
      task:tasks!task_comments_task_id_fkey(
        id,
        title,
        project_id,
        project:projects!tasks_project_id_fkey(id, name, key)
      ),
      author:profiles!task_comments_user_id_fkey(id, full_name, avatar_url)
    `
    )
    .is('deleted_at', null)
    .ilike('content', `%${originalQuery}%`)
    .limit(limit);

  if (error || !data) return [];

  return (data as any[]).map((comment) => ({
    id: comment.id,
    type: 'comment' as const,
    title: `Comment on "${comment.task?.title || 'Task'}"`,
    subtitle: `${comment.task?.project?.key || ''} • ${comment.author?.[0]?.full_name || ''}`,
    content: comment.content,
    task_id: comment.task_id,
    task_title: comment.task?.title || '',
    project_id: comment.task?.project_id || '',
    project_name: comment.task?.project?.name || '',
    project_key: comment.task?.project?.key || '',
    author_id: comment.user_id,
    author_name: comment.author?.[0]?.full_name || null,
    author_avatar: comment.author?.[0]?.avatar_url || null,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    url: `/${getLocale()}/projects/${comment.task?.project_id}/tasks/${comment.task_id}`,
    highlight: {
      content: highlightText(comment.content, originalQuery),
    },
  }));
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to get locale - in server context we'll need to pass this
function getLocale(): string {
  // This is a fallback - in actual usage the locale should be passed
  return 'en';
}

export async function getRecentSearches(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('user_searches')
    .select('query')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return data?.map((d) => d.query) || [];
}

export async function saveRecentSearch(userId: string, query: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from('user_searches').upsert(
    { user_id: userId, query, created_at: new Date().toISOString() },
    { onConflict: 'user_id,query' }
  );
}