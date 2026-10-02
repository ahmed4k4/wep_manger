/**
 * Server Actions for File Queries
 * Server-side data fetching for files page
 */

'use server';

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import type { FileFilters, PostgrestError } from '@/types/project';

// Type definitions
export interface FileQueryResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
}

interface FileWithUploader {
  id: string;
  project_id: string;
  uploaded_by?: string;
  user_id?: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  checksum: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  uploader?: { full_name: string | null; avatar_url: string | null };
}

export async function getProjectFilesAction(
  filters: FileFilters & { project_id: string; sort_by?: string; sort_order?: string }
): Promise<FileQueryResult<FileWithUploader>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      project_id,
      mime_type,
      page = 1,
      page_size = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = filters;

    let query = supabase
      .from('project_files')
      .select(
        `
        *,
        uploader:profiles!project_files_uploaded_by_fkey(*)
      `,
        { count: 'exact' }
      )
      .eq('project_id', project_id)
      .is('deleted_at', null);

    if (mime_type) {
      query = query.eq('mime_type', mime_type);
    }

    query = query.order(sort_by, { ascending: sort_order === 'asc' });
    query = query.range((page - 1) * page_size, page * page_size - 1);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as FileWithUploader[] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch project files' };
  }
}

export async function getUserFilesAction(
  filters: FileFilters & { sort_by?: string; sort_order?: string }
): Promise<FileQueryResult<FileWithUploader>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const {
      project_id,
      mime_type,
      page = 1,
      page_size = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = filters;

    let query = supabase
      .from('user_files')
      .select(
        `
        *,
        uploader:profiles!user_files_user_id_fkey(*)
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    if (mime_type) {
      query = query.eq('mime_type', mime_type);
    }

    query = query.order(sort_by, { ascending: sort_order === 'asc' });
    query = query.range((page - 1) * page_size, page * page_size - 1);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as FileWithUploader[] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch user files' };
  }
}
