/**
 * Progress Component
 * Premium SaaS design system
 */

'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

type ProgressVariant = 'default' | 'success' | 'warning' | 'danger';
type ProgressSize = 'sm' | 'md' | 'lg';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    variant?: ProgressVariant;
    size?: ProgressSize;
  }
>(({ className, value, variant = 'default', size = 'md', ...props }, ref) => {
  const variantColors: Record<ProgressVariant, string> = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const sizeClasses: Record<ProgressSize, string> = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-full bg-secondary',
        sizeClasses[size],
        className
      )}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full w-full flex-1 rounded-full transition-all duration-500 ease-out',
          variantColors[variant]
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
