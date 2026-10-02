# Private/Public File Handling

## Overview

This document defines the architecture for handling files in the system, distinguishing between **project-shared files** (accessible to project members) and **private user files** (accessible only to the owner and admins).

---

## File Classification

| File Type | Bucket | Access Control | Use Cases |
|-----------|--------|----------------|-----------|
| **Project Files** | `project-files` | Project members (RLS) | Task attachments, shared documents, project assets |
| **Private Files** | `user-files` | Owner only (RLS) | Personal documents, exports, drafts |
| **Avatars** | `avatars` | Public read, owner write | User profile pictures |
| **System Files** | `system-files` | Service role only | Reports, backups, exports |

---

## Project Files (Shared)

### Path Structure
```
project-files/
├── {projectId}/
│   ├── tasks/
│   │   └── {taskId}/
│   │       └── {timestamp}-{filename}
│   ├── notes/
│   │   └── {noteId}/
│   │       └── {timestamp}-{filename}
│   └── general/
│       └── {timestamp}-{filename}
```

### Upload Flow (Direct to S3 via Signed URL)

```typescript
// features/files/actions/uploadProjectFile.ts
'use server';

import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { permissionService } from '@/shared/services/permissionService';
import { generateSignedUploadUrl } from '@/modules/storage/helpers';
import { fileRepository } from '../repositories/fileRepository';
import { revalidatePath } from 'next/cache';

export async function uploadProjectFileAction(
  projectId: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  
  // Authorization
  const canUpload = await permissionService.can(user.id, 'files:upload', { projectId });
  if (!canUpload) throw new ForbiddenError('Cannot upload files to this project');
  
  const file = formData.get('file') as File;
  const entityType = formData.get('entityType') as 'task' | 'note' | 'general';
  const entityId = formData.get('entityId') as string | null;
  
  if (!file) return { error: 'No file provided' };
  
  // Validate
  const validation = validateFile(file);
  if (!validation.valid) return { error: validation.error };
  
  // Generate signed upload URL
  const { signedUrl, path } = await generateSignedUploadUrl({
    bucket: 'PROJECT_FILES',
    userId: user.id,
    projectId,
    fileName: file.name,
    contentType: file.type,
  });
  
  // Return signed URL for client-side upload
  return { 
    success: true, 
    signedUrl, 
    path,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    entityType,
    entityId,
  };
}

// Client uploads directly to signed URL, then calls complete upload
export async function completeProjectFileUpload(
  projectId: string,
  data: {
    path: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    entityType: 'task' | 'note' | 'general';
    entityId?: string;
  }
) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  
  // Create file record in database
  const file = await fileRepository.create({
    projectId,
    userId: null, // Not private
    taskId: data.entityType === 'task' ? data.entityId : null,
    noteId: data.entityType === 'note' ? data.entityId : null,
    bucket: 'project-files',
    path: data.path,
    name: data.fileName,
    size: data.fileSize,
    mimeType: data.mimeType,
    isPrivate: false,
    uploadedById: user.id,
  });
  
  // Log activity
  await activityService.log({
    userId: user.id,
    action: 'FILE_UPLOADED',
    entityType: 'file',
    entityId: file.id,
    projectId,
    metadata: { fileName: data.fileName, entityType: data.entityType },
  });
  
  revalidatePath(`/projects/${projectId}/files`);
  
  return { success: true, file };
}

function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    'image/', 'application/pdf', 'text/', 
    'application/msword', 'application/vnd.openxmlformats',
    'application/zip', 'application/x-zip-compressed'
  ];
  
  if (file.size > maxSize) return { valid: false, error: 'File too large (max 50MB)' };
  if (!allowedTypes.some(t => file.type.startsWith(t))) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  return { valid: true };
}
```

### Client Upload Component

```typescript
// features/files/components/FileUploader.tsx
'use client';

import { useState } from 'react';
import { uploadProjectFileAction, completeProjectFileUpload } from '../actions/uploadProjectFile';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { toast } from '@/shared/ui/toast';

interface FileUploaderProps {
  projectId: string;
  entityType?: 'task' | 'note' | 'general';
  entityId?: string;
  onComplete?: (file: FileRecord) => void;
}

export function FileUploader({ projectId, entityType = 'general', entityId, onComplete }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    
    try {
      // 1. Get signed URL
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      if (entityId) formData.append('entityId', entityId);
      
      const { signedUrl, path, error } = await uploadProjectFileAction(projectId, formData);
      if (error) throw new Error(error);
      
      // 2. Upload directly to S3
      const xhr = new XMLHttpRequest();
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status === 200) resolve();
          else reject(new Error('Upload failed'));
        };
        
        xhr.onerror = () => reject(new Error('Upload failed'));
        
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
      
      // 3. Complete upload (create DB record)
      const result = await completeProjectFileUpload(projectId, {
        path,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        entityType,
        entityId,
      });
      
      if (result.success) {
        toast.success('File uploaded successfully');
        onComplete?.(result.file);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };
  
  return (
    <div className="space-y-2">
      <Input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={uploading}
        className="file-input"
      />
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

### Download Flow

```typescript
// features/files/actions/downloadFile.ts
'use server';

import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { permissionService } from '@/shared/services/permissionService';
import { generateSignedDownloadUrl } from '@/modules/storage/helpers';
import { fileRepository } from '../repositories/fileRepository';

export async function downloadFileAction(fileId: string) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  
  const file = await fileRepository.findById(fileId);
  if (!file) throw new NotFoundError('File');
  
  // Check access
  let canAccess = false;
  
  if (file.projectId) {
    canAccess = await permissionService.can(user.id, 'files:download', { 
      projectId: file.projectId 
    });
  } else if (file.userId) {
    // Private file - only owner
    canAccess = file.userId === user.id;
    
    // Admins can access private files
    if (!canAccess) {
      const isAdmin = await permissionService.can(user.id, 'users:list');
      canAccess = isAdmin;
    }
  }
  
  if (!canAccess) throw new ForbiddenError();
  
  // Generate signed download URL
  const downloadUrl = await generateSignedDownloadUrl(
    file.bucket as any,
    file.path,
    3600 // 1 hour
  );
  
  // Log download
  await activityService.log({
    userId: user.id,
    action: 'FILE_DOWNLOADED',
    entityType: 'file',
    entityId: file.id,
    projectId: file.projectId || undefined,
  });
  
  return { downloadUrl, fileName: file.name };
}
```

---

## Private User Files

### Path Structure
```
user-files/
├── {userId}/
│   ├── avatar/
│   │   └── {timestamp}-{filename}
│   ├── documents/
│   │   └── {timestamp}-{filename}
│   └── exports/
│       └── {timestamp}-{filename}
```

### Upload Flow

```typescript
// features/files/actions/uploadPrivateFile.ts
'use server';

import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { generateSignedUploadUrl } from '@/modules/storage/helpers';
import { fileRepository } from '../repositories/fileRepository';

export async function uploadPrivateFileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  
  const file = formData.get('file') as File;
  const folder = formData.get('folder') as 'documents' | 'exports' || 'documents';
  
  if (!file) return { error: 'No file provided' };
  
  // Validate
  const maxSize = 100 * 1024 * 1024; // 100MB for private files
  if (file.size > maxSize) return { error: 'File too large (max 100MB)' };
  
  // Generate signed URL
  const { signedUrl, path } = await generateSignedUploadUrl({
    bucket: 'USER_FILES',
    userId: user.id,
    fileName: file.name,
    contentType: file.type,
  });
  
  return { 
    success: true, 
    signedUrl, 
    path,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    folder,
  };
}

export async function completePrivateFileUpload(data: {
  path: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  folder: 'documents' | 'exports';
}) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  
  const file = await fileRepository.create({
    projectId: null,
    userId: user.id,
    taskId: null,
    noteId: null,
    bucket: 'user-files',
    path: data.path,
    name: data.fileName,
    size: data.fileSize,
    mimeType: data.mimeType,
    isPrivate: true,
    uploadedById: user.id,
  });
  
  return { success: true, file };
}
```

### List Private Files

```typescript
// features/files/actions/listPrivateFiles.ts
'use server';

import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { fileRepository } from '../repositories/fileRepository';

export async function listPrivateFilesAction(folder?: 'documents' | 'exports') {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  
  const files = await fileRepository.findByUser(user.id, folder);
  
  // Generate signed URLs for each file
  const filesWithUrls = await Promise.all(
    files.map(async (file) => ({
      ...file,
      downloadUrl: await generateSignedDownloadUrl('USER_FILES', file.path),
    }))
  );
  
  return { files: filesWithUrls };
}
```

---

## File Access Control Summary

| Operation | Project Files | Private Files |
|-----------|---------------|---------------|
| **Upload** | Project members (MEMBER+) | Owner only |
| **View/Download** | Project members | Owner + Admins |
| **Delete Own** | Uploader | Owner |
| **Delete Any** | Project admins (OWNER/ADMIN) | Admins only |
| **RLS Enforcement** | `project_id` + `project_members` | `user_id = auth.uid()` |

---

## File Type Handling

### Preview Support
```typescript
// shared/utils/filePreview.ts
export function getFilePreviewType(mimeType: string): 'image' | 'pdf' | 'text' | 'none' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/')) return 'text';
  return 'none';
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'file-text';
  if (mimeType.startsWith('text/')) return 'file-text';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'file-text';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'table';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  return 'file';
}
```

### Thumbnail Generation (Future Enhancement)
```typescript
// modules/storage/thumbnail.ts
export async function generateThumbnail(
  bucket: string, 
  path: string, 
  options: { width: number; height: number } = { width: 200, height: 200 }
): Promise<string | null> {
  // Use Supabase Image Transformation or external service
  // Return signed URL for thumbnail
}
```

---

## Security Considerations

### File Validation
- **Server-side validation** - Never trust client-only validation
- **MIME type verification** - Check actual file content, not just extension
- **Size limits** - Enforce at upload (signed URL) and database level
- **Virus scanning** - Consider integration (ClamAV, etc.) for production

### Access Control
- **Signed URLs expire** - Default 1 hour for downloads
- **No direct public access** - All buckets private except avatars
- **RLS on database records** - Double enforcement
- **Audit logging** - All uploads/downloads logged

### Path Traversal Prevention
```typescript
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\.+/g, '.')
    .substring(0, 255);
}
```

---

## Storage Quotas (Optional)

```sql
-- Track storage usage per user/project
CREATE TABLE storage_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  project_id uuid REFERENCES projects(id),
  bucket text NOT NULL,
  total_size bigint NOT NULL DEFAULT 0,
  file_count int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, project_id, bucket)
);

-- Trigger to update usage
CREATE OR REPLACE FUNCTION update_storage_usage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO storage_usage (user_id, project_id, bucket, total_size, file_count)
    VALUES (NEW.user_id, NEW.project_id, NEW.bucket, NEW.size, 1)
    ON CONFLICT (user_id, project_id, bucket) DO UPDATE SET
      total_size = storage_usage.total_size + NEW.size,
      file_count = storage_usage.file_count + 1,
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE storage_usage SET
      total_size = total_size - OLD.size,
      file_count = file_count - 1,
      updated_at = now()
    WHERE user_id = OLD.user_id AND project_id = OLD.project_id AND bucket = OLD.bucket;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER storage_usage_trigger
AFTER INSERT OR DELETE ON files
FOR EACH ROW EXECUTE FUNCTION update_storage_usage();
```

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*