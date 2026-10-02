/**
 * File Server Actions
 * Secure server-side operations for file management
 * Includes authorization checks and storage operations
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/db/supabase-server';
import {
  getProjectFileById,
  getUserFileById,
  createProjectFile,
  createUserFile,
  updateProjectFile,
  updateUserFile,
  deleteProjectFile,
  deleteUserFile,
  createProjectFileUploadUrl,
  createUserFileUploadUrl,
  createProjectFileDownloadUrl,
  createUserFileDownloadUrl,
  createProjectFilePreviewUrl,
  createUserFilePreviewUrl,
  deleteFileFromStorage,
  getProjectFilePath,
  getUserFilePath,
} from '@/lib/db/queries/files';
import { isValidMimeType, MAX_FILE_SIZE } from '@/lib/utils';
import type { ProjectFile, UserFile, PostgrestError, ActivityAction, EntityType } from '@/types/project';
import { logActivity } from '@/lib/db/queries/activity';

// ============================================================================
// Type Definitions
// ============================================================================

export interface FileActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface UploadUrlResult {
  success: boolean;
  data?: {
    signedUrl: string;
    token: string;
    path: string;
    fileId: string;
  };
  error?: string;
  code?: string;
}

export interface DownloadUrlResult {
  success: boolean;
  data?: { signedUrl: string };
  error?: string;
  code?: string;
}

export interface PreviewUrlResult {
  success: boolean;
  data?: { signedUrl: string };
  error?: string;
  code?: string;
}

// ============================================================================
// Authorization Helpers
// ============================================================================

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function checkProjectMembership(projectId: string, userId: string): Promise<{ isMember: boolean; role?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();
  return { isMember: !!data, role: data?.role };
}

async function canAccessProjectFile(fileId: string, userId: string): Promise<{ canAccess: boolean; file?: ProjectFile }> {
  const { data: file, error } = await getProjectFileById(fileId);
  if (error || !file) return { canAccess: false };
  
  const { isMember } = await checkProjectMembership(file.project_id, userId);
  return { canAccess: isMember, file };
}

async function canAccessUserFile(fileId: string, userId: string): Promise<{ canAccess: boolean; file?: UserFile }> {
  const { data: file, error } = await getUserFileById(fileId);
  if (error || !file) return { canAccess: false };
  
  // User can only access their own files
  if (file.user_id !== userId) return { canAccess: false };
  
  // Check project membership
  const { isMember } = await checkProjectMembership(file.project_id, userId);
  return { canAccess: isMember, file };
}

async function canManageProjectFile(fileId: string, userId: string): Promise<{ canManage: boolean; file?: ProjectFile; role?: string }> {
  const { data: file, error } = await getProjectFileById(fileId);
  if (error || !file) return { canManage: false };
  
  const { isMember, role } = await checkProjectMembership(file.project_id, userId);
  if (!isMember) return { canManage: false };
  
  // Owner, Admin, and uploader can manage
  const canManage = ['OWNER', 'ADMIN'].includes(role || '') || file.uploaded_by === userId;
  return { canManage, file, role };
}

async function canManageUserFile(fileId: string, userId: string): Promise<{ canManage: boolean; file?: UserFile }> {
  const { data: file, error } = await getUserFileById(fileId);
  if (error || !file) return { canManage: false };
  
  // Only the file owner can manage
  if (file.user_id !== userId) return { canManage: false };
  
  // Check project membership
  const { isMember } = await checkProjectMembership(file.project_id, userId);
  return { canManage: isMember, file };
}

// ============================================================================
// Upload Actions
// ============================================================================

/**
 * Get signed upload URL for project file
 */
export async function getProjectFileUploadUrl(
  projectId: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<UploadUrlResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Validate file
    if (!isValidMimeType(mimeType)) {
      return { success: false, error: 'File type not allowed', code: 'INVALID_MIME_TYPE' };
    }
    if (fileSize > MAX_FILE_SIZE) {
      return { success: false, error: 'File size exceeds 50MB limit', code: 'FILE_TOO_LARGE' };
    }

    // Check project membership
    const { isMember } = await checkProjectMembership(projectId, user.id);
    if (!isMember) {
      return { success: false, error: 'Not a member of this project', code: 'NOT_MEMBER' };
    }

    // Create upload URL
    const result = await createProjectFileUploadUrl(projectId, fileName, mimeType);
    if (result.error) {
      return { success: false, error: 'Failed to create upload URL' };
    }

    // Pre-create file record with pending status
    const { data: file, error: fileError } = await createProjectFile({
      project_id: projectId,
      uploaded_by: user.id,
      name: fileName,
      storage_path: result.data!.path,
      mime_type: mimeType,
      size: fileSize,
    });

    if (fileError || !file) {
      return { success: false, error: 'Failed to create file record' };
    }

    return {
      success: true,
      data: {
        signedUrl: result.data!.signedUrl,
        token: result.data!.token,
        path: result.data!.path,
        fileId: file.id,
      },
    };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get signed upload URL for user file
 */
export async function getUserFileUploadUrl(
  projectId: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<UploadUrlResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Validate file
    if (!isValidMimeType(mimeType)) {
      return { success: false, error: 'File type not allowed', code: 'INVALID_MIME_TYPE' };
    }
    if (fileSize > MAX_FILE_SIZE) {
      return { success: false, error: 'File size exceeds 50MB limit', code: 'FILE_TOO_LARGE' };
    }

    // Check project membership
    const { isMember } = await checkProjectMembership(projectId, user.id);
    if (!isMember) {
      return { success: false, error: 'Not a member of this project', code: 'NOT_MEMBER' };
    }

    // Create upload URL
    const result = await createUserFileUploadUrl(user.id, projectId, fileName, mimeType);
    if (result.error) {
      return { success: false, error: 'Failed to create upload URL' };
    }

    // Pre-create file record
    const { data: file, error: fileError } = await createUserFile({
      user_id: user.id,
      project_id: projectId,
      name: fileName,
      storage_path: result.data!.path,
      mime_type: mimeType,
      size: fileSize,
    });

    if (fileError || !file) {
      return { success: false, error: 'Failed to create file record' };
    }

    return {
      success: true,
      data: {
        signedUrl: result.data!.signedUrl,
        token: result.data!.token,
        path: result.data!.path,
        fileId: file.id,
      },
    };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Confirm file upload completion
 */
export async function confirmFileUpload(
  fileId: string,
  isProjectFile: boolean
): Promise<FileActionResult<ProjectFile | UserFile>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (isProjectFile) {
      const { canManage, file } = await canManageProjectFile(fileId, user.id);
      if (!canManage || !file) {
        return { success: false, error: 'Not authorized to manage this file' };
      }
      
      // Verify file exists in storage
      const supabase = await createSupabaseAdminClient();
      const { data: fileData } = await supabase.storage
        .from('project-files')
        .download(file.storage_path);
      
      if (!fileData) {
        // File not uploaded, delete record
        await deleteProjectFile(fileId);
        await deleteFileFromStorage('project-files', file.storage_path);
        return { success: false, error: 'File not found in storage' };
      }

      revalidatePath(`/projects/${file.project_id}/files`);
      return { success: true, data: file };
    } else {
      const { canManage, file } = await canManageUserFile(fileId, user.id);
      if (!canManage || !file) {
        return { success: false, error: 'Not authorized to manage this file' };
      }

      const supabase = await createSupabaseAdminClient();
      const { data: fileData } = await supabase.storage
        .from('user-files')
        .download(file.storage_path);
      
      if (!fileData) {
        await deleteUserFile(fileId);
        await deleteFileFromStorage('user-files', file.storage_path);
        return { success: false, error: 'File not found in storage' };
      }

      revalidatePath(`/projects/${file.project_id}/files`);
      return { success: true, data: file };
    }
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Cancel pending upload (cleanup)
 */
export async function cancelFileUpload(
  fileId: string,
  isProjectFile: boolean
): Promise<FileActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (isProjectFile) {
      const { canManage, file } = await canManageProjectFile(fileId, user.id);
      if (!canManage || !file) {
        return { success: false, error: 'Not authorized' };
      }
      await deleteProjectFile(fileId);
      await deleteFileFromStorage('project-files', file.storage_path);
    } else {
      const { canManage, file } = await canManageUserFile(fileId, user.id);
      if (!canManage || !file) {
        return { success: false, error: 'Not authorized' };
      }
      await deleteUserFile(fileId);
      await deleteFileFromStorage('user-files', file.storage_path);
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================================
// Download & Preview Actions
// ============================================================================

/**
 * Get signed download URL for project file
 */
export async function getProjectFileDownloadUrl(
  fileId: string
): Promise<DownloadUrlResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { canAccess, file } = await canAccessProjectFile(fileId, user.id);
    if (!canAccess || !file) {
      return { success: false, error: 'Not authorized to access this file' };
    }

    const result = await createProjectFileDownloadUrl(file.storage_path);
    if (result.error) {
      return { success: false, error: 'Failed to create download URL' };
    }

    // Log activity
    await logActivity({
      project_id: file.project_id,
      user_id: user.id,
      action: 'FILE_DOWNLOADED',
      entity_type: 'file',
      entity_id: fileId,
    });

    return { success: true, data: { signedUrl: result.data!.signedUrl } };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get signed download URL for user file
 */
export async function getUserFileDownloadUrl(
  fileId: string
): Promise<DownloadUrlResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { canAccess, file } = await canAccessUserFile(fileId, user.id);
    if (!canAccess || !file) {
      return { success: false, error: 'Not authorized to access this file' };
    }

    const result = await createUserFileDownloadUrl(file.storage_path);
    if (result.error) {
      return { success: false, error: 'Failed to create download URL' };
    }

    return { success: true, data: { signedUrl: result.data!.signedUrl } };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get signed preview URL for project file
 */
export async function getProjectFilePreviewUrl(
  fileId: string
): Promise<PreviewUrlResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { canAccess, file } = await canAccessProjectFile(fileId, user.id);
    if (!canAccess || !file) {
      return { success: false, error: 'Not authorized to access this file' };
    }

    // Check if previewable
    const previewableTypes = ['image/', 'application/pdf'];
    const isPreviewable = previewableTypes.some(t => file.mime_type.startsWith(t));
    if (!isPreviewable) {
      return { success: false, error: 'File type not previewable', code: 'NOT_PREVIEWABLE' };
    }

    const result = await createProjectFilePreviewUrl(file.storage_path);
    if (result.error) {
      return { success: false, error: 'Failed to create preview URL' };
    }

    return { success: true, data: { signedUrl: result.data!.signedUrl } };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get signed preview URL for user file
 */
export async function getUserFilePreviewUrl(
  fileId: string
): Promise<PreviewUrlResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { canAccess, file } = await canAccessUserFile(fileId, user.id);
    if (!canAccess || !file) {
      return { success: false, error: 'Not authorized to access this file' };
    }

    const previewableTypes = ['image/', 'application/pdf'];
    const isPreviewable = previewableTypes.some(t => file.mime_type.startsWith(t));
    if (!isPreviewable) {
      return { success: false, error: 'File type not previewable', code: 'NOT_PREVIEWABLE' };
    }

    const result = await createUserFilePreviewUrl(file.storage_path);
    if (result.error) {
      return { success: false, error: 'Failed to create preview URL' };
    }

    return { success: true, data: { signedUrl: result.data!.signedUrl } };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================================
// Metadata Actions
// ============================================================================

/**
 * Update project file metadata
 */
export async function updateProjectFileAction(
  fileId: string,
  name: string,
  description?: string
): Promise<FileActionResult<ProjectFile>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { canManage, file } = await canManageProjectFile(fileId, user.id);
    if (!canManage || !file) {
      return { success: false, error: 'Not authorized to update this file' };
    }

    const { data, error } = await updateProjectFile(fileId, { name, description });
    if (error) {
      return { success: false, error: 'Failed to update file' };
    }

    // Log activity
    await logActivity({
      project_id: file.project_id,
      user_id: user.id,
      action: 'FILE_UPDATED',
      entity_type: 'file',
      entity_id: fileId,
      metadata: { name, description },
    });

    revalidatePath(`/projects/${file.project_id}/files`);
    return { success: true, data: data! };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Update user file metadata
 */
export async function updateUserFileAction(
  fileId: string,
  name: string,
  description?: string
): Promise<FileActionResult<UserFile>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { canManage, file } = await canManageUserFile(fileId, user.id);
    if (!canManage || !file) {
      return { success: false, error: 'Not authorized to update this file' };
    }

    const { data, error } = await updateUserFile(fileId, { name, description });
    if (error) {
      return { success: false, error: 'Failed to update file' };
    }

    revalidatePath(`/projects/${file.project_id}/files`);
    return { success: true, data: data! };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================================
// Delete Actions
// ============================================================================

/**
 * Delete project file
 */
export async function deleteProjectFileAction(
  fileId: string
): Promise<FileActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { canManage, file, role } = await canManageProjectFile(fileId, user.id);
    if (!canManage || !file) {
      return { success: false, error: 'Not authorized to delete this file' };
    }

    // Delete from storage
    const storageResult = await deleteFileFromStorage('project-files', file.storage_path);
    if (storageResult.error) {
      return { success: false, error: 'Failed to delete from storage' };
    }

    // Soft delete from database
    const { error } = await deleteProjectFile(fileId);
    if (error) {
      return { success: false, error: 'Failed to delete file record' };
    }

    // Log activity
    await logActivity({
      project_id: file.project_id,
      user_id: user.id,
      action: 'FILE_DELETED',
      entity_type: 'file',
      entity_id: fileId,
      metadata: { name: file.name, role },
    });

    revalidatePath(`/projects/${file.project_id}/files`);
    return { success: true };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Delete user file
 */
export async function deleteUserFileAction(
  fileId: string
): Promise<FileActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { canManage, file } = await canManageUserFile(fileId, user.id);
    if (!canManage || !file) {
      return { success: false, error: 'Not authorized to delete this file' };
    }

    // Delete from storage
    const storageResult = await deleteFileFromStorage('user-files', file.storage_path);
    if (storageResult.error) {
      return { success: false, error: 'Failed to delete from storage' };
    }

    // Soft delete from database
    const { error } = await deleteUserFile(fileId);
    if (error) {
      return { success: false, error: 'Failed to delete file record' };
    }

    revalidatePath(`/projects/${file.project_id}/files`);
    return { success: true };
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}

// ============================================================================
// Utility Actions
// ============================================================================

/**
 * Get file info for download/preview
 */
export async function getFileInfo(
  fileId: string,
  isProjectFile: boolean
): Promise<FileActionResult<{ name: string; mime_type: string; size: number; storage_path: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (isProjectFile) {
      const { canAccess, file } = await canAccessProjectFile(fileId, user.id);
      if (!canAccess || !file) {
        return { success: false, error: 'Not authorized' };
      }
      return {
        success: true,
        data: {
          name: file.name,
          mime_type: file.mime_type,
          size: file.size,
          storage_path: file.storage_path,
        },
      };
    } else {
      const { canAccess, file } = await canAccessUserFile(fileId, user.id);
      if (!canAccess || !file) {
        return { success: false, error: 'Not authorized' };
      }
      return {
        success: true,
        data: {
          name: file.name,
          mime_type: file.mime_type,
          size: file.size,
          storage_path: file.storage_path,
        },
      };
    }
  } catch {
    return { success: false, error: 'Internal server error' };
  }
}