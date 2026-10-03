/**
 * Project Files Tab
 * File management using existing storage system
 */

'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, FolderOpen, File, Upload, MoreHorizontal, Download, Trash2, Eye, Share2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/project';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ProjectFilesTabProps {
  projectId: string;
  project: Project;
}

const labels = {
  files: { ar: 'الملفات', en: 'Files' },
  search: { ar: 'البحث في الملفات...', en: 'Search files...' },
  all: { ar: 'الكل', en: 'All' },
  documents: { ar: 'مستندات', en: 'Documents' },
  images: { ar: 'صور', en: 'Images' },
  upload: { ar: 'رفع ملف', en: 'Upload' },
  noFiles: { ar: 'لا توجد ملفات', en: 'No files' },
  noFilesFiltered: { ar: 'لا توجد ملفات تطابق البحث', en: 'No files match search' },
  loading: { ar: 'جاري التحميل...', en: 'Loading...' },
  error: { ar: 'خطأ في التحميل', en: 'Error loading files' },
  retry: { ar: 'إعادة المحاولة', en: 'Retry' },
  download: { ar: 'تحميل', en: 'Download' },
  preview: { ar: 'معاينة', en: 'Preview' },
  share: { ar: 'مشاركة', en: 'Share' },
  delete: { ar: 'حذف', en: 'Delete' },
  confirmDelete: { ar: 'هل أنت متأكد من حذف هذا الملف؟', en: 'Are you sure you want to delete this file?' },
};

const typeOptions = [
  { value: 'all', label: { ar: 'الكل', en: 'All' } },
  { value: 'document', label: { ar: 'مستندات', en: 'Documents' } },
  { value: 'image', label: { ar: 'صور', en: 'Images' } },
  { value: 'video', label: { ar: 'فيديو', en: 'Video' } },
  { value: 'audio', label: { ar: 'صوت', en: 'Audio' } },
  { value: 'archive', label: { ar: 'أرشيف', en: 'Archive' } },
  { value: 'other', label: { ar: 'أخرى', en: 'Other' } },
];

export function ProjectFilesTab({ projectId, project }: ProjectFilesTabProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const dateLocale = isArabic ? ar : enUS;
  const projectPath = `/${locale}/projects/${project.id}`;

  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual file fetch action
      // const result = await getProjectFilesAction(projectId);
      // if (result.success) setFiles(result.data || []);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error[isArabic ? 'ar' : 'en']);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, isArabic]);

  const handleUpload = async (file: File) => {
    // TODO: Implement upload
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm(labels.confirmDelete[isArabic ? 'ar' : 'en'])) return;
    // TODO: Implement delete
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || file.mime_type?.startsWith(typeFilter);
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-10 w-32 bg-muted rounded" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 bg-card border rounded-xl">
              <div className="h-20 w-full bg-muted rounded-lg mb-3" />
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded mt-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={fetchFiles}>
            {labels.retry[isArabic ? 'ar' : 'en']}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{labels.files[isArabic ? 'ar' : 'en']}</h2>
        </div>
        <Button asChild>
          <a href={`${projectPath}/files/upload`}>
            <Upload className="mr-2 h-4 w-4" />
            {labels.upload[isArabic ? 'ar' : 'en']}
          </a>
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={labels.search[isArabic ? 'ar' : 'en']}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={typeFilter} onValueChange={setTypeFilter} className="flex-1 sm:w-auto">
              <TabsList className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                {typeOptions.map((opt) => (
                  <TabsTrigger key={opt.value} value={opt.value} className="text-xs py-1.5">
                    {opt.label[isArabic ? 'ar' : 'en']}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid */}
      <Card>
        <CardContent className="p-0">
          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <File className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p className="text-lg font-medium mb-1">
                {search || typeFilter !== 'all'
                  ? labels.noFilesFiltered[isArabic ? 'ar' : 'en']
                  : labels.noFiles[isArabic ? 'ar' : 'en']}
              </p>
              {(!search && typeFilter === 'all') && (
                <Button asChild className="mt-4">
                  <a href={`${projectPath}/files/upload`}>
                    <Upload className="mr-2 h-4 w-4" />
                    {labels.upload[isArabic ? 'ar' : 'en']}
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {filteredFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    isArabic={isArabic}
                    dateLocale={dateLocale}
                    onDelete={() => handleDelete(file.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FileCard({ file, isArabic, dateLocale, onDelete }: {
  file: any;
  isArabic: boolean;
  dateLocale: any;
  onDelete: () => void;
}) {
  const isImage = file.mime_type?.startsWith('image/');
  const isPDF = file.mime_type === 'application/pdf';
  const isFolder = file.mime_type === 'folder';

  return (
    <div className="group relative bg-card border rounded-xl p-4 transition-all hover:shadow-lg">
      <div className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
        {isImage && file.thumbnail_url ? (
          <img src={file.thumbnail_url} alt={file.name} className="w-full h-full object-cover" />
        ) : isFolder ? (
          <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
        ) : isPDF ? (
          <File className="h-12 w-12 text-red-500" />
        ) : (
          <File className="h-12 w-12 text-muted-foreground/50" />
        )}
      </div>
      <p className="text-sm font-medium truncate mb-1" title={file.name}>
        {file.name}
      </p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {formatDistanceToNow(new Date(file.created_at), { addSuffix: true, locale: dateLocale })}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5" />
              {labels.preview[isArabic ? 'ar' : 'en']}
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Download className="h-3.5 w-3.5" />
              {labels.download[isArabic ? 'ar' : 'en']}
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Share2 className="h-3.5 w-3.5" />
              {labels.share[isArabic ? 'ar' : 'en']}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive flex items-center gap-2" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              {labels.delete[isArabic ? 'ar' : 'en']}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}