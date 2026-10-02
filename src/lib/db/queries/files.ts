/**
 * File Data Access Layer
 * Server-side queries for files - used in Server Components and Server Actions
 */

import { createSupabaseServerClient, createSupabaseAdminClient } from '../supabase-server';
import type {
  ProjectFile,
  UserFile,
  Profile,
  PostgrestError,
  FileFilters,
} from '@/types/project';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  isValidMimeType,
  formatFileSize,
  getFileIcon,
} from '@/lib/utils';

// ============================================================================
// File Filters & Types
// ============================================================================

export interface ProjectFileWithUploader extends ProjectFile {
  uploader?: Profile;
}

export interface UserFileWithUploader extends UserFile {
  uploader?: Profile;
}

export interface FileStats {
  total: number;
  total_size: number;
  by_type: Record<string, number>;
}

// ============================================================================
// Re-export file utilities for backward compatibility
// ============================================================================

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, isValidMimeType, formatFileSize, getFileIcon };

// ============================================================================
// Storage Path Helpers
// ============================================================================

export function getProjectFilePath(projectId: string, fileName: string): string {
  return `projects/${projectId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
}

export function getUserFilePath(userId: string, projectId: string, fileName: string): string {
  return `users/${userId}/projects/${projectId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
}

// ============================================================================
// Project Files Queries
// ============================================================================

/**
 * Get project files with filters
 */
export async function getProjectFiles(
  filters: FileFilters & { project_id: string; sort_by?: string; sort_order?: string }
): Promise<{ data: ProjectFileWithUploader[] | null; count: number | null; error: PostgrestError | null }> {
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
    return { data: null, count: null, error };
  }

  return { data: data as ProjectFileWithUploader[], count, error: null };
}

/**
 * Get single project file by ID
 */
export async function getProjectFileById(
  fileId: string
): Promise<{ data: ProjectFileWithUploader | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('project_files')
    .select(
      `
      *,
      uploader:profiles!project_files_uploaded_by_fkey(*)
    `
    )
    .eq('id', fileId)
    .is('deleted_at', null)
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as ProjectFileWithUploader, error: null };
}

/**
 * Create project file record
 */
export async function createProjectFile(
  input: {
    project_id: string;
    uploaded_by: string;
    name: string;
    storage_path: string;
    mime_type: string;
    size: number;
    checksum?: string;
    description?: string;
  }
): Promise<{ data: ProjectFile | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: input.project_id,
      uploaded_by: input.uploaded_by,
      name: input.name,
      storage_path: input.storage_path,
      mime_type: input.mime_type,
      size: input.size,
      checksum: input.checksum || null,
      description: input.description || null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as ProjectFile, error: null };
}

/**
 * Update project file metadata
 */
export async function updateProjectFile(
  fileId: string,
  input: {
    name?: string;
    description?: string | null;
  }
): Promise<{ data: ProjectFile | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('project_files')
    .update(input)
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as ProjectFile, error: null };
}

/**
 * Soft delete project file
 */
export async function deleteProjectFile(
  fileId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('project_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId);

  return { error };
}

/**
 * Get project file statistics
 */
export async function getProjectFileStats(
  projectId: string
): Promise<{ data: FileStats | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('project_files')
    .select('size, mime_type')
    .eq('project_id', projectId)
    .is('deleted_at', null);

  if (error) {
    return { data: null, error };
  }

  const files = data || [];
  const total = files.length;
  const total_size = files.reduce((sum, f) => sum + f.size, 0);
  const by_type: Record<string, number> = {};

  files.forEach((f) => {
    by_type[f.mime_type] = (by_type[f.mime_type] || 0) + 1;
  });

  return {
    data: { total, total_size, by_type },
    error: null,
  };
}

// ============================================================================
// User Files Queries
// ============================================================================

/**
 * Get user files with filters (for current user only)
 */
export async function getUserFiles(
  filters: FileFilters & { user_id: string; sort_by?: string; sort_order?: string }
): Promise<{ data: UserFileWithUploader[] | null; count: number | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    user_id,
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
    .eq('user_id', user_id)
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
    return { data: null, count: null, error };
  }

  return { data: data as UserFileWithUploader[], count, error: null };
}

/**
 * Get single user file by ID
 */
export async function getUserFileById(
  fileId: string
): Promise<{ data: UserFileWithUploader | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('user_files')
    .select(
      `
      *,
      uploader:profiles!user_files_user_id_fkey(*)
    `
    )
    .eq('id', fileId)
    .is('deleted_at', null)
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as UserFileWithUploader, error: null };
}

/**
 * Create user file record
 */
export async function createUserFile(
  input: {
    user_id: string;
    project_id: string;
    name: string;
    storage_path: string;
    mime_type: string;
    size: number;
    checksum?: string;
    description?: string;
  }
): Promise<{ data: UserFile | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('user_files')
    .insert({
      user_id: input.user_id,
      project_id: input.project_id,
      name: input.name,
      storage_path: input.storage_path,
      mime_type: input.mime_type,
      size: input.size,
      checksum: input.checksum || null,
      description: input.description || null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as UserFile, error: null };
}

/**
 * Update user file metadata
 */
export async function updateUserFile(
  fileId: string,
  input: {
    name?: string;
    description?: string | null;
  }
): Promise<{ data: UserFile | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('user_files')
    .update(input)
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: data as UserFile, error: null };
}

/**
 * Soft delete user file
 */
export async function deleteUserFile(
  fileId: string
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('user_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId);

  return { error };
}

/**
 * Get user file statistics
 */
export async function getUserFileStats(
  userId: string,
  projectId?: string
): Promise<{ data: FileStats | null; error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from('user_files')
    .select('size, mime_type')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  const files = data || [];
  const total = files.length;
  const total_size = files.reduce((sum, f) => sum + f.size, 0);
  const by_type: Record<string, number> = {};

  files.forEach((f) => {
    by_type[f.mime_type] = (by_type[f.mime_type] || 0) + 1;
  });

  return {
    data: { total, total_size, by_type },
    error: null,
  };
}

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * Create signed upload URL for project file
 */
export async function createProjectFileUploadUrl(
  projectId: string,
  fileName: string,
  mimeType: string
): Promise<{ data: { signedUrl: string; token: string; path: string } | null; error: Error | null }> {
  const supabase = await createSupabaseServerClient();
  const path = getProjectFilePath(projectId, fileName);

  const { data, error } = await supabase.storage
    .from('project-files')
    .createSignedUploadUrl(path);

  if (error) {
    return { data: null, error };
  }

  return { data: { ...data, path }, error: null };
}

/**
 * Create signed upload URL for user file
 */
export async function createUserFileUploadUrl(
  userId: string,
  projectId: string,
  fileName: string,
  mimeType: string
): Promise<{ data: { signedUrl: string; token: string; path: string } | null; error: Error | null }> {
  const supabase = await createSupabaseServerClient();
  const path = getUserFilePath(userId, projectId, fileName);

  const { data, error } = await supabase.storage
    .from('user-files')
    .createSignedUploadUrl(path);

  if (error) {
    return { data: null, error };
  }

  return { data: { ...data, path }, error: null };
}

/**
 * Create signed download URL for project file
 */
export async function createProjectFileDownloadUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from('project-files')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Create signed download URL for user file
 */
export async function createUserFileDownloadUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from('user-files')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Create signed preview URL for project file
 */
export async function createProjectFilePreviewUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from('project-files')
    .createSignedUrl(storagePath, expiresIn, {
      transform: { width: 1200, height: 1200, quality: 80 },
    });

  if (error) {
    // Fallback to regular signed URL if transform fails
    return createProjectFileDownloadUrl(storagePath, expiresIn);
  }

  return { data, error: null };
}

/**
 * Create signed preview URL for user file
 */
export async function createUserFilePreviewUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from('user-files')
    .createSignedUrl(storagePath, expiresIn, {
      transform: { width: 1200, height: 1200, quality: 80 },
    });

  if (error) {
    return createUserFileDownloadUrl(storagePath, expiresIn);
  }

  return { data, error: null };
}

/**
 * Delete file from storage
 */
export async function deleteFileFromStorage(
  bucket: 'project-files' | 'user-files',
  path: string
): Promise<{ error: Error | null }> {
  const supabase = await createSupabaseAdminClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  return { error };
}