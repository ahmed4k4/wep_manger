/**
 * Button Component
 * Premium SaaS design system
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md focus-visible:ring-primary/40',
        primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md focus-visible:ring-primary/40',
        secondary: 'bg-secondary text-secondary-foreground border border-transparent hover:bg-secondary-hover hover:shadow-sm focus-visible:ring-secondary/40',
        outline: 'bg-transparent border border-border hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/20',
        ghost: 'bg-transparent hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/10',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover hover:shadow-md focus-visible:ring-destructive/40',
        success: 'bg-success text-success-foreground shadow-sm hover:bg-success/90 hover:shadow-md focus-visible:ring-success/40',
        link: 'text-primary underline-offset-4 hover:underline bg-transparent',
      },
      size: {
        default: 'h-10 px-4 rounded-lg text-sm gap-2',
        sm: 'h-9 px-3 rounded-md text-sm gap-1.5',
        lg: 'h-11 px-6 rounded-xl text-base gap-2',
        xl: 'h-12 px-8 rounded-xl text-base font-semibold gap-2.5',
        'icon': 'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-md',
        'icon-lg': 'h-12 w-12 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
          </svg>
        )}
        {!loading && children}
        {loading && <span className="sr-only">Loading...</span>}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
