/**
 * Files Client Component
 * Handles all interactive functionality for files page
 */

'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCard } from '@/components/files/FileCard';
import { FileUpload } from '@/components/files/FileUpload';
import { FilePreview } from '@/components/files/FilePreview';
import { FilesLoadingSkeleton } from '@/components/files/FilesLoadingSkeleton';
import { FilesEmptyState } from '@/components/files/FilesEmptyState';
import { Search, Filter, Upload, Download, Folder, User } from 'lucide-react';
import { formatFileSize, ALLOWED_MIME_TYPES, getFileIcon } from '@/lib/utils';
import type { ProjectFile, UserFile } from '@/types/project';
import { getProjectFilesAction, getUserFilesAction } from '@/app/actions/files-queries';
import { ThemeSwitcher } from '@/components/theme-switcher';

interface FileFilters {
  search: string;
  mime_type: string;
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

// Unified file type that works for both project and user files
interface FileWithUploader {
  id: string;
  project_id: string;
  uploaded_by?: string; // Only for project files
  user_id?: string; // Only for user files
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

interface FilesClientProps {
  projectId: string;
  initialProjectFiles: FileWithUploader[];
  initialUserFiles: FileWithUploader[];
}

export function FilesClient({ projectId, initialProjectFiles, initialUserFiles }: FilesClientProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [activeTab, setActiveTab] = useState<'project' | 'user'>('project');
  const [projectFiles, setProjectFiles] = useState<FileWithUploader[]>(initialProjectFiles);
  const [userFiles, setUserFiles] = useState<FileWithUploader[]>(initialUserFiles);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FileFilters>({
    search: '',
    mime_type: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, hasMore: true });
  const [previewFile, setPreviewFile] = useState<{ id: string; type: 'project' | 'user'; mimeType: string; name: string } | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (activeTab === 'project') {
        const result = await getProjectFilesAction({
          project_id: projectId,
          mime_type: filters.mime_type || undefined,
          page: pagination.page,
          page_size: pagination.pageSize,
          sort_by: filters.sort_by,
          sort_order: filters.sort_order,
        });
        if (result.success && result.data) {
          if (pagination.page === 1) {
            setProjectFiles(result.data);
          } else {
            setProjectFiles((prev) => [...prev, ...result.data!]);
          }
          setPagination((prev) => ({ ...prev, hasMore: result.data!.length === prev.pageSize }));
        } else {
          throw new Error(result.error || 'Failed to load project files');
        }
      } else {
        const result = await getUserFilesAction({
          user_id: '', // Will be filled by server action from auth context
          project_id: projectId,
          mime_type: filters.mime_type || undefined,
          page: pagination.page,
          page_size: pagination.pageSize,
          sort_by: filters.sort_by,
          sort_order: filters.sort_order,
        });
        if (result.success && result.data) {
          if (pagination.page === 1) {
            setUserFiles(result.data);
          } else {
            setUserFiles((prev) => [...prev, ...result.data!]);
          }
          setPagination((prev) => ({ ...prev, hasMore: result.data!.length === prev.pageSize }));
        } else {
          throw new Error(result.error || 'Failed to load user files');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [activeTab, filters, pagination.page, projectId]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1, hasMore: true }));
  }, [filters.mime_type, filters.sort_by, filters.sort_order]);

  const handleDownload = async (fileId: string) => {
    try {
      const { getProjectFileDownloadUrl, getUserFileDownloadUrl } = await import('@/app/actions/files');
      const downloadAction = activeTab === 'project' ? getProjectFileDownloadUrl : getUserFileDownloadUrl;
      const result = await downloadAction(fileId);
      if (result.success && result.data?.signedUrl) {
        window.open(result.data.signedUrl, '_blank');
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handlePreview = (fileId: string, mimeType: string, name: string) => {
    setPreviewFile({ id: fileId, type: activeTab, mimeType, name });
  };

  const handleRename = async (fileId: string, newName: string) => {
    try {
      const { updateProjectFileAction, updateUserFileAction } = await import('@/app/actions/files');
      const updateAction = activeTab === 'project' ? updateProjectFileAction : updateUserFileAction;
      const result = await updateAction(fileId, newName);
      if (result.success) {
        fetchFiles();
      }
    } catch (err) {
      console.error('Rename error:', err);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm(isArabic ? 'هل أنت متأكد من حذف هذا الملف؟' : 'Are you sure you want to delete this file?')) return;
    
    try {
      const { deleteProjectFileAction, deleteUserFileAction } = await import('@/app/actions/files');
      const deleteAction = activeTab === 'project' ? deleteProjectFileAction : deleteUserFileAction;
      const result = await deleteAction(fileId);
      if (result.success) {
        fetchFiles();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleUploadSuccess = () => {
    fetchFiles();
  };

  const filteredProjectFiles = projectFiles.filter((file) =>
    file.name.toLowerCase().includes(filters.search.toLowerCase())
  );
  const filteredUserFiles = userFiles.filter((file) =>
    file.name.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isArabic ? 'الملفات' : 'Files'}</h1>
          <p className="text-muted-foreground">
            {isArabic ? 'إدارة ملفات المشروع والملفات الشخصية' : 'Manage project files and personal files'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <FileUpload projectId={projectId} type={activeTab} onSuccess={handleUploadSuccess} multiple />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'project' | 'user')} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="project" className="flex-1">
            <Folder className="mr-2 h-4 w-4" />
            {isArabic ? 'ملفات المشروع' : 'Project Files'}
          </TabsTrigger>
          <TabsTrigger value="user" className="flex-1">
            <User className="mr-2 h-4 w-4" />
            {isArabic ? 'ملفاتي' : 'My Files'}
          </TabsTrigger>
        </TabsList>

        {/* Project Files Tab */}
        <TabsContent value="project" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border rounded-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isArabic ? 'البحث بالاسم...' : 'Search by name...'}
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.mime_type} onValueChange={(value) => setFilters((prev) => ({ ...prev, mime_type: value }))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={isArabic ? 'كل الأنواع' : 'All types'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{isArabic ? 'كل الأنواع' : 'All types'}</SelectItem>
                {ALLOWED_MIME_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.sort_by} onValueChange={(value) => setFilters((prev) => ({ ...prev, sort_by: value }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isArabic ? 'ترتيب حسب' : 'Sort by'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">{isArabic ? 'تاريخ الإنشاء' : 'Created Date'}</SelectItem>
                <SelectItem value="name">{isArabic ? 'الاسم' : 'Name'}</SelectItem>
                <SelectItem value="size">{isArabic ? 'الحجم' : 'Size'}</SelectItem>
                <SelectItem value="mime_type">{isArabic ? 'النوع' : 'Type'}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setFilters((prev) => ({ ...prev, sort_order: prev.sort_order === 'asc' ? 'desc' : 'asc' }))}>
              {filters.sort_order === 'asc' ? '↑' : '↓'} {isArabic ? 'الترتيب' : 'Order'}
            </Button>
          </div>

          {/* Files List */}
          {isLoading && pagination.page === 1 ? (
            <FilesLoadingSkeleton count={5} />
          ) : error && pagination.page === 1 ? (
            <FilesEmptyState
              title={isArabic ? 'خطأ في التحميل' : 'Error Loading Files'}
              description={error}
              actionLabel={isArabic ? 'إعادة المحاولة' : 'Retry'}
              onAction={fetchFiles}
            />
          ) : filteredProjectFiles.length === 0 && pagination.page === 1 ? (
            <FilesEmptyState
              title={isArabic ? 'لا توجد ملفات' : 'No Files'}
              description={isArabic ? 'لم يتم رفع أي ملفات لهذا المشروع بعد' : 'No files have been uploaded to this project yet'}
              actionLabel={isArabic ? 'رفع ملف' : 'Upload File'}
              onAction={() => {}}
              icon={<Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />}
            />
          ) : (
            <>
              <div className="space-y-2">
                {filteredProjectFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    type="project"
                    onDownload={handleDownload}
                    onPreview={handlePreview}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    canManage={true}
                    showUploader={true}
                  />
                ))}
              </div>
              {pagination.hasMore && (
                <Button variant="outline" className="w-full" onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}>
                  {isArabic ? 'تحميل المزيد' : 'Load More'}
                </Button>
              )}
            </>
          )}
        </TabsContent>

        {/* User Files Tab */}
        <TabsContent value="user" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border rounded-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isArabic ? 'البحث بالاسم...' : 'Search by name...'}
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.mime_type} onValueChange={(value) => setFilters((prev) => ({ ...prev, mime_type: value }))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={isArabic ? 'كل الأنواع' : 'All types'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{isArabic ? 'كل الأنواع' : 'All types'}</SelectItem>
                {ALLOWED_MIME_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.sort_by} onValueChange={(value) => setFilters((prev) => ({ ...prev, sort_by: value }))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isArabic ? 'ترتيب حسب' : 'Sort by'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">{isArabic ? 'تاريخ الإنشاء' : 'Created Date'}</SelectItem>
                <SelectItem value="name">{isArabic ? 'الاسم' : 'Name'}</SelectItem>
                <SelectItem value="size">{isArabic ? 'الحجم' : 'Size'}</SelectItem>
                <SelectItem value="mime_type">{isArabic ? 'النوع' : 'Type'}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setFilters((prev) => ({ ...prev, sort_order: prev.sort_order === 'asc' ? 'desc' : 'asc' }))}>
              {filters.sort_order === 'asc' ? '↑' : '↓'} {isArabic ? 'الترتيب' : 'Order'}
            </Button>
          </div>

          {/* Files List */}
          {isLoading && pagination.page === 1 ? (
            <FilesLoadingSkeleton count={5} />
          ) : error && pagination.page === 1 ? (
            <FilesEmptyState
              title={isArabic ? 'خطأ في التحميل' : 'Error Loading Files'}
              description={error}
              actionLabel={isArabic ? 'إعادة المحاولة' : 'Retry'}
              onAction={fetchFiles}
            />
          ) : filteredUserFiles.length === 0 && pagination.page === 1 ? (
            <FilesEmptyState
              title={isArabic ? 'لا توجد ملفات شخصية' : 'No Personal Files'}
              description={isArabic ? 'لم تقم برفع أي ملفات شخصية لهذا المشروع' : 'You haven\'t uploaded any personal files for this project'}
              actionLabel={isArabic ? 'رفع ملف' : 'Upload File'}
              onAction={() => {}}
              icon={<Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />}
            />
          ) : (
            <>
              <div className="space-y-2">
                {filteredUserFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    type="user"
                    onDownload={handleDownload}
                    onPreview={handlePreview}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    canManage={true}
                    showUploader={false}
                  />
                ))}
              </div>
              {pagination.hasMore && (
                <Button variant="outline" className="w-full" onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}>
                  {isArabic ? 'تحميل المزيد' : 'Load More'}
                </Button>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {previewFile && (
        <FilePreview
          fileId={previewFile.id}
          type={previewFile.type}
          mimeType={previewFile.mimeType}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}