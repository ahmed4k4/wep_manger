# Loading & Empty States Strategy

## Overview

This document defines the patterns for handling loading states, skeleton screens, and empty states to provide a smooth user experience.

---

## Loading States

### Loading Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Page Skeleton** | Initial page load | Server Component with Suspense |
| **Component Skeleton** | Partial data loading | Client Component with Suspense |
| **Inline Spinner** | Button/actions | `disabled` + spinner |
| **Overlay Loader** | Full-page transitions | Route loading.tsx |
| **Progress Bar** | File uploads | XMLHttpRequest progress |

---

## Skeleton Components

### Base Skeleton
```typescript
// shared/components/ui/Skeleton.tsx
import { cn } from '@/shared/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ 
  className, 
  variant = 'text', 
  width, 
  height, 
  ...props 
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-muted',
        {
          'h-4 w-full': variant === 'text',
          'rounded-full': variant === 'circular',
          'rounded-lg': variant === 'rectangular',
        },
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
}
```

### Composite Skeletons
```typescript
// shared/components/ui/Skeletons.tsx
import { Skeleton } from './Skeleton';

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="space-y-2 flex-1">
          <Skeleton width="40%" />
          <Skeleton width="60%" />
        </div>
      </div>
      <Skeleton width="100%" />
      <Skeleton width="80%" />
      <div className="flex gap-2">
        <Skeleton width={80} height={32} variant="rectangular" />
        <Skeleton width={80} height={32} variant="rectangular" />
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton width="60%" />
          <Skeleton width="80%" />
        </div>
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton variant="rectangular" width={80} height={24} />
        <Skeleton variant="rectangular" width={80} height={24} />
        <Skeleton variant="circular" width={24} height={24} />
      </div>
    </div>
  );
}

export function ProjectListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="60%" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton key={col} variant="text" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <Skeleton width="40%" />
            <Skeleton width="60%" height={32} variant="rectangular" />
          </div>
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <Skeleton width="40%" />
          <Skeleton width="100%" height={200} variant="rectangular" />
        </div>
        <div className="card p-4">
          <Skeleton width="40%" />
          <Skeleton width="100%" height={200} variant="rectangular" />
        </div>
      </div>
      
      {/* Recent activity */}
      <div className="card p-4 space-y-4">
        <Skeleton width="30%" />
        <TableSkeleton rows={5} columns={4} />
      </div>
    </div>
  );
}
```

---

## Suspense Boundaries

### Page-Level Suspense
```typescript
// app/[locale]/projects/[projectId]/page.tsx
import { Suspense } from 'react';
import { ProjectHeader } from '@/features/projects/components/ProjectHeader';
import { ProjectTabs } from '@/features/projects/components/ProjectTabs';
import { ProjectListSkeleton } from '@/shared/components/ui/Skeletons';
import { getProjectWithDetails } from '@/features/projects/repositories/projectQueries';
import { notFound } from 'next/navigation';

export default async function ProjectPage({ 
  params 
}: { 
  params: Promise<{ projectId: string }> 
}) {
  const { projectId } = await params;
  const project = await getProjectWithDetails(projectId);
  
  if (!project) notFound();
  
  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />
      
      <Suspense fallback={<ProjectListSkeleton count={5} />}>
        <ProjectTabs projectId={projectId} />
      </Suspense>
    </div>
  );
}
```

### Component-Level Suspense
```typescript
// features/tasks/components/TaskList.tsx
'use client';

import { Suspense, useState } from 'react';
import { TaskCard } from './TaskCard';
import { TaskCardSkeleton, TableSkeleton } from '@/shared/components/ui/Skeletons';
import { useTasks } from '../hooks/useTasks';

export function TaskList({ projectId }: { projectId: string }) {
  const [view, setView] = useState<'board' | 'list'>('board');
  
  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-2">
        <button onClick={() => setView('board')}>Board</button>
        <button onClick={() => setView('list')}>List</button>
      </div>
      
      {view === 'board' ? (
        <Suspense fallback={<ProjectListSkeleton count={5} />}>
          <TaskBoard projectId={projectId} />
        </Suspense>
      ) : (
        <Suspense fallback={<TableSkeleton rows={10} columns={6} />}>
          <TaskTable projectId={projectId} />
        </Suspense>
      )}
    </div>
  );
}

function TaskBoard({ projectId }: { projectId: string }) {
  const { tasks, columns } = useTasks(projectId);
  
  return (
    <div className="grid gap-4 grid-cols-4">
      {columns.map(column => (
        <div key={column.id} className="space-y-3">
          <h3 className="font-medium">{column.title}</h3>
          <div className="space-y-2 min-h-[200px]">
            {tasks
              .filter(t => t.status === column.id)
              .map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskTable({ projectId }: { projectId: string }) {
  const { tasks } = useTasks(projectId);
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr key={task.id}>
              <td>{task.title}</td>
              <td>{task.status}</td>
              <td>{task.priority}</td>
              <td>{task.assignee?.name || '-'}</td>
              <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Route Loading (Next.js App Router)

### Global Loading
```typescript
// app/[locale]/loading.tsx
import { DashboardSkeleton } from '@/shared/components/ui/Skeletons';

export default function Loading() {
  return <DashboardSkeleton />;
}
```

### Feature-Specific Loading
```typescript
// app/[locale]/projects/[projectId]/loading.tsx
import { ProjectListSkeleton } from '@/shared/components/ui/Skeletons';

export default function ProjectLoading() {
  return (
    <div className="container px-4 py-6 space-y-6">
      <div className="space-y-4">
        <CardSkeleton />
      </div>
      <ProjectListSkeleton count={5} />
    </div>
  );
}
```

---

## Button & Action Loading

### Loading Button
```typescript
// shared/components/ui/LoadingButton.tsx
'use client';

import { Button, ButtonProps } from './button';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export function LoadingButton({ 
  loading, 
  loadingText, 
  disabled, 
  children, 
  ...props 
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {loading ? loadingText : children}
    </Button>
  );
}

// Usage
<LoadingButton 
  loading={pending} 
  loadingText="Saving..."
  onClick={handleSave}
>
  Save
</LoadingButton>
```

### Form Submit Loading
```typescript
// shared/hooks/useSubmit.ts
'use client';

import { useState } from 'react';

export function useSubmit<T>(
  onSubmit: (data: T) => Promise<void>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const submit = async (data: T) => {
    setLoading(true);
    setError(null);
    
    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  };
  
  return { submit, loading, error };
}
```

---

## Empty States

### Empty State Patterns

| Context | Component | Action |
|---------|-----------|--------|
| **No projects** | DashboardEmpty | "Create Project" CTA |
| **No tasks** | TaskEmpty | "Create Task" CTA |
| **No members** | MemberEmpty | "Invite Member" CTA |
| **No files** | FileEmpty | "Upload File" CTA |
| **No notes** | NoteEmpty | "Create Note" CTA |
| **Search no results** | SearchEmpty | "Clear filters" |
| **Error state** | ErrorEmpty | "Try again" |

### Base Empty State
```typescript
// shared/components/ui/EmptyState.tsx
import { ReactNode } from 'react';
import { Button } from './button';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  secondaryAction,
  className 
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}>
      <div className="text-muted-foreground mb-4">{icon}</div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      
      {action && (
        <Button 
          onClick={action.onClick} 
          variant={action.variant || 'default'}
          className="mb-2"
        >
          {action.label}
        </Button>
      )}
      
      {secondaryAction && (
        <Button 
          variant="ghost" 
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.label}
        </Button>
      )}
    </div>
  );
}
```

### Feature Empty States
```typescript
// features/projects/components/EmptyStates.tsx
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { Plus, Users, FileText, Search, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export function NoProjectsEmpty() {
  const t = useTranslations('projects');
  const router = useRouter();
  
  return (
    <EmptyState
      icon={<Plus className="w-16 h-16" />}
      title={t('noProjects')}
      description={t('createFirst')}
      action={{
        label: t('createProject'),
        onClick: () => router.push('/en/projects/new'),
      }}
    />
  );
}

export function NoTasksEmpty({ projectId, onCreate }: { projectId: string; onCreate: () => void }) {
  const t = useTranslations('tasks');
  
  return (
    <EmptyState
      icon={<FileText className="w-16 h-16" />}
      title={t('noTasks')}
      description="Create your first task to get started"
      action={{
        label: t('createTask'),
        onClick: onCreate,
      }}
    />
  );
}

export function NoMembersEmpty({ projectId, onInvite }: { projectId: string; onInvite: () => void }) {
  const t = useTranslations('members');
  
  return (
    <EmptyState
      icon={<Users className="w-16 h-16" />}
      title={t('noMembers')}
      description="Invite team members to collaborate"
      action={{
        label: t('inviteMember'),
        onClick: onInvite,
      }}
    />
  );
}

export function NoFilesEmpty({ onUpload }: { onUpload: () => void }) {
  const t = useTranslations('files');
  
  return (
    <EmptyState
      icon={<FileText className="w-16 h-16" />}
      title={t('noFiles')}
      description="Upload files to share with your team"
      action={{
        label: t('uploadFile'),
        onClick: onUpload,
      }}
    />
  );
}

export function NoNotesEmpty({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations('notes');
  
  return (
    <EmptyState
      icon={<FileText className="w-16 h-16" />}
      title={t('noNotes')}
      description="Create notes to document important information"
      action={{
        label: t('createNote'),
        onClick: onCreate,
      }}
    />
  );
}

export function SearchEmpty({ onClear }: { onClear: () => void }) {
  const t = useTranslations('common');
  
  return (
    <EmptyState
      icon={<Search className="w-16 h-16" />}
      title={t('noResults')}
      description={t('tryDifferentSearch')}
      action={{
        label: t('clearFilters'),
        onClick: onClear,
        variant: 'outline',
      }}
    />
  );
}

export function FilterEmpty({ onClear }: { onClear: () => void }) {
  const t = useTranslations('common');
  
  return (
    <EmptyState
      icon={<Filter className="w-16 h-16" />}
      title={t('noResults')}
      description={t('tryDifferentFilter')}
      action={{
        label: t('clearFilters'),
        onClick: onClear,
        variant: 'outline',
      }}
    />
  );
}
```

---

## Data Fetching with Loading/Empty/Error

### Unified Data Component
```typescript
// shared/components/ui/DataDisplay.tsx
'use client';

import { Suspense, ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { useTranslations } from 'next-intl';

interface DataDisplayProps<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  children: (data: T) => ReactNode;
  empty?: {
    icon: ReactNode;
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
  };
  skeleton?: ReactNode;
  onRetry?: () => void;
}

export function DataDisplay<T>({ 
  data, 
  error, 
  isLoading, 
  children, 
  empty,
  skeleton,
  onRetry 
}: DataDisplayProps<T>) {
  const t = useTranslations('common');
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        {skeleton || <DefaultSkeleton />}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">{t('failedToLoad')}</h3>
        <p className="text-muted-foreground mb-4 max-w-md">{error.message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('tryAgain')}
          </Button>
        )}
      </div>
    );
  }
  
  if (!data || (Array.isArray(data) && data.length === 0)) {
    if (empty) {
      return <EmptyState {...empty} />;
    }
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p>{t('noData')}</p>
      </div>
    );
  }
  
  return <>{children(data)}</>;
}

function DefaultSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
```

### Usage Example
```typescript
// features/tasks/components/TaskListContainer.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { DataDisplay } from '@/shared/components/ui/DataDisplay';
import { TaskCard } from './TaskCard';
import { NoTasksEmpty } from '@/features/projects/components/EmptyStates';
import { FileText, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function TaskListContainer({ projectId }: { projectId: string }) {
  const t = useTranslations('tasks');
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => fetchTasks(projectId),
  });
  
  return (
    <DataDisplay
      data={data}
      error={error}
      isLoading={isLoading}
      empty={{
        icon: <FileText className="w-16 h-16" />,
        title: t('noTasks'),
        description: "Create your first task to get started",
        action: { label: t('createTask'), onClick: () => openCreateModal() },
      }}
      skeleton={<ProjectListSkeleton count={5} />}
      onRetry={() => refetch()}
    >
      {(tasks) => (
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </DataDisplay>
  );
}
```

---

## Progressive Loading

### Streaming with Suspense
```typescript
// app/[locale]/dashboard/page.tsx
import { Suspense } from 'react';
import { StatsCards } from '@/features/dashboard/components/StatsCards';
import { RecentProjects } from '@/features/dashboard/components/RecentProjects';
import { ActivityFeed } from '@/features/dashboard/components/ActivityFeed';
import { DashboardSkeleton } from '@/shared/components/ui/Skeletons';

export default function DashboardPage() {
  return (
    <div className="container px-4 py-6 space-y-6">
      {/* Fast - static stats */}
      <StatsCards />
      
      {/* Medium - recent projects */}
      <Suspense fallback={<ProjectListSkeleton count={3} />}>
        <RecentProjects />
      </Suspense>
      
      {/* Slow - activity feed */}
      <Suspense fallback={<div className="card p-4"><Skeleton className="h-60 w-full" /></div>}>
        <ActivityFeed />
      </Suspense>
    </div>
  );
}
```

---

## Accessibility

### Loading Announcements
```typescript
// shared/components/ui/LoadingAnnouncer.tsx
'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export function LoadingAnnouncer({ 
  isLoading, 
  message 
}: { 
  isLoading: boolean; 
  message: string;
}) {
  const t = useTranslations('common');
  
  useEffect(() => {
    if (isLoading) {
      announce(t('loading') + ': ' + message);
    }
  }, [isLoading, message]);
  
  return null;
}

function announce(message: string) {
  const announcer = document.getElementById('loading-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
}

// In layout
<div id="loading-announcer" role="status" aria-live="polite" className="sr-only" />
```

### Skeleton Accessibility
```tsx
<div 
  className="animate-pulse bg-muted rounded" 
  aria-hidden="true"
  aria-label="Loading content"
/>
```

---

## Testing Loading/Empty States

### Component Tests
```typescript
// shared/components/ui/__tests__/EmptyState.test.tsx
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';
import { Plus } from 'lucide-react';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        icon={<Plus />}
        title="No items"
        description="Create your first item"
      />
    );
    
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Create your first item')).toBeInTheDocument();
  });
  
  it('renders action button', () => {
    const onClick = jest.fn();
    render(
      <EmptyState
        icon={<Plus />}
        title="No items"
        description="Create your first item"
        action={{ label: 'Create', onClick }}
      />
    );
    
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### E2E Tests
```typescript
// tests/loading-empty.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Loading and Empty States', () => {
  test('shows skeleton while loading', async ({ page }) => {
    await page.goto('/en/projects');
    
    // Should show skeleton immediately
    await expect(page.locator('.animate-pulse')).toBeVisible();
    
    // Wait for content
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible();
  });
  
  test('shows empty state when no projects', async ({ page }) => {
    await page.goto('/en/projects');
    
    await expect(page.locator('text=No projects yet')).toBeVisible();
    await expect(page.locator('text=Create your first project')).toBeVisible();
  });
  
  test('shows error state on failure', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/projects*', route => route.abort());
    
    await page.goto('/en/projects');
    
    await expect(page.locator('text=Failed to load')).toBeVisible();
    await expect(page.locator('text=Try again')).toBeVisible();
  });
});
```

---

## Summary

| State | Component | Pattern |
|-------|-----------|---------|
| **Page Load** | `loading.tsx` | Route-level skeleton |
| **Component Load** | `Suspense` + Skeleton | Partial hydration |
| **Action** | `LoadingButton` | Inline spinner |
| **Upload** | Progress bar | XHR progress event |
| **Empty** | `EmptyState` | Icon + title + CTA |
| **Error** | `DataDisplay` | Retry button |
| **Announce** | `LoadingAnnouncer` | Screen reader support |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*