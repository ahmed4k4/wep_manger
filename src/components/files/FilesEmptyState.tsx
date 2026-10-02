/**
 * Files Empty State
 */

'use client';

import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface FilesEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function FilesEmptyState({ title, description, actionLabel, onAction, icon }: FilesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon || (
        <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          <Upload className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}