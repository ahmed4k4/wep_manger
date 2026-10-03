/**
 * EmptyState Component
 * Premium SaaS design system
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  illustration?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  illustration,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : icon ? (
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 text-muted-foreground/50">
          {icon}
        </div>
      ) : null}
      
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              className="w-full sm:w-auto"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              className="w-full sm:w-auto"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';

export { EmptyState };