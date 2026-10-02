# Responsive, RTL/LTR, Dark/Light, Accessibility - Consolidated Reference

## Project Management Platform - Cross-Cutting Concerns

---

## 1. Responsive Breakpoints

### Breakpoint Values
```css
--bp-xs: 320px;   /* Small mobile */
--bp-sm: 640px;   /* Mobile landscape / small tablet */
--bp-md: 768px;   /* Tablet portrait */
--bp-lg: 1024px;  /* Tablet landscape / small desktop */
--bp-xl: 1280px;  /* Desktop */
--bp-2xl: 1440px; /* Large desktop */
--bp-3xl: 1920px; /* Ultra-wide */
```

### Tailwind Breakpoint Mapping
```js
// tailwind.config.ts
screens: {
  'xs': '320px',
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1440px',
  '3xl': '1920px',
}
```

### Component Breakpoint Behavior

| Component | ≥ 1440px (3xl) | 1280-1439px (xl) | 1024-1279px (lg) | 768-1023px (md) | < 768px (sm) |
|-----------|----------------|------------------|------------------|-----------------|--------------|
| **Sidebar** | Expanded (280px) | Expanded (280px) | Expanded (280px) | **Sheet** | **Sheet** |
| **Sidebar Collapsed** | 72px | 72px | 72px | N/A | N/A |
| **Top Bar Breadcrumbs** | Visible | Visible | Visible | Hidden | Hidden |
| **Project Tabs** | All visible | All visible | Scroll if needed | Horizontal scroll | Horizontal scroll |
| **Tables** | Full columns | Full columns | Horizontal scroll | **Card view** | **Card view** |
| **Kanban** | 5+ columns | 4-5 columns | 3-4 columns | 2 columns | 1 column (stack) |
| **Forms** | 2-col grid | 2-col grid | 2-col grid | 1-col | 1-col |
| **Modals** | Centered (max-w-2xl) | Centered (max-w-2xl) | Centered (max-w-lg) | **Full-screen Sheet** | **Full-screen Sheet** |
| **Stats Grid** | 4 columns | 4 columns | 4 columns | 2 columns | 1 column |
| **Project Cards** | 3 columns | 3 columns | 3 columns | 2 columns | 1 column |

### Responsive Utilities
```tsx
// Hook for breakpoint detection
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'>('lg');
  
  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      if (width >= 1920) setBreakpoint('3xl');
      else if (width >= 1440) setBreakpoint('2xl');
      else if (width >= 1280) setBreakpoint('xl');
      else if (width >= 1024) setBreakpoint('lg');
      else if (width >= 768) setBreakpoint('md');
      else if (width >= 640) setBreakpoint('sm');
      else setBreakpoint('xs');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  
  return breakpoint;
}

// CSS Container Queries (modern approach)
@container (min-width: 768px) {
  .card-grid { grid-template-columns: repeat(2, 1fr); }
}
@container (min-width: 1024px) {
  .card-grid { grid-template-columns: repeat(3, 1fr); }
}
@container (min-width: 1280px) {
  .card-grid { grid-template-columns: repeat(4, 1fr); }
}
```

---

## 2. RTL/LTR Specifications

### Direction Context
```tsx
// Provider sets dir on html element
<html dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
```

### Logical Properties (MANDATORY)
```css
/* ✅ USE - Logical properties */
margin-inline-start: var(--space-4);
margin-inline-end: var(--space-4);
padding-inline-start: var(--space-4);
padding-inline-end: var(--space-4);
border-inline-start: 1px solid var(--border);
border-inline-end: 1px solid var(--border);
inset-inline-start: 0;
inset-inline-end: auto;
text-align: start;
text-align: end;
float: inline-start;
float: inline-end;

/* ❌ AVOID - Physical properties */
margin-left: var(--space-4);
margin-right: var(--space-4);
padding-left: var(--space-4);
padding-right: var(--space-4);
border-left: 1px solid var(--border);
border-right: 1px solid var(--border);
left: 0;
right: auto;
text-align: left;
text-align: right;
float: left;
float: right;
```

### Tailwind Logical Classes
```tsx
// Use these instead of l/r variants
<div className="ps-4 pe-4 ms-2 me-2 border-s border-e">
<div className="text-start text-end">
<div className="float-start float-end">
<div className="inset-inline-start-0 inset-inline-end-auto">

// For explicit RTL/LTR overrides
<div className="rtl:ps-4 ltr:pe-4">
<Icon className="rtl:-scale-x-100" />
```

### Icons Requiring Flip in RTL
```tsx
const flipInRTL = [
  'ChevronLeft', 'ChevronRight',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeftRight', 'ArrowRightLeft',
  'Navigation', 'Navigation2',
  'PanelLeft', 'PanelRight',
  'MoveHorizontal',
  'SeparatorHorizontal',
];

// Usage
<ChevronRight className="rtl:-scale-x-100" />
<ArrowRight className="rtl:-scale-x-100" />
```

### Components with RTL-Specific Behavior

#### Sidebar
```tsx
// LTR: Left side, RTL: Right side
<Sidebar 
  side={locale === 'ar' ? 'right' : 'left'} 
  // Sheet slides from correct side
/>
```

#### Breadcrumbs
```tsx
// Separator flips automatically with logical properties
<BreadcrumbSeparator className="mx-2" />  // Uses margin-inline
```

#### Dropdown Menus
```tsx
// Position: bottom-start (LTR) / bottom-end (RTL)
<DropdownContent side="bottom" align="start" />
```

#### Tooltips
```tsx
// Auto-flip with sideOffset
<TooltipContent side="top" align="center" />
```

#### Pagination
```tsx
// Previous/Next icons flip
<PaginationPrevious><ChevronLeft className="rtl:-scale-x-100"/></PaginationPrevious>
<PaginationNext><ChevronRight className="rtl:-scale-x-100"/></PaginationNext>
```

#### Carousel/Sliders
```tsx
// Direction reverses
<Carousel direction={locale === 'ar' ? 'rtl' : 'ltr'} />
```

### Arabic Typography
```css
:dir(rtl) {
  font-family: var(--font-arabic);
  font-size: calc(var(--text-base) + 1px);  /* +1px for Arabic readability */
  line-height: 1.7;
}

/* Numbers remain LTR */
[dir="rtl"] .number,
[dir="rtl"] .timestamp,
[dir="rtl"] .code {
  direction: ltr;
  unicode-bidi: isolate;
}

/* Input fields */
[dir="rtl"] input[type="text"],
[dir="rtl"] textarea {
  text-align: start;
}
[dir="rtl"] input[type="number"],
[dir="rtl"] input[type="email"] {
  direction: ltr;
  text-align: start;
}
```

### Form Layout RTL
```tsx
// Labels above inputs (stacked) - no change needed
// Side-by-side labels - use flex with logical properties
<div className="flex items-center gap-4">
  <Label className="w-24 text-end rtl:text-start">Label</Label>
  <Input className="flex-1" />
</div>

// Or better: stacked on mobile, side-by-side on desktop
<div className="grid gap-4 sm:grid-cols-[auto_1fr]">
  <Label>Label</Label>
  <Input />
</div>
```

### Table RTL
```tsx
// Column order reverses visually, but data structure stays same
// Actions column: start (LTR) / end (RTL)
<TableRow>
  <TableCell><Checkbox /></TableCell>  {/* Always first */}
  <TableCell>Title</TableCell>
  <TableCell className="hidden md:table-cell">Status</TableCell>
  <TableCell className="text-end">Actions</TableCell>  {/* Logical: text-end */}
</TableRow>
```

---

## 3. Dark/Light Mode

### Theme Provider Setup
```tsx
// providers/ThemeProvider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type Theme } from 'next-themes/dist/types';

export function ThemeProvider({ 
  children, 
  ...props 
}: { 
  children: React.ReactNode;
  attribute?: 'class' | 'data-theme';
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
```

### Inline Script (No Flash)
```html
<!-- app/layout.tsx - in <head> -->
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        try {
          var theme = localStorage.getItem('theme');
          var system = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (theme === 'dark' || (!theme && system)) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (e) {}
      })();
    `,
  }}
/>
```

### Theme Toggle Component
```tsx
// components/ui/ThemeToggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <Monitor className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Color Adaptation Reference

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Page Background** | `--background` (white) | `--background` (slate-950) |
| **Card Background** | `--card` (white) | `--card` (slate-900) |
| **Card Border** | `--border` (slate-200) | `--border` (slate-700) |
| **Input Background** | `white` | `--input` (slate-800) |
| **Input Border** | `--input` (slate-200) | `--input` (slate-700) |
| **Hover Background** | `--muted` (slate-100) | `--muted` (slate-800) |
| **Muted Text** | `--muted-foreground` (slate-500) | `--muted-foreground` (slate-400) |
| **Primary** | `--primary` (blue-500) | `--primary` (blue-400) |
| **Shadows** | Subtle gray | Stronger black |
| **Scrollbar Track** | `--muted` | `--muted` |
| **Scrollbar Thumb** | `--border` | `--border` |
| **Code Background** | `--muted` | `--muted` |
| **Tooltip Background** | `--popover` (dark) | `--popover` (light) |

### Component-Specific Dark Adjustments
```css
/* Tables */
.dark .table-row:hover {
  background-color: hsl(var(--muted) / 0.5);
}

/* Modals - ensure contrast */
.dark .dialog-content {
  background-color: hsl(var(--card));
  border-color: hsl(var(--border));
}

/* Dropdowns */
.dark .dropdown-content {
  background-color: hsl(var(--popover));
  border-color: hsl(var(--border));
}

/* Toasts */
.dark .toast {
  background-color: hsl(var(--card));
  border-color: hsl(var(--border));
}

/* Scrollbars */
.dark ::-webkit-scrollbar-track {
  background: hsl(var(--muted));
}
.dark ::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
}
```

---

## 4. State Patterns

### Loading States

#### Page Level (Server Components)
```tsx
// app/[locale]/projects/loading.tsx
export default function ProjectsLoading() {
  return (
    <DashboardLayout>
      <PageHeaderSkeleton />
      <ProjectsGridSkeleton />
    </DashboardLayout>
  );
}

// PageHeaderSkeleton
function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>
      <Skeleton className="h-10 w-32 rounded" />
    </div>
  );
}

// ProjectsGridSkeleton
function ProjectsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

#### Component Level (Suspense)
```tsx
// Parent component
<Suspense fallback={<TasksTableSkeleton />}>
  <TasksTable projectId={projectId} />
</Suspense>

// TasksTableSkeleton
function TasksTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-8" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-16" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

#### Skeleton Patterns by Component

| Component | Skeleton Structure |
|-----------|-------------------|
| **Card** | Rounded rect (aspect-ratio 4:3), then 3 lines text |
| **Table Row** | 4-5 lines varying width (checkbox, title, badges, actions) |
| **List Item** | Avatar circle + 2 lines text (title, subtitle) |
| **Kanban Card** | Rect with priority badge, 3 lines, progress bar, meta |
| **Avatar** | Circle with pulse animation |
| **Button** | Rounded rect, same size as button |
| **Stat Card** | Large number line + label line |
| **Badge** | Small rounded rect |
| **Avatar Stack** | Overlapping circles |
| **Progress Bar** | Thin bar with pulse |

#### Pulse Animation
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.skeleton {
  animation: pulse 1.5s ease-in-out infinite;
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 25%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Empty States

#### EmptyState Component
```tsx
// components/ui/EmptyState.tsx
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="mb-4 text-muted-foreground/50" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
```

#### Empty State Variants

| Context | Icon | Title | Description | Action |
|---------|------|-------|-------------|--------|
| **No projects** | `FolderOpen` (48px) | "No projects yet" | "Create your first project to start organizing your work." | `<Button>Create Project</Button>` |
| **No tasks** | `CheckSquare` (48px) | "No tasks" | "Add a task to start tracking work in this project." | `<Button>Add Task</Button>` |
| **No members** | `Users` (48px) | "No members" | "Invite team members to collaborate on this project." | `<Button>Invite Members</Button>` |
| **No files** | `File` (48px) | "No files" | "Upload files to share with your team." | `<Button>Upload Files</Button>` |
| **No notes** | `FileText` (48px) | "No notes" | "Create notes to document decisions and ideas." | `<Button>New Note</Button>` |
| **No notifications** | `Bell` (48px) | "All caught up!" | "You have no unread notifications." | — |
| **Search no results** | `Search` (48px) | "No results found" | "Try adjusting your search or filters." | `<Button variant="ghost">Clear filters</Button>` |
| **No comments** | `MessageSquare` (48px) | "No comments yet" | "Be the first to start a discussion." | — |
| **No activity** | `Activity` (48px) | "No recent activity" | "Activity will appear here when things happen." | — |
| **Generic error** | `AlertCircle` (48px) | "Something went wrong" | "We couldn't load this content. Please try again." | `<Button onClick={retry}>Try Again</Button>` |

### Error States

#### Inline Form Errors
```tsx
// components/ui/FormField.tsx
<div className="space-y-1.5">
  <Label htmlFor={id} className="text-sm font-medium">
    {label} {required && <span className="text-destructive" aria-hidden="true">*</span>}
  </Label>
  <Input
    id={id}
    aria-invalid={!!error}
    aria-describedby={error ? `${id}-error` : undefined}
    aria-required={required}
    className={cn(
      error && "border-destructive focus:border-destructive focus:ring-destructive/20"
    )}
    {...field}
  />
  {error && (
    <p id={`${id}-error`} className="text-sm text-destructive flex items-center gap-1" role="alert">
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      {error}
    </p>
  )}
  {hint && !error && (
    <p id={`${id}-hint`} className="text-sm text-muted-foreground">
      {hint}
    </p>
  )}
</div>
```

#### Toast Notifications
```tsx
// lib/toast.ts
import { toast, type ToastOptions } from 'sonner';

export const showToast = {
  success: (message: string, description?: string) => 
    toast.success(message, { description, duration: 4000 }),
  
  error: (message: string, description?: string) => 
    toast.error(message, { description, duration: 6000 }),
  
  warning: (message: string, description?: string) => 
    toast.warning(message, { description, duration: 5000 }),
  
  info: (message: string, description?: string) => 
    toast.info(message, { description, duration: 4000 }),
  
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => 
    toast.promise(promise, messages),
  
  dismiss: (id?: string | number) => toast.dismiss(id),
};
```

#### Usage Examples
```tsx
// Success
showToast.success("Task created", "Your task has been added to the project.");

// Error
showToast.error("Failed to create task", "Please try again or contact support.");

// Warning
showToast.warning("Unsaved changes", "Your changes will be lost if you leave.");

// Info
showToast.info("New member joined", "Ahmed joined the project.");

// Promise
showToast.promise(
  createTask(data),
  {
    loading: "Creating task...",
    success: "Task created successfully!",
    error: "Failed to create task.",
  }
);
```

#### Page Error Boundary (`error.tsx`)
```tsx
// app/[locale]/projects/[id]/error.tsx
'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProjectError({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }; 
  reset: () => void; 
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground">
          {error.message || "An unexpected error occurred while loading the project."}
        </p>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
```

#### Global Error (`app/global-error.tsx`)
```tsx
'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }; 
  reset: () => void; 
}) {
  return (
    <html>
      <head>
        <title>Error - ProjectHub</title>
      </head>
      <body className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Application Error</h1>
          <p className="text-muted-foreground">
            A critical error occurred. The team has been notified.
          </p>
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </Button>
        </div>
      </body>
    </html>
  );
}
```

### Confirmation Dialogs

#### AlertDialog Pattern
```tsx
// components/ui/ConfirmDialog.tsx
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'destructive' | 'default';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'destructive',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => { onConfirm(); onOpenChange(false); }}
            disabled={loading}
            variant={variant}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {confirmText}
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

#### Confirmation Types

| Action | Title | Description | Variant |
|--------|-------|-------------|---------|
| Delete project | "Delete project?" | `This will permanently delete "${name}" and all its tasks, files, notes, and members. This action cannot be undone.` | Destructive |
| Delete task | "Delete task?" | `This will permanently delete "${title}". This action cannot be undone.` | Destructive |
| Remove member | "Remove member?" | `${name} will lose access to this project and all its content.` | Destructive |
| Archive project | "Archive project?" | `The project will become read-only. Members can still view but not modify content.` | Default |
| Leave project | "Leave project?" | `You will lose access to this project. You can be re-invited later.` | Default |
| Discard changes | "Discard changes?" | `You have unsaved changes that will be lost.` | Default |
| Mark all read | "Mark all as read?" | `This will clear all unread notifications.` | Default |
| Revoke session | "Revoke session?" | `This will sign you out from this device.` | Default |
| Delete account | "Delete your account?" | `This will permanently delete your account and all your data. This cannot be undone.` | Destructive |

---

## 5. Accessibility Requirements (WCAG 2.1 AA)

### Color Contrast
```css
/* All text meets 4.5:1 (normal) / 3:1 (large) */
.text-foreground { color: hsl(var(--foreground)); }        /* 15.3:1 light, 14.8:1 dark */
.text-muted-foreground { color: hsl(var(--muted-foreground)); } /* 7.2:1 light, 6.8:1 dark */
.text-primary { color: hsl(var(--primary-foreground)); }    /* On primary: 4.5:1+ */

/* UI Components 3:1 */
.border { border-color: hsl(var(--border)); }
.ring { --tw-ring-color: hsl(var(--ring)); }
.focus-visible:ring-2 { /* 3:1 against background */ }
```

### Keyboard Navigation
```tsx
// Focus visible styles (global)
*:focus-visible {
  outline: none;
  ring: 2px;
  ring-color: hsl(var(--ring));
  ring-offset: 2px;
  ring-offset-color: hsl(var(--background));
}

/* Skip Link - first focusable element */
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only fixed top-4 left-4 z-50 px-4 py-2 bg-primary text-primary-foreground rounded-md"
>
  Skip to main content
</a>

// Focus Trap in Modals/Sheets
import { FocusScope } from '@radix-ui/react-focus-scope';

<FocusScope>
  <DialogContent>...</DialogContent>
</FocusScope>

// Arrow key navigation in menus
<DropdownMenu>
  <DropdownMenuContent>
    <DropdownMenuItem onKeyDown={handleArrowKeys}>Item 1</DropdownMenuItem>
    <DropdownMenuItem onKeyDown={handleArrowKeys}>Item 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Screen Reader Support

#### Semantic HTML Structure
```tsx
// Page Layout
<header role="banner">        // Top bar
<nav role="navigation" aria-label="Main navigation">  // Sidebar
<main id="main-content" role="main">   // Page content
<aside role="complementary">  // Side panels
<footer role="contentinfo">   // Footer

// Headings Hierarchy
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>

// Tables
<table>
  <caption>Projects List</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
</table>

// Forms
<label htmlFor="email">Email</label>
<input id="email" aria-describedby="email-hint" aria-invalid="false" />
<p id="email-hint">We'll never share your email</p>
<p id="email-error" role="alert">Invalid email</p>
```

#### ARIA Live Regions
```tsx
// Toast Container - assertive for errors, polite for success
<div id="toast-container" aria-live="polite" aria-atomic="true" />

// Notifications Bell - assertive for new notifications
<Button aria-label="Notifications, 3 unread" aria-live="assertive">
  <Bell />
  <span className="sr-only">3 unread notifications</span>
</Button>

// Filter Results
<div aria-live="polite" aria-atomic="true">
  {results.length} results found
</div>

// Loading State
<div aria-busy="true" aria-live="polite">
  <Skeleton />
</div>
```

#### Button/Link Purpose
```tsx
// Buttons with only icons need aria-label
<Button aria-label="Edit task" variant="ghost" size="icon">
  <Edit className="h-4 w-4" />
</Button>

// Links with context
<Link href="/projects/123" aria-label="View Project Alpha details">
  Project Alpha
</Link>

// Dropdown triggers
<DropdownMenuTrigger aria-haspopup="menu" aria-expanded={open}>
  <Button>Actions</Button>
</DropdownMenuTrigger>
```

#### Table Accessibility
```tsx
<Table>
  <TableCaption className="sr-only">Project tasks</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>
        <Checkbox
          aria-label="Select all tasks"
          role="checkbox"
        />
      </TableHead>
      <TableHead scope="col">Title</TableHead>
      <TableHead scope="col">Status</TableHead>
      <TableHead scope="col">Priority</TableHead>
      <TableHead scope="col">Assignee</TableHead>
      <TableHead scope="col">
        <span className="sr-only">Actions</span>
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {tasks.map(task => (
      <TableRow key={task.id}>
        <TableCell>
          <Checkbox
            aria-label={`Select ${task.title}`}
            role="checkbox"
          />
        </TableCell>
        <TableCell>
          <Link href={`/tasks/${task.id}`}>{task.title}</Link>
        </TableCell>
        <TableCell><Badge>{task.status}</Badge></TableCell>
        <TableCell><Badge variant="secondary">{task.priority}</Badge></TableCell>
        <TableCell>{task.assignee?.name || 'Unassigned'}</TableCell>
        <TableCell>
          <DropdownMenu>...</DropdownMenu>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Motion & Animation
```css
/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  .skeleton {
    animation: none;
    opacity: 0.5;
  }
}
```

### Form Accessibility
```tsx
// Required fields
<Label htmlFor="title">
  Title <span className="text-destructive" aria-hidden="true">*</span>
  <span className="sr-only">(required)</span>
</Label>

// Error summary at top of form
{formErrors.length > 0 && (
  <div role="alert" className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
    <h3 className="font-medium text-destructive mb-2">Please fix the following errors:</h3>
    <ul className="list-disc list-inside text-sm text-destructive space-y-1">
      {formErrors.map((err, i) => (
        <li key={i}>
          <a href={`#${err.field}`}>{err.message}</a>
        </li>
      ))}
    </ul>
  </div>
)}

// Autocomplete attributes
<Input autoComplete="email" />
<Input autoComplete="current-password" />
<Input autoComplete="new-password" />
<Select autoComplete="country" />
```

---

## 6. Testing Checklist

### Responsive Testing
- [ ] 320px (mobile) - All content accessible, no horizontal scroll
- [ ] 375px (iPhone) - Touch targets 44x44px minimum
- [ ] 768px (tablet) - Sidebar as Sheet, tables as cards
- [ ] 1024px (laptop) - Sidebar expanded, full tables
- [ ] 1440px (desktop) - Optimal layout, max-width containers
- [ ] 1920px (large) - No excessive whitespace

### RTL Testing
- [ ] All pages render correctly in Arabic
- [ ] Icons flip correctly (chevrons, arrows)
- [ ] Sidebar on right side
- [ ] Breadcrumbs read right-to-left
- [ ] Dropdowns open correct direction
- [ ] Form labels align right
- [ ] Numbers remain LTR
- [ ] Pagination Previous/Next flip

### Dark Mode Testing
- [ ] No flash on load
- [ ] All colors have dark variants
- [ ] Contrast ratios maintained
- [ ] Images/icons visible (SVG currentColor)
- [ ] Shadows visible but not harsh
- [ ] Code blocks readable
- [ ] Toasts/dropdowns/modals themed

### Accessibility Testing
- [ ] Tab through entire page - logical order
- [ ] All interactive elements reachable
- [ ] Focus visible on all elements
- [ ] Screen reader (NVDA/VoiceOver) announces correctly
- [ ] Heading hierarchy correct
- [ ] Form labels associated
- [ ] Error messages announced
- [ ] ARIA live regions work
- [ ] Reduced motion respected
- [ ] Color not sole indicator (badges have text/icons)

### Keyboard Shortcuts Testing
- [ ] `Cmd+K` opens Command Palette
- [ ] `Escape` closes all modals/dropdowns
- [ ] Arrow keys navigate menus/tabs
- [ ] `Enter`/`Space` activates buttons
- [ ] `Tab`/`Shift+Tab` moves focus
- [ ] Skip link works

---

*This document consolidates all cross-cutting UI concerns. Reference DESIGN_SYSTEM.md for tokens and PAGE_SPECS.md for screen-specific responsive behavior.*