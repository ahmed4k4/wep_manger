/**
 * Input Component
 * Premium SaaS design system
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size = 'md', ...props }, ref) => {
    const sizeClasses: Record<InputSize, string> = {
      sm: 'h-8 px-2.5 py-1.5 text-xs',
      md: 'h-10 px-3 py-2.5 text-sm',
      lg: 'h-12 px-4 py-3 text-base',
    };

    return (
      <input
        type={type}
        className={cn(
          'flex w-full rounded-lg border border-input bg-background ring-offset-background',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'focus:border-ring focus:ring-0',
          'hover:border-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
