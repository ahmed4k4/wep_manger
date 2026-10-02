/**
 * File Upload Component
 * Handles file selection, validation, and upload with progress
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Upload, X, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn, isValidMimeType, MAX_FILE_SIZE, formatFileSize } from '@/lib/utils';
import {
  getProjectFileUploadUrl,
  getUserFileUploadUrl,
  confirmFileUpload,
  cancelFileUpload,
  type UploadUrlResult,
} from '@/app/actions/files';
import { toast } from 'sonner';

interface FileUploadProps {
  projectId: string;
  type: 'project' | 'user';
  onSuccess?: (file: { id: string; name: string }) => void;
  onError?: (error: string) => void;
  multiple?: boolean;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  fileId?: string;
  signedUrl?: string;
  token?: string;
  path?: string;
}

export function FileUpload({ projectId, type, onSuccess, onError, multiple = false }: FileUploadProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!isValidMimeType(file.type)) {
      return isArabic ? 'نوع الملف غير مسموح به' : 'File type not allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return isArabic ? 'حجم الملف يتجاوز 50 ميجابايت' : 'File size exceeds 50MB limit';
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles: UploadFile[] = [];
    Array.from(newFiles).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
      validFiles.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        progress: 0,
      });
    });
    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  };

const removeFile = (id: string) => {
    const file = files.find(f => f.id === id);
    if (file?.status === 'uploading') {
      setShowDeleteDialog(id);
      setIsDeleteDialogOpen(true);
    } else {
      setFiles((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const confirmRemoveFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (file?.fileId) {
      await cancelFileUpload(file.fileId, type === 'project');
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setShowDeleteDialog(null);
    setIsDeleteDialogOpen(false);
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    const uploadAction = type === 'project' ? getProjectFileUploadUrl : getUserFileUploadUrl;
    
    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
      )
    );

    try {
      // Get signed upload URL
      const result: UploadUrlResult = await uploadAction(
        projectId,
        uploadFile.file.name,
        uploadFile.file.type,
        uploadFile.file.size
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to get upload URL');
      }

      const { signedUrl, token, path, fileId } = result.data;

      // Upload file to storage using fetch with progress
      await uploadToStorage(signedUrl, token, uploadFile.file, (progress) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, progress } : f
          )
        );
      });

      // Confirm upload
      const confirmResult = await confirmFileUpload(fileId, type === 'project');
      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Failed to confirm upload');
      }

      // Mark as success
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'success' as const, progress: 100, fileId }
            : f
        )
      );

      toast.success(isArabic ? 'تم رفع الملف بنجاح' : 'File uploaded successfully');
      onSuccess?.({ id: fileId, name: uploadFile.file.name });

      // Remove from list after delay
      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.id !== uploadFile.id));
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      );
      toast.error(errorMessage);
      onError?.(errorMessage);
    }
  };

  const uploadToStorage = (
    signedUrl: string,
    token: string,
    file: File,
    onProgress: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.send(file);
    });
  };

  const retryUpload = (id: string) => {
    const file = files.find(f => f.id === id);
    if (file && file.status === 'error') {
      uploadFile(file);
    }
  };

  const uploadAll = () => {
    files.filter(f => f.status === 'pending').forEach(uploadFile);
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  };

  const hasPendingFiles = files.some(f => f.status === 'pending');
  const hasUploadingFiles = files.some(f => f.status === 'uploading');
  const hasErrorFiles = files.some(f => f.status === 'error');

  if (files.length === 0) {
    return (
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 hover:border-primary/50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.zip"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium mb-2">
            {isArabic ? 'اسحب وأفل الملفات هنا أو اضغط للاختيار' : 'Drag & drop files here or click to select'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isArabic
              ? 'الملفات المسموحة: PDF, PNG, JPG, WEBP, DOCX, XLSX, ZIP (حد أقصى 50 ميجابايت)'
              : 'Allowed: PDF, PNG, JPG, WEBP, DOCX, XLSX, ZIP (Max 50MB)'}
          </p>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Queue */}
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              'flex items-center gap-3 p-3 bg-card border rounded-lg',
              file.status === 'success' && 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
              file.status === 'error' && 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
            )}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <File className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{file.file.name}</p>
                {file.status === 'success' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>{formatFileSize(file.file.size)}</span>
                {file.status === 'uploading' && (
                  <>
                    <Progress value={file.progress} className="w-32 h-1.5" />
                    <span>{file.progress}%</span>
                  </>
                )}
                {file.status === 'error' && (
                  <span className="text-red-500">{file.error}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {file.status === 'pending' && !hasUploadingFiles && (
                <Button size="sm" variant="default" onClick={() => uploadFile(file)}>
                  <Upload className="mr-1 h-4 w-4" />
                  {isArabic ? 'رفع' : 'Upload'}
                </Button>
              )}
              {file.status === 'uploading' && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {file.status === 'error' && (
                <Button size="sm" variant="outline" onClick={() => retryUpload(file.id)}>
                  {isArabic ? 'إعادة المحاولة' : 'Retry'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(file.id)}
                disabled={file.status === 'uploading'}
                aria-label={isArabic ? 'إزالة' : 'Remove'}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        {hasErrorFiles && (
          <Button variant="outline" size="sm" onClick={() => {
            files.filter(f => f.status === 'error').forEach(f => retryUpload(f.id));
          }}>
            {isArabic ? 'إعادة محاولة الكل' : 'Retry All'}
          </Button>
        )}
        {hasPendingFiles && !hasUploadingFiles && (
          <Button size="sm" onClick={uploadAll}>
            <Upload className="mr-1 h-4 w-4" />
            {isArabic ? 'رفع الكل' : 'Upload All'}
            <span className="ml-1 px-2 py-0.5 text-xs bg-primary/20 rounded">
              {files.filter(f => f.status === 'pending').length}
            </span>
          </Button>
        )}
        {files.some(f => f.status === 'success') && (
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            {isArabic ? 'مسح المكتملة' : 'Clear Completed'}
          </Button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!showDeleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteDialog(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArabic ? 'إلغاء الرفع؟' : 'Cancel Upload?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArabic
                ? 'سيتم إلغاء رفع هذا الملف وحذفه من القائمة. لا يمكن التراجع عن هذا الإجراء.'
                : 'This will cancel the upload and remove the file from the queue. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isArabic ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => showDeleteDialog && confirmRemoveFile(showDeleteDialog)}>
              {isArabic ? 'إزالة' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}