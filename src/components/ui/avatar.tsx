/**
 * Avatar Component
 * Premium SaaS design system
 */

'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, delayMs, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    delayMs={delayMs}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: 'online' | 'offline' | 'busy' | 'away';
  statusPosition?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-muted-foreground/50',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
};

const statusPositions = {
  'bottom-right': 'bottom-0 right-0',
  'top-right': 'top-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'top-left': 'top-0 left-0',
};

function AvatarComponent({
  src,
  alt,
  name,
  size = 'md',
  className,
  status,
  statusPosition = 'bottom-right',
}: AvatarProps) {
  const fallbackContent = name ? (
    <span className="font-medium">{getInitials(name)}</span>
  ) : (
    <svg className="h-1/2 w-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  return (
    <div className={cn('relative inline-flex', className)}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={src ?? undefined} alt={alt || name || 'Avatar'} />
        <AvatarFallback delayMs={600}>{fallbackContent}</AvatarFallback>
      </Avatar>
      {status && (
        <span
          className={cn(
            'absolute flex h-3 w-3 rounded-full border-2 border-background',
            statusColors[status],
            statusPositions[statusPosition]
          )}
          aria-label={status}
        />
      )}
    </div>
  );
}

AvatarComponent.displayName = 'AvatarComponent';

export { Avatar, AvatarImage, AvatarFallback, AvatarComponent as AvatarWithStatus };