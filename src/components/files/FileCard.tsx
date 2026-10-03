/**
 * File Card Component
 * Displays file information with actions
 */

'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Check, Download, Eye, Edit, Trash2, FileText, Image, FileArchive, FileSpreadsheet, MoreHorizontal, X } from 'lucide-react';
import { formatFileSize, getFileIcon } from '@/lib/utils';

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

interface FileCardProps {
  file: FileWithUploader;
  type: 'project' | 'user';
  onDownload?: (fileId: string) => void;
  onPreview?: (fileId: string, mimeType: string, name: string) => void;
  onRename?: (fileId: string, newName: string) => void;
  onDelete?: (fileId: string) => void;
  canManage?: boolean;
  showUploader?: boolean;
  showProject?: boolean;
}

export function FileCard({
  file,
  type,
  onDownload,
  onPreview,
  onRename,
  onDelete,
  canManage = false,
  showUploader = true,
}: FileCardProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(file.name);

  const icon = getFileIcon(file.mime_type);
  const isPreviewable = ['image/', 'application/pdf'].some(t => file.mime_type.startsWith(t));

  const handleDownload = () => onDownload?.(file.id);
  const handlePreview = () => onPreview?.(file.id, file.mime_type, file.name);
  const handleRename = () => {
    if (renameValue.trim() && renameValue !== file.name) {
      onRename?.(file.id, renameValue.trim());
    }
    setIsRenaming(false);
  };
  const handleDelete = () => onDelete?.(file.id);

  const IconComponent = {
    pdf: FileText,
    image: Image,
    doc: FileText,
    xls: FileSpreadsheet,
    archive: FileArchive,
    file: FileText,
  }[icon] || FileText;

  return (
    <div className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-accent/50 transition-colors">
      {/* File Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
        <IconComponent className="h-6 w-6 text-muted-foreground" />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              onBlur={handleRename}
              autoFocus
              className="flex-1 px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button variant="ghost" size="icon" onClick={handleRename}>
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsRenaming(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{file.name}</h4>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={() => setIsRenaming(true)}
                  aria-label={isArabic ? 'إعادة تسمية' : 'Rename'}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span>{formatFileSize(file.size)}</span>
              <span>{file.mime_type}</span>
              {showUploader && file.uploader?.full_name && (
                <span>{isArabic ? 'بواسطة' : 'by'} {file.uploader.full_name}</span>
              )}
              <span>{new Date(file.created_at).toLocaleDateString(locale)}</span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {isPreviewable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreview}
            aria-label={isArabic ? 'معاينة' : 'Preview'}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          aria-label={isArabic ? 'تحميل' : 'Download'}
        >
          <Download className="h-4 w-4" />
        </Button>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={isArabic ? 'خيارات' : 'Options'}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isPreviewable && (
                <DropdownMenuItem onClick={handlePreview}>
                  <Eye className="mr-2 h-4 w-4" />
                  {isArabic ? 'معاينة' : 'Preview'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                {isArabic ? 'تحميل' : 'Download'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                <Edit className="mr-2 h-4 w-4" />
                {isArabic ? 'إعادة تسمية' : 'Rename'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                {isArabic ? 'حذف' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
