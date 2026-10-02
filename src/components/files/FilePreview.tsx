/**
 * File Preview Component
 * Handles preview of images and PDFs
 */

'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { X, Download, RotateCw, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProjectFilePreviewUrl, getUserFilePreviewUrl, getProjectFileDownloadUrl, getUserFileDownloadUrl } from '@/app/actions/files';
import { toast } from 'sonner';

interface FilePreviewProps {
  fileId: string;
  type: 'project' | 'user';
  mimeType: string;
  fileName: string;
  onClose: () => void;
}

export function FilePreview({ fileId, type, mimeType, fileName, onClose }: FilePreviewProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    loadPreview();
  }, [fileId, type]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const previewAction = type === 'project' ? getProjectFilePreviewUrl : getUserFilePreviewUrl;
      const result = await previewAction(fileId);

      if (result.success && result.data?.signedUrl) {
        setPreviewUrl(result.data.signedUrl);
      } else {
        throw new Error(result.error || 'Failed to load preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
      toast.error(isArabic ? 'فشل في تحميل المعاينة' : 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const downloadAction = type === 'project' ? getProjectFileDownloadUrl : getUserFileDownloadUrl;
      const result = await downloadAction(fileId);

      if (result.success && result.data?.signedUrl) {
        window.open(result.data.signedUrl, '_blank');
      } else {
        throw new Error(result.error || 'Failed to get download URL');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-card p-6 rounded-lg max-w-md w-full mx-4 text-center">
          <div className="text-destructive mb-4">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {isArabic ? 'لا يمكن عرض هذا الملف' : 'Cannot Preview This File'}
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              {isArabic ? 'تحميل بدلاً من ذلك' : 'Download Instead'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {isArabic ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-card p-6 rounded-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isArabic ? 'جاري تحميل المعاينة...' : 'Loading preview...'}
          </p>
        </div>
      </div>
    );
  }

  if (!previewUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={isArabic ? 'إغلاق' : 'Close'}>
            <X className="h-6 w-6" />
          </Button>
          <h3 className="text-lg font-medium truncate max-w-[300px]">{fileName}</h3>
        </div>

        <div className="flex items-center gap-2">
          {isImage && (
            <>
              <Button variant="ghost" size="icon" onClick={handleZoomOut} aria-label={isArabic ? 'تصغير' : 'Zoom out'} disabled={zoom <= 0.25}>
                <Minus className="h-5 w-5" />
              </Button>
              <span className="w-16 text-center text-sm text-white/80">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} aria-label={isArabic ? 'تكبير' : 'Zoom in'} disabled={zoom >= 3}>
                <Plus className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleRotate} aria-label={isArabic ? 'تدوير' : 'Rotate'}>
                <RotateCw className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleReset} aria-label={isArabic ? 'إعادة تعيين' : 'Reset'}>
                <RefreshCw className="h-5 w-5" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={handleDownload} aria-label={isArabic ? 'تحميل' : 'Download'}>
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        {isImage && (
          <img
            src={previewUrl}
            alt={fileName}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
            className="max-w-full max-h-full object-contain"
          />
        )}
        {isPdf && (
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            title={fileName}
            className="w-full h-full min-h-[600px] rounded-lg"
            style={{ border: 'none' }}
          />
        )}
      </div>
    </div>
  );
}

// Need to import AlertCircle and RefreshCw
import { AlertCircle, RefreshCw } from 'lucide-react';