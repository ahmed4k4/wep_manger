/**
 * Skeleton Component
 * Premium SaaS design system
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
}

function Skeleton({
  className,
  variant = 'text',
  animation = 'pulse',
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-full max-w-[250px] rounded',
    circular: 'h-10 w-10 rounded-full',
    rectangular: 'h-16 w-full rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-[wave_1.5s_ease-in-out_infinite]',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-muted',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      {...props}
    />
  );
}

Skeleton.displayName = 'Skeleton';

export { Skeleton };