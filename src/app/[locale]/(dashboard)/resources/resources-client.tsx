/**
 * Resources Client Component
 * Interactive file library with search, filter, sort, and view modes
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCard } from '@/components/files/FileCard';
import { FileUpload } from '@/components/files/FileUpload';
import { FilePreview } from '@/components/files/FilePreview';
import { FilesLoadingSkeleton } from '@/components/files/FilesLoadingSkeleton';
import { FilesEmptyState } from '@/components/files/FilesEmptyState';
import { Search, Filter, Upload, Download, Folder, User, Grid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatFileSize, ALLOWED_MIME_TYPES, getFileIcon } from '@/lib/utils';
import type { ProjectWithRelations } from '@/types/project';
import { getProjectFilesAction, getUserFilesAction } from '@/app/actions/files-queries';

interface FileFilters {
  projectId: string;
  mimeType: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string;
  view: 'grid' | 'list';
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
  project_name?: string;
  project_key?: string;
}

interface ResourcesClientProps {
  locale: string;
  projects: ProjectWithRelations[];
  initialFilters: FileFilters;
}

export function ResourcesClient({ locale, projects, initialFilters }: ResourcesClientProps) {
  const isArabic = locale === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'project' | 'user'>('project');
  const [projectFiles, setProjectFiles] = useState<FileWithUploader[]>([]);
  const [userFiles, setUserFiles] = useState<FileWithUploader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FileFilters>(initialFilters);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, hasMore: true });
  const [previewFile, setPreviewFile] = useState<{ id: string; type: 'project' | 'user'; mimeType: string; name: string } | null>(null);

  // Sync filters with URL
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.projectId) params.set('project', filters.projectId);
    if (filters.mimeType) params.set('type', filters.mimeType);
    if (filters.sortBy !== 'created_at') params.set('sort', filters.sortBy);
    if (filters.sortOrder !== 'desc') params.set('order', filters.sortOrder);
    if (filters.search) params.set('q', filters.search);
    if (filters.view !== 'grid') params.set('view', filters.view);
    router.replace(`/${locale}/resources?${params.toString()}`, { scroll: false });
  }, [filters, locale, router]);

  // Update URL when filters change
  useEffect(() => {
    updateUrl();
  }, [updateUrl]);

  // Sync initial filters from URL
  useEffect(() => {
    if (searchParams) {
      const newFilters = { ...initialFilters };
      if (searchParams.get('project')) newFilters.projectId = searchParams.get('project')!;
      if (searchParams.get('type')) newFilters.mimeType = searchParams.get('type')!;
      if (searchParams.get('sort')) newFilters.sortBy = searchParams.get('sort')!;
      if (searchParams.get('order')) newFilters.sortOrder = searchParams.get('order') as 'asc' | 'desc';
      if (searchParams.get('q')) newFilters.search = searchParams.get('q')!;
      if (searchParams.get('view')) newFilters.view = searchParams.get('view') as 'grid' | 'list';
      setFilters(newFilters);
    }
  }, [searchParams, initialFilters]);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (activeTab === 'project') {
        const result = await getProjectFilesAction({
          project_id: filters.projectId || projects[0]?.id || '',
          mime_type: filters.mimeType || undefined,
          page: pagination.page,
          page_size: pagination.pageSize,
          sort_by: filters.sortBy,
          sort_order: filters.sortOrder,
        });
        if (result.success && result.data) {
          // Add project info to each file
          const filesWithProject = result.data.map(file => {
            const project = projects.find(p => p.id === file.project_id);
            return {
              ...file,
              project_name: project?.name,
              project_key: project?.key,
            };
          });
          if (pagination.page === 1) {
            setProjectFiles(filesWithProject);
          } else {
            setProjectFiles((prev) => [...prev, ...filesWithProject]);
          }
          setPagination((prev) => ({ ...prev, hasMore: result.data!.length === prev.pageSize }));
        } else {
          throw new Error(result.error || 'Failed to load project files');
        }
      } else {
        const result = await getUserFilesAction({
          project_id: filters.projectId || undefined,
          mime_type: filters.mimeType || undefined,
          page: pagination.page,
          page_size: pagination.pageSize,
          sort_by: filters.sortBy,
          sort_order: filters.sortOrder,
        });
        if (result.success && result.data) {
          const filesWithProject = result.data.map(file => {
            const project = projects.find(p => p.id === file.project_id);
            return {
              ...file,
              project_name: project?.name,
              project_key: project?.key,
            };
          });
          if (pagination.page === 1) {
            setUserFiles(filesWithProject);
          } else {
            setUserFiles((prev) => [...prev, ...filesWithProject]);
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
  }, [activeTab, filters.mimeType, filters.sortBy, filters.sortOrder, pagination.page, pagination.pageSize, filters.projectId, projects]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1, hasMore: true }));
  }, [filters.mimeType, filters.sortBy, filters.sortOrder, filters.projectId, activeTab]);

  // Client-side search filtering
  const filteredProjectFiles = projectFiles.filter((file) =>
    file.name.toLowerCase().includes(filters.search.toLowerCase())
  );
  const filteredUserFiles = userFiles.filter((file) =>
    file.name.toLowerCase().includes(filters.search.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isArabic ? 'المكتبة' : 'Resources'}</h1>
          <p className="text-muted-foreground">
            {isArabic ? 'تصفح وإدارة جميع الملفات عبر المشاريع' : 'Browse and manage all files across projects'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FileUpload projectId={filters.projectId || projects[0]?.id || ''} type={activeTab} onSuccess={handleUploadSuccess} multiple />
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
            <Select value={filters.projectId} onValueChange={(value) => setFilters((prev) => ({ ...prev, projectId: value }))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={isArabic ? 'كل المشاريع' : 'All projects'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{isArabic ? 'كل المشاريع' : 'All projects'}</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.key} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.mimeType} onValueChange={(value) => setFilters((prev) => ({ ...prev, mimeType: value }))}>
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
            <Select value={filters.sortBy} onValueChange={(value) => setFilters((prev) => ({ ...prev, sortBy: value }))}>
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
            <Button variant="outline" onClick={() => setFilters((prev) => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}>
              {filters.sortOrder === 'asc' ? '↑' : '↓'} {isArabic ? 'الترتيب' : 'Order'}
            </Button>
            <div className="flex gap-1">
              <Button
                variant={filters.view === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setFilters((prev) => ({ ...prev, view: 'grid' }))}
                aria-label={isArabic ? 'عرض شبكة' : 'Grid view'}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={filters.view === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setFilters((prev) => ({ ...prev, view: 'list' }))}
                aria-label={isArabic ? 'عرض قائمة' : 'List view'}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
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
              {filters.view === 'grid' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                      showProject={true}
                    />
                  ))}
                </div>
              ) : (
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
                      showProject={true}
                    />
                  ))}
                </div>
              )}
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
            <Select value={filters.projectId} onValueChange={(value) => setFilters((prev) => ({ ...prev, projectId: value }))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={isArabic ? 'كل المشاريع' : 'All projects'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{isArabic ? 'كل المشاريع' : 'All projects'}</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.key} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.mimeType} onValueChange={(value) => setFilters((prev) => ({ ...prev, mimeType: value }))}>
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
            <Select value={filters.sortBy} onValueChange={(value) => setFilters((prev) => ({ ...prev, sortBy: value }))}>
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
            <Button variant="outline" onClick={() => setFilters((prev) => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}>
              {filters.sortOrder === 'asc' ? '↑' : '↓'} {isArabic ? 'الترتيب' : 'Order'}
            </Button>
            <div className="flex gap-1">
              <Button
                variant={filters.view === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setFilters((prev) => ({ ...prev, view: 'grid' }))}
                aria-label={isArabic ? 'عرض شبكة' : 'Grid view'}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={filters.view === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setFilters((prev) => ({ ...prev, view: 'list' }))}
                aria-label={isArabic ? 'عرض قائمة' : 'List view'}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
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
              {filters.view === 'grid' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                      showProject={true}
                    />
                  ))}
                </div>
              ) : (
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
                      showProject={true}
                    />
                  ))}
                </div>
              )}
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