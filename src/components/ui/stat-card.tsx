/**
 * StatCard Component
 * Premium SaaS design system
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label?: string;
    period?: string;
  };
  icon?: React.ReactNode;
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
  onClick?: () => void;
}

function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  iconColor = 'primary',
  variant = 'default',
  className,
  onClick,
}: StatCardProps) {
  const iconColors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-yellow-500/10 text-yellow-500',
    danger: 'bg-red-500/10 text-red-500',
    info: 'bg-blue-500/10 text-blue-500',
  };

  const variants = {
    default: 'border border-card-border/50 shadow-sm',
    elevated: 'border-0 shadow-lg',
    outlined: 'border-2 border-border',
  };

  const trendDirection = trend?.value ?? 0;
  const trendIcon = trendDirection > 0 ? TrendingUp : trendDirection < 0 ? TrendingDown : Minus;
  const trendColor = trendDirection > 0 ? 'text-green-500' : trendDirection < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div
      className={cn(
        'rounded-xl p-6 transition-all duration-300',
        'hover:shadow-md',
        variants[variant],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {icon && (
          <div className={cn('flex-shrink-0 p-3 rounded-xl', iconColors[iconColor])}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          <span className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
            {trendDirection > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : trendDirection < 0 ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend.value)}%
          </span>
          {trend.label && (
            <span className="text-sm text-muted-foreground">{trend.label}</span>
          )}
          {trend.period && (
            <span className="text-sm text-muted-foreground">{trend.period}</span>
          )}
        </div>
      )}
    </div>
  );
}

StatCard.displayName = 'StatCard';

export { StatCard };