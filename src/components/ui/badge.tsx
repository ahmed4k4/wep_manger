/**
 * Badge Component
 * Premium SaaS design system
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        success: 'border-transparent bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20',
        warning: 'border-transparent bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20',
        info: 'border-transparent bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20',
        ghost: 'border-transparent bg-transparent text-foreground hover:bg-accent',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}

Badge.displayName = 'Badge';

export { Badge, badgeVariants };