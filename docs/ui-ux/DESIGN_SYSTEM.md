# UI/UX Design System Specification

## Project Management Platform - Internal Company Tool

---

## 1. Design Philosophy

### Core Principles
- **Professional SaaS Aesthetic** - Clean, trustworthy, enterprise-ready
- **Clarity Over Cleverness** - Obvious hierarchy, predictable patterns
- **Content First** - UI serves the data, not the opposite
- **Accessible by Default** - WCAG 2.1 AA compliance
- **Consistent Mental Models** - Same patterns everywhere

### Visual Language
- **Minimal Color Palette** - 1 primary, 1 accent, semantic colors only
- **Generous Whitespace** - 8px base unit, breathing room
- **Subtle Depth** - Shadows for hierarchy, not decoration
- **Sharp Typography** - System fonts, clear scale
- **Purposeful Motion** - 150-200ms transitions, reduced motion support

---

## 2. Color System

### Light Mode
```css
:root {
  /* Base */
  --background: 0 0% 100%;           /* #FFFFFF */
  --foreground: 222 47% 11%;         /* #0F172A */
  --muted: 210 40% 96%;              /* #F1F5F9 */
  --muted-foreground: 215 16% 47%;   /* #64748B */
  
  /* Primary - Professional Blue */
  --primary: 221 83% 53%;            /* #3B82F6 */
  --primary-foreground: 0 0% 100%;   /* #FFFFFF */
  --primary-hover: 221 83% 48%;      /* #2563EB */
  --primary-light: 221 83% 95%;      /* #EFF6FF */
  
  /* Accent - Emerald for success/actions */
  --accent: 142 76% 36%;             /* #16A34A */
  --accent-foreground: 0 0% 100%;
  --accent-light: 142 76% 95%;       /* #ECFDF5 */
  
  /* Semantic */
  --destructive: 0 84% 60%;          /* #EF4444 */
  --destructive-foreground: 0 0% 100%;
  --destructive-light: 0 84% 95%;    /* #FEF2F2 */
  
  --warning: 38 92% 50%;             /* #F59E0B */
  --warning-foreground: 0 0% 100%;
  --warning-light: 38 92% 95%;       /* #FFFBEB */
  
  /* Borders & Inputs */
  --border: 214 32% 91%;             /* #E2E8F0 */
  --input: 214 32% 91%;              /* #E2E8F0 */
  --ring: 221 83% 53%;               /* #3B82F6 */
  
  /* Cards */
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  
  /* Popover */
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
  
  /* Sidebar */
  --sidebar: 0 0% 100%;
  --sidebar-foreground: 222 47% 11%;
  --sidebar-border: 214 32% 91%;
  --sidebar-ring: 221 83% 53%;
}
```

### Dark Mode
```css
.dark {
  --background: 222 47% 7%;          /* #0A0F1A */
  --foreground: 210 40% 98%;         /* #F8FAFC */
  --muted: 217 33% 17%;              /* #1E293B */
  --muted-foreground: 215 20% 65%;   /* #94A3B8 */
  
  --primary: 217 91% 60%;            /* #60A5FA */
  --primary-foreground: 222 47% 7%;
  --primary-hover: 217 91% 55%;
  --primary-light: 221 83% 15%;      /* #1E3A5F */
  
  --accent: 142 71% 45%;             /* #22C55E */
  --accent-foreground: 222 47% 7%;
  --accent-light: 142 76% 10%;
  
  --destructive: 0 72% 51%;          /* #F87171 */
  --destructive-foreground: 222 47% 7%;
  --destructive-light: 0 84% 10%;
  
  --warning: 45 93% 58%;             /* #FBBF24 */
  --warning-foreground: 222 47% 7%;
  --warning-light: 38 92% 10%;
  
  --border: 217 33% 20%;             /* #334155 */
  --input: 217 33% 20%;
  --ring: 217 91% 60%;
  
  --card: 222 47% 9%;
  --card-foreground: 210 40% 98%;
  
  --popover: 222 47% 9%;
  --popover-foreground: 210 40% 98%;
  
  --sidebar: 222 47% 8%;
  --sidebar-foreground: 210 40% 98%;
  --sidebar-border: 217 33% 20%;
  --sidebar-ring: 217 91% 60%;
}
```

### Status Colors (Task Status)
```css
/* Light */
--status-todo: 215 16% 47%;           /* #64748B */
--status-in-progress: 221 83% 53%;    /* #3B82F6 */
--status-review: 262 83% 58%;         /* #8B5CF6 */
--status-blocked: 0 84% 60%;          /* #EF4444 */
--status-completed: 142 76% 36%;      /* #16A34A */

/* Dark - slightly brighter */
--status-todo: 215 20% 65%;
--status-in-progress: 217 91% 60%;
--status-review: 263 70% 65%;
--status-blocked: 0 72% 51%;
--status-completed: 142 71% 45%;
```

### Priority Colors
```css
/* Light */
--priority-low: 215 16% 47%;          /* #64748B */
--priority-medium: 221 83% 53%;       /* #3B82F6 */
--priority-high: 26 90% 55%;          /* #F97316 */
--priority-urgent: 0 84% 60%;         /* #EF4444 */

/* Dark */
--priority-low: 215 20% 65%;
--priority-medium: 217 91% 60%;
--priority-high: 26 90% 60%;
--priority-urgent: 0 72% 51%;
```

---

## 3. Typography

### Font Stack
```css
/* Primary - System UI for performance */
--font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Arabic */
--font-arabic: 'IBM Plex Sans Arabic', 'Noto Sans Arabic', system-ui, sans-serif;

/* Mono */
--font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
```

### Type Scale (Mobile First)
| Token | Mobile | Desktop | Line Height | Weight | Use Case |
|-------|--------|---------|-------------|--------|----------|
| `--text-xs` | 11px | 12px | 1.5 | 400 | Labels, timestamps, badges |
| `--text-sm` | 13px | 14px | 1.5 | 400 | Body small, secondary text |
| `--text-base` | 15px | 16px | 1.6 | 400 | **Body text, inputs** |
| `--text-lg` | 17px | 18px | 1.6 | 400 | Emphasized body |
| `--text-xl` | 20px | 22px | 1.4 | 500 | Card titles, section headers |
| `--text-2xl` | 24px | 28px | 1.3 | 600 | Page titles |
| `--text-3xl` | 30px | 36px | 1.2 | 600 | Dashboard hero |
| `--text-4xl` | 36px | 48px | 1.1 | 700 | Marketing/landing |

### Arabic Adjustments
- Increase font-size by 1px for Arabic (better readability)
- Line-height: 1.7 for Arabic body text
- Use `--font-arabic` when `dir="rtl"`

---

## 4. Spacing System

### Base Unit: 4px (0.25rem)

| Token | Value | Use Case |
|-------|-------|----------|
| `--space-0` | 0 | Reset |
| `--space-1` | 4px | Tight gaps |
| `--space-2` | 8px | **Default gap, padding** |
| `--space-3` | 12px | Form gaps |
| `--space-4` | 16px | **Card padding, section gap** |
| `--space-5` | 20px | Generous gaps |
| `--space-6` | 24px | Section padding |
| `--space-8` | 32px | Large sections |
| `--space-10` | 40px | Page padding |
| `--space-12` | 48px | Hero sections |
| `--space-16` | 64px | Major breaks |

### Layout Max Widths
```css
--max-width-xs: 320px;   /* Mobile */
--max-width-sm: 640px;   /* Tablet */
--max-width-md: 768px;   /* Small desktop */
--max-width-lg: 1024px;  /* Standard */
--max-width-xl: 1280px;  /* Wide */
--max-width-2xl: 1440px; /* Ultra-wide */
--max-width-full: 100%;
```

---

## 5. Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `--radius-none` | 0 | Tables, full-width |
| `--radius-sm` | 4px | Badges, small chips |
| `--radius-md` | 6px | **Buttons, inputs, cards** |
| `--radius-lg` | 8px | Modals, dropdowns |
| `--radius-xl` | 12px | Large cards |
| `--radius-full` | 9999px | Avatars, pills |

---

## 6. Shadows

```css
/* Light mode */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Dark mode - more subtle */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.3);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.3);
```

---

## 7. Component Library (shadcn/ui Mapping)

### Core Components Used

| Component | Variants Used | Customizations |
|-----------|---------------|----------------|
| `Button` | default, destructive, outline, ghost, link | Size: sm, md, lg; Loading state |
| `Input` | default, error | Left/right icons, clear button |
| `Textarea` | default | Auto-resize |
| `Select` | default | Searchable, multi-select |
| `Checkbox` | default | Indeterminate state |
| `RadioGroup` | default | Horizontal/vertical |
| `Switch` | default | - |
| `Label` | default | Required asterisk |
| `Card` | default, header, content, footer | Hover variant |
| `Separator` | horizontal, vertical | - |
| `Avatar` | default, fallback | Status indicator dot |
| `Badge` | default, secondary, destructive, outline | Status, priority |
| `DropdownMenu` | default | Checkbox items, shortcuts |
| `ContextMenu` | default | Right-click actions |
| `Dialog` | default, alert, confirm | Sizes: sm, md, lg, xl, full |
| `Sheet` | default | Mobile drawers |
| `Popover` | default | Tooltips, quick actions |
| `Tooltip` | default | Delay: 200ms |
| `Toast` | default, destructive, success | Position: top-right |
| `Toaster` | - | Viewport-aware |
| `Table` | default, striped, hover | Sortable, selectable |
| `Tabs` | default, trigger | Animated indicator |
| `ScrollArea` | default | Custom scrollbar |
| `Skeleton` | default, circular | Match component shapes |
| `Progress` | default | Circular for tasks |
| `Alert` | default, destructive | Dismissible |
| `AlertDialog` | default | Confirm dangerous actions |
| `HoverCard` | default | User/project previews |
| `NavigationMenu` | default | Top nav (desktop) |
| `Sidebar` | default | Collapsible, mobile sheet |
| `Pagination` | default | - |
| `Breadcrumb` | default | Separator: "/" |
| `Form` | default | React Hook Form + Zod |
| `Calendar` | default | Date picker, range |
| `DatePicker` | default | Single, range |
| `Command` | default | Search, quick actions |
| `ResizablePanel` | default | Layout panels |

---

## 8. Icon System

### Lucide Icons - Semantic Mapping

| Concept | Icon | Size |
|---------|------|------|
| Navigation | `LayoutDashboard`, `FolderKanban`, `Users`, `Settings`, `Bell`, `Search` | 18px |
| Actions | `Plus`, `Edit`, `Trash2`, `Copy`, `Download`, `Upload`, `Share2` | 16px |
| Status | `Circle`, `CheckCircle2`, `Clock`, `AlertTriangle`, `XCircle` | 16px |
| Priority | `Flag`, `FlagTriangleRight` | 14px |
| Files | `File`, `FileText`, `Image`, `Video`, `Archive`, `Code` | 16px |
| Communication | `MessageSquare`, `Mail`, `AtSign`, `Bell` | 16px |
| Time | `Calendar`, `Clock`, `CalendarDays` | 16px |
| Sorting | `ArrowUpDown`, `ArrowUp`, `ArrowDown`, `GripVertical` | 16px |
| Filters | `Filter`, `Funnel`, `X` | 16px |
| Views | `LayoutList`, `LayoutGrid`, `Kanban` | 18px |
| User | `User`, `UserPlus`, `UserMinus`, `UserCheck`, `LogOut` | 18px |
| Project | `FolderOpen`, `FolderPlus`, `Archive`, `Key` | 18px |
| Task | `SquareCheck`, `SquarePen`, `SquareX` | 16px |

### Icon Sizing
```css
--icon-xs: 12px;  /* Inline with text-xs */
--icon-sm: 14px;  /* Badges, pills */
--icon-md: 16px;  /* **Default - buttons, tables** */
--icon-lg: 18px;  /* Nav, sidebar, headers */
--icon-xl: 20px;  /* Page headers */
--icon-2xl: 24px; /* Hero, empty states */
```

---

## 9. Breakpoints

```css
--bp-xs: 320px;   /* Small mobile */
--bp-sm: 640px;   /* Mobile landscape / small tablet */
--bp-md: 768px;   /* Tablet portrait */
--bp-lg: 1024px;  /* Tablet landscape / small desktop */
--bp-xl: 1280px;  /* Desktop */
--bp-2xl: 1440px; /* Large desktop */
--bp-3xl: 1920px; /* Ultra-wide */
```

### Responsive Strategy
- **Desktop First** design, mobile responsive
- Sidebar collapses to Sheet on `< lg`
- Tables become Cards on `< md`
- Kanban stacks columns on `< xl`
- Multi-column forms stack on `< md`

---

## 10. RTL/LTR Specifications

### Direction Handling
```css
/* Logical properties - USE THESE */
margin-inline-start    /* NOT margin-left */
margin-inline-end      /* NOT margin-right */
padding-inline-start   /* NOT padding-left */
padding-inline-end     /* NOT padding-right */
border-inline-start    /* NOT border-left */
border-inline-end      /* NOT border-right */
inset-inline-start     /* NOT left */
inset-inline-end       /* NOT right */
text-align: start      /* NOT left */
text-align: end        /* NOT right */
float: inline-start    /* NOT left */
float: inline-end      /* NOT right */

/* Flexbox/Grid - naturally RTL-aware */
flex-direction: row    /* Reverses in RTL */
justify-content: flex-start  /* Reverses in RTL */
```

### Icon Flipping
```css
/* Icons that should flip in RTL */
.flip-rtl {
  transform: scaleX(-1);
}

/* Apply via :dir() pseudo-class */
:dir(rtl) .flip-rtl {
  transform: scaleX(-1);
}

/* Icons needing flip: ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, 
   Navigation arrows, Pagination, Breadcrumbs, Carousel controls */
```

### Arabic Typography
```css
:dir(rtl) {
  font-family: var(--font-arabic);
  font-size: calc(var(--text-base) + 1px);  /* +1px for Arabic */
  line-height: 1.7;
}

/* Numbers remain LTR */
[dir="rtl"] .number {
  direction: ltr;
  unicode-bidi: isolate;
}
```

---

## 11. Dark/Light Mode

### Implementation
- CSS variables (above) with `[data-theme="dark"]` or `.dark` class
- ThemeProvider with `next-themes`
- No flash: inline script in `<head>` reads cookie/localStorage
- System preference default, user override persisted

### Component Adaptations
| Element | Light | Dark |
|---------|-------|------|
| Card background | White | `--card` (dark slate) |
| Borders | `--border` (slate-200) | `--border` (slate-700) |
| Inputs | White bg, slate border | Slate-800 bg, slate-700 border |
| Hover states | `--muted` (slate-100) | `--muted` (slate-800) |
| Shadows | Subtle gray | Subtle black (stronger) |
| Scrollbars | Light track | Dark track |
| Code blocks | Light bg | Dark bg |
| Tooltips | Dark text on light | Light text on dark |

---

## 12. State Patterns

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
```

#### Component Level (Suspense)
```tsx
<Suspense fallback={<TasksTableSkeleton />}>
  <TasksTable projectId={projectId} />
</Suspense>
```

#### Skeleton Patterns
| Component | Skeleton |
|-----------|----------|
| Card | Rounded rect (aspect-ratio 4:3) |
| Table Row | 4-5 lines of varying width |
| List Item | Avatar + 2 lines text |
| Kanban Card | Rect with 3 lines |
| Avatar | Circle |
| Button | Rounded rect, pulse animation |
| Stat Card | Large number line + label line |

#### Animation
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.skeleton { animation: pulse 1.5s ease-in-out infinite; }
```

### Empty States

#### Pattern
```tsx
function EmptyState({ 
  icon, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 text-muted-foreground/50" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      {action}
    </div>
  );
}
```

#### Empty State Variants
| Context | Icon | Title | Description | Action |
|---------|------|-------|-------------|--------|
| No projects | `FolderOpen` | "No projects yet" | "Create your first project to get started" | `Create Project` button |
| No tasks | `SquareCheck` | "No tasks" | "Add a task to start tracking work" | `Add Task` button |
| No members | `Users` | "No members" | "Invite team members to collaborate" | `Invite` button |
| No files | `File` | "No files" | "Upload files to share with the team" | `Upload` button |
| No notes | `FileText` | "No notes" | "Create notes to document decisions" | `New Note` button |
| No notifications | `Bell` | "All caught up" | "You have no unread notifications" | - |
| Search no results | `Search` | "No results" | "Try adjusting your search or filters" | `Clear filters` |
| No comments | `MessageSquare` | "No comments" | "Be the first to start a discussion" | - |

### Error States

#### Inline Errors (Forms)
```tsx
<div className="space-y-1.5">
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email" 
    aria-invalid={!!error}
    aria-describedby={error ? "email-error" : undefined}
    className={error ? "border-destructive focus:ring-destructive" : ""}
  />
  {error && (
    <p id="email-error" className="text-sm text-destructive flex items-center gap-1" role="alert">
      <AlertCircle className="h-3.5 w-3.5" />
      {error}
    </p>
  )}
</div>
```

#### Toast Notifications
```tsx
// Success
toast.success("Task created", { description: "Your task has been added to the project." });

// Error
toast.error("Failed to create task", { description: "Please try again or contact support." });

// Warning
toast.warning("Unsaved changes", { description: "Your changes will be lost if you leave." });

// Info
toast.info("New member joined", { description: "Ahmed joined the project." });
```

#### Page Errors (error.tsx)
```tsx
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">
          {error.message || "An unexpected error occurred. Please try again."}
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

### Confirmation Dialogs

#### Pattern
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" size="sm">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete project?</AlertDialogTitle>
      <AlertDialogDescription>
        This will permanently delete "Project Alpha" and all its tasks, files, and notes. 
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete project</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### Confirmation Types
| Action | Title | Description | Variant |
|--------|-------|-------------|---------|
| Delete project | "Delete project?" | "Permanently deletes project and all data" | Destructive |
| Delete task | "Delete task?" | "This cannot be undone" | Destructive |
| Remove member | "Remove member?" | "They will lose access to this project" | Destructive |
| Archive project | "Archive project?" | "Project becomes read-only" | Default |
| Leave project | "Leave project?" | "You will lose access" | Default |
| Discard changes | "Discard changes?" | "Your unsaved changes will be lost" | Default |
| Mark all read | "Mark all as read?" | "Clears all unread notifications" | Default |

---

## 13. Accessibility Requirements

### WCAG 2.1 AA Checklist

#### Color Contrast
- [ ] Text: 4.5:1 (normal), 3:1 (large)
- [ ] UI components: 3:1
- [ ] Focus indicators: 3:1

#### Keyboard Navigation
- [ ] All interactive elements reachable
- [ ] Visible focus rings (`focus-visible`)
- [ ] Logical tab order
- [ ] Skip to main content link
- [ ] Escape closes modals/dropdowns
- [ ] Arrow keys in menus/tabs

#### Screen Readers
- [ ] Semantic HTML (header, main, nav, aside, section, article)
- [ ] Heading hierarchy (h1 → h2 → h3)
- [ ] Labels on all inputs
- [ ] ARIA labels where needed
- [ ] Live regions for toasts/notifications
- [ ] Table headers with scope
- [ ] Button/Link purpose clear

#### Motion
- [ ] Respects `prefers-reduced-motion`
- [ ] Animations ≤ 200ms
- [ ] No auto-playing video/audio

#### Forms
- [ ] Required fields marked
- [ ] Error messages linked via `aria-describedby`
- [ ] Error summary at top
- [ ] Autocomplete attributes

---

## 14. Animation & Transitions

### Timing
```css
--duration-fast: 100ms;
--duration-normal: 150ms;
--duration-slow: 200ms;
--duration-slower: 300ms;

--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Transitions
```css
/* Default */
.transition-default {
  transition: all var(--duration-normal) var(--ease-out);
}

/* Colors only */
.transition-colors {
  transition: color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out),
              border-color var(--duration-fast) var(--ease-out),
              fill var(--duration-fast) var(--ease-out),
              stroke var(--duration-fast) var(--ease-out);
}

/* Transform */
.transition-transform {
  transition: transform var(--duration-normal) var(--ease-out);
}

/* Shadows */
.transition-shadow {
  transition: box-shadow var(--duration-normal) var(--ease-out);
}

/* Opacity */
.transition-opacity {
  transition: opacity var(--duration-fast) var(--ease-out);
}

/* Height/Width (for accordions, drawers) */
.transition-size {
  transition: height var(--duration-slow) var(--ease-in-out),
              width var(--duration-slow) var(--ease-in-out);
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 15. Z-Index Scale

```css
--z-dropdown: 100;      /* Dropdown menus */
--z-popover: 200;       /* Popovers, tooltips */
--z-tooltip: 300;       /* Tooltips */
--z-sheet: 400;         /* Mobile sheets */
--z-dialog: 500;        /* Modals, dialogs */
--z-toast: 600;         /* Toasts */
--z-toaster: 700;       /* Toaster container */
```

---

## 16. Implementation Notes

### CSS Variables in Tailwind
```js
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
          light: 'hsl(var(--primary-light))',
        },
        // ... rest of semantic colors
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        arabic: ['var(--font-arabic)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: '1.5' }],
        sm: ['var(--text-sm)', { lineHeight: '1.5' }],
        base: ['var(--text-base)', { lineHeight: '1.6' }],
        lg: ['var(--text-lg)', { lineHeight: '1.6' }],
        xl: ['var(--text-xl)', { lineHeight: '1.4' }],
        '2xl': ['var(--text-2xl)', { lineHeight: '1.3' }],
        '3xl': ['var(--text-3xl)', { lineHeight: '1.2' }],
        '4xl': ['var(--text-4xl)', { lineHeight: '1.1' }],
      },
      spacing: {
        // ... map --space-* tokens
      },
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        slower: 'var(--duration-slower)',
      },
      transitionTimingFunction: {
        in: 'var(--ease-in)',
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        spring: 'var(--ease-spring)',
      },
      zIndex: {
        dropdown: 'var(--z-dropdown)',
        popover: 'var(--z-popover)',
        tooltip: 'var(--z-tooltip)',
        sheet: 'var(--z-sheet)',
        dialog: 'var(--z-dialog)',
        toast: 'var(--z-toast)',
        toaster: 'var(--z-toaster)',
      },
    },
  },
};
```

### RTL Support in Tailwind
```js
// tailwind.config.ts - RTL variants
export default {
  // ...
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    function({ addVariant }) {
      addVariant('rtl', '[dir="rtl"] &');
      addVariant('ltr', '[dir="ltr"] &');
    },
  ],
};
```

Usage:
```tsx
<div className="ps-4 rtl:pe-4 ltr:ps-4">  /* Logical padding */
<ChevronRight className="rtl:-scale-x-100" />  /* Flip icon */
```

---

## 17. Component Composition Patterns

### Page Layout
```tsx
// Standard page structure
<PageLayout>
  <PageHeader>
    <Breadcrumb />
    <PageTitle />
    <PageActions />
  </PageHeader>
  <PageContent>
    {/* Main content */}
  </PageContent>
</PageLayout>
```

### Card Pattern
```tsx
<Card>
  <CardHeader>
    <CardTitle />
    <CardDescription />
    <CardActions />
  </CardHeader>
  <CardContent />
  <CardFooter />
</Card>
```

### Table Pattern
```tsx
<Card>
  <CardHeader>
    <TableToolbar />  {/* Search, filters, view toggle */}
  </CardHeader>
  <CardContent>
    <ScrollArea className="h-[calc(100vh-300px)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Checkbox /></TableHead>
            <TableHead>Column</TableHead>
            <TableHead className="hidden md:table-cell">Column</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id} className="hover:bg-muted/50">
              <TableCell><Checkbox /></TableCell>
              <TableCell><CellContent /></TableCell>
              <TableCell className="hidden md:table-cell">...</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>...</DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  </CardContent>
  <CardFooter>
    <Pagination />
  </CardFooter>
</Card>
```

### Form Pattern
```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormField
      control={form.control}
      name="field"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input placeholder="Placeholder" {...field} />
          </FormControl>
          <FormDescription>Helper text</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormFooter>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save
      </Button>
    </FormFooter>
  </form>
</Form>
```

---

*This design system provides the foundation for all 17 screen specifications. Each screen will reference these tokens, components, and patterns.*