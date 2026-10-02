# Navigation Architecture

## Project Management Platform - Navigation Specification

---

## 1. Information Architecture

### Site Map

```
├── /auth
│   ├── /login
│   ├── /register
│   ├── /forgot-password
│   ├── /reset-password
│   └── /callback
│
├── /dashboard                 # User Dashboard (default landing)
│
├── /admin                     # Admin only
│   ├── /users                 # Users Management
│   ├── /projects              # All Projects (admin view)
│   ├── /settings              # System Settings
│   └── /audit-logs            # Activity Logs
│
├── /projects                  # Projects List
│   └── /:projectId            # Project Details
│       ├── /overview          # Project Overview (default)
│       ├── /tasks             # Project Tasks (List View)
│       ├── /board             # Kanban Board
│       ├── /members           # Project Members
│       ├── /files             # Project Files
│       └── /notes             # Project Notes
│
├── /tasks                     # My Tasks (cross-project)
│   ├── /assigned              # Assigned to me
│   ├── /created               # Created by me
│   └── /:taskId               # Task Details
│       ├── /comments          # Task Comments
│       └── /activity          # Task Activity
│
├── /notifications             # Notifications Center
│
├── /profile                   # User Profile & Settings
│   ├── /account               # Account settings
│   ├── /appearance            # Theme, language
│   ├── /notifications         # Notification preferences
│   └── /security              # Password, MFA
│
└── /settings                  # User Settings (alias to /profile)
```

---

## 2. Navigation Components

### 2.1 Primary Navigation (Sidebar)

#### Desktop (≥ lg: 1024px)
- **Persistent sidebar** - 280px wide, collapsible to 72px (icon-only)
- **Fixed position** - Left side, full height
- **Sections**: Main, Projects, Admin (conditional), User
- **Active state** - Highlighted with primary background
- **Tooltips** - On collapsed state, show labels on hover

#### Mobile (< lg: 1024px)
- **Slide-over Sheet** - From left, 320px max width
- **Trigger** - Hamburger button in top bar
- **Overlay** - Backdrop click closes
- **Swipe gesture** - Swipe from left edge to open

#### Structure
```
Sidebar
├── Brand Area
│   ├── Logo (collapsed: icon only)
│   └── Product Name (collapsed: hidden)
│   └── Collapse Toggle Button
│
├── Main Navigation
│   ├── Dashboard          → /dashboard
│   ├── My Tasks           → /tasks/assigned
│   ├── Notifications      → /notifications (with badge)
│
├── Projects Section (Divider)
│   ├── "Projects" Label
│   ├── All Projects       → /projects
│   ├── Recent Projects    → Dynamic (max 5)
│   └── + New Project      → Dialog (Admin/PM only)
│
├── Admin Section (Divider) - ONLY for ADMIN role
│   ├── "Administration" Label
│   ├── Users              → /admin/users
│   ├── All Projects       → /admin/projects
│   ├── Audit Logs         → /admin/audit-logs
│   └── Settings           → /admin/settings
│
└── User Section (Bottom)
    ├── Divider
    ├── Profile            → /profile
    ├── Settings           → /profile/settings
    └── Sign Out           → Action
```

### 2.2 Top Bar (Header)

#### Always Visible (Desktop & Mobile)
```
Top Bar (64px height)
├── Left
│   ├── Mobile Menu Trigger (hamburger) - < lg only
│   ├── Page Title (from route)
│   └── Breadcrumb (desktop only, > md)
│
├── Center (Desktop) / Right (Mobile)
│   ├── Global Search (Cmd+K) - Command Palette
│
└── Right
    ├── Theme Toggle (Light/Dark/System)
    ├── Language Switcher (EN/AR)
    ├── Notifications Bell (with unread count badge)
    │   └── Dropdown: Recent 5 + "View All"
    ├── User Avatar Menu
    │   ├── User Name & Email
    │   ├── Role Badge
    │   ├── Divider
    │   ├── Profile          → /profile
    │   ├── Settings         → /profile/settings
    │   ├── Divider
    │   ├── Keyboard Shortcuts
    │   ├── Help & Docs
    │   ├── Divider
    │   └── Sign Out
    └── Mobile: User Avatar (opens Sheet with menu)
```

### 2.3 Project-Level Navigation (Inside Project)

#### Project Header (Sticky, 72px)
```
Project Header
├── Left
│   ├── Back to Projects   → /projects
│   ├── Project Avatar/Icon
│   ├── Project Name + Key
│   └── Project Status Badge
│
├── Center - Tab Navigation
│   ├── Overview           → /projects/:id/overview
│   ├── Tasks              → /projects/:id/tasks
│   ├── Board              → /projects/:id/board
│   ├── Members            → /projects/:id/members
│   ├── Files              → /projects/:id/files
│   └── Notes              → /projects/:id/notes
│
└── Right
    ├── Project Actions Dropdown
    │   ├── Edit Project       (Owner/Admin)
    │   ├── Invite Members     (Owner/Admin/Member)
    │   ├── Archive Project    (Owner/Admin)
    │   ├── Duplicate Project  (Owner/Admin)
    │   ├── Divider
    │   └── Delete Project     (Owner only - destructive)
    └── Mobile: Overflow menu
```

#### Mobile Project Tabs
- **Horizontal scroll** with snap points
- **Active indicator** - Animated underline
- **Swipe gestures** between tabs

---

## 3. Navigation Patterns

### 3.1 Breadcrumbs
```tsx
// Desktop only, above page title
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />  // "/" or ChevronRight
    <BreadcrumbItem>
      <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/projects/proj-123">Project Alpha</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem aria-current="page">
      <BreadcrumbPage>Tasks</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### 3.2 Command Palette (Cmd+K / Ctrl+K)
```tsx
<Command>
  <CommandInput placeholder="Search projects, tasks, people..." />
  <CommandList>
    <CommandGroup heading="Projects">
      <CommandItem>Project Alpha</CommandItem>
      <CommandItem>Project Beta</CommandItem>
    </CommandGroup>
    <CommandGroup heading="Tasks">
      <CommandItem>Design new dashboard</CommandItem>
      <CommandItem>Fix login bug</CommandItem>
    </CommandGroup>
    <CommandGroup heading="People">
      <CommandItem>Ahmed Hassan</CommandItem>
      <CommandItem>Sara Mohammed</CommandItem>
    </CommandGroup>
    <CommandGroup heading="Actions">
      <CommandItem shortcut="⌘N">New Task</CommandItem>
      <CommandItem shortcut="⌘P">New Project</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

### 3.3 Quick Switcher (Project Switcher)
- **Trigger**: Click project name in header or `Ctrl+Shift+P`
- **Shows**: Recent projects, starred projects, all projects
- **Search**: Filter by name/key
- **Actions**: Star/unstar, open, create new

---

## 4. Responsive Behavior

### Breakpoint Behavior

| Component | ≥ 1440px (3xl) | 1280-1439px (xl) | 1024-1279px (lg) | 768-1023px (md) | < 768px (sm) |
|-----------|----------------|------------------|------------------|-----------------|--------------|
| Sidebar | Expanded (280px) | Expanded (280px) | Expanded (280px) | **Sheet** | **Sheet** |
| Sidebar Collapsed | 72px | 72px | 72px | N/A | N/A |
| Top Bar Breadcrumbs | Visible | Visible | Visible | Hidden | Hidden |
| Project Tabs | All visible | All visible | Scroll if needed | Horizontal scroll | Horizontal scroll |
| Tables | Full columns | Full columns | Horizontal scroll | **Card view** | **Card view** |
| Kanban | 5+ columns | 4-5 columns | 3-4 columns | 2 columns | 1 column (stack) |
| Forms | 2-column grid | 2-column grid | 2-column grid | 1-column | 1-column |
| Modals | Centered (max-w-2xl) | Centered (max-w-2xl) | Centered (max-w-lg) | **Full-screen Sheet** | **Full-screen Sheet** |

### Sidebar Collapse States
```
Expanded (280px)          Collapsed (72px)          Mobile Sheet (320px)
┌─────────────────────┐   ┌─────┐                   ┌─────────────────────┐
│ ██  ProjectHub      │   │ ██  │                   │ ██  ProjectHub    ✕ │
├─────────────────────┤   ├─────┤                   ├─────────────────────┤
│ 🏠 Dashboard        │   │ 🏠  │  ← tooltip        │ 🏠 Dashboard        │
│ ✅ My Tasks         │   │ ✅  │                   │ ✅ My Tasks         │
│ 🔔 Notifications 3  │   │ 🔔  │                   │ 🔔 Notifications 3  │
├─────────────────────┤   ├─────┤                   ├─────────────────────┤
│ PROJECTS            │   │     │                   │ PROJECTS            │
│ 📁 Project Alpha    │   │ 📁  │                   │ 📁 Project Alpha    │
│ 📁 Project Beta     │   │ 📁  │                   │ 📁 Project Beta     │
│ + New Project       │   │ +   │                   │ + New Project       │
├─────────────────────┤   ├─────┤                   ├─────────────────────┤
│ ADMINISTRATION      │   │     │                   │ ADMINISTRATION      │
│ 👥 Users            │   │ 👥  │                   │ 👥 Users            │
│ 📁 All Projects     │   │ 📁  │                   │ 📁 All Projects     │
├─────────────────────┤   ├─────┤                   ├─────────────────────┤
│ 👤 Ahmed Hassan     │   │ 👤  │                   │ 👤 Ahmed Hassan     │
│ Admin               │   │     │                   │ Admin               │
│ 👤 Profile          │   │ 👤  │                   │ 👤 Profile          │
│ ⚙ Settings          │   │ ⚙   │                   │ ⚙ Settings          │
│ 🚪 Sign Out         │   │ 🚪  │                   │ 🚪 Sign Out         │
└─────────────────────┘   └─────┘                   └─────────────────────┘
```

---

## 5. Keyboard Navigation

### Global Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open Command Palette |
| `Cmd/Ctrl + Shift + K` | Open Project Switcher |
| `Cmd/Ctrl + /` | Focus Global Search |
| `Cmd/Ctrl + Shift + /` | Keyboard Shortcuts Help |
| `Escape` | Close modals, dropdowns, sheets |
| `Tab` / `Shift+Tab` | Navigate focusable elements |

### Sidebar Navigation
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + B` | Toggle sidebar collapse |
| `Alt + 1` | Dashboard |
| `Alt + 2` | My Tasks |
| `Alt + 3` | Notifications |
| `Alt + 4` | Projects List |
| `Alt + 0` | Profile/Settings |

### Project Navigation
| Shortcut | Action |
|----------|--------|
| `1` | Overview tab |
| `2` | Tasks tab |
| `3` | Board tab |
| `4` | Members tab |
| `5` | Files tab |
| `6` | Notes tab |
| `N` | New Task (in project) |
| `F` | Filter tasks |

### Task Details (when open)
| Shortcut | Action |
|----------|--------|
| `E` | Edit task |
| `C` | Focus comment input |
| `S` | Change status (cycle) |
| `P` | Change priority (cycle) |
| `A` | Assign to me |
| `Escape` | Close task detail |

---

## 6. URL Structure & Deep Linking

### Route Parameters
```
/projects/:projectId                    // Project overview
/projects/:projectId/overview           // Explicit overview
/projects/:projectId/tasks              // Tasks list
/projects/:projectId/tasks?status=TODO  // Filtered
/projects/:projectId/board              // Kanban
/projects/:projectId/board?status=IN_PROGRESS  // Filtered column
/projects/:projectId/members            // Members
/projects/:projectId/files              // Files
/projects/:projectId/files?folder=uuid  // Folder view
/projects/:projectId/notes              // Notes

/tasks/:taskId                          // Task details (modal or page)
/tasks/:taskId?project=projectId        // With project context
```

### Query Parameters (State Preservation)
```tsx
// Tasks List
interface TasksListParams {
  view?: 'list' | 'board';      // View mode
  status?: TaskStatus[];        // Multi-status filter
  priority?: TaskPriority[];    // Multi-priority filter
  assignee?: string[];          // Multi-assignee filter
  sort?: 'created' | 'updated' | 'due' | 'priority' | 'title';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  search?: string;
}

// Board
interface BoardParams {
  status?: TaskStatus;          // Highlight column
  swimlane?: 'none' | 'assignee' | 'priority';
}
```

### Browser History
- **All filter/sort changes** update URL (replaceState for pagination, pushState for navigation)
- **Back/Forward** works intuitively
- **Refresh** preserves state
- **Shareable URLs** - Copy link shares exact view

---

## 7. Navigation State Management

### Client-Side State
```typescript
// stores/navigation.ts
interface NavigationState {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;        // Mobile
  
  // Project context
  currentProjectId: string | null;
  currentProjectTab: ProjectTab;
  
  // UI state
  commandPaletteOpen: boolean;
  projectSwitcherOpen: boolean;
  userMenuOpen: boolean;
  notificationsOpen: boolean;
  
  // View preferences (persisted)
  tasksView: 'list' | 'board';
  boardSwimlane: 'none' | 'assignee' | 'priority';
  tableDensity: 'comfortable' | 'compact';
  sidebarWidth: number;
}

// Persisted to localStorage (except transient UI state)
```

### Server-Side (Next.js)
- **Middleware** handles auth redirects
- **Layout segments** persist sidebar/topbar across routes
- **Parallel routes** for modals (task details, confirmations)
- **Intercepting routes** for photo/full-screen views

---

## 8. Accessibility

### ARIA Structure
```tsx
// Sidebar
<nav aria-label="Main navigation" role="navigation">
  <section aria-label="Main">
    <ul role="list">...</ul>
  </section>
  <section aria-label="Projects">
    <ul role="list">...</ul>
  </section>
</nav>

// Project Tabs
<nav aria-label="Project sections" role="tablist">
  <button role="tab" aria-selected="true" aria-controls="overview-panel">
    Overview
  </button>
  <div role="tabpanel" id="overview-panel">...</div>
</nav>

// Breadcrumbs
<nav aria-label="Breadcrumb">
  <ol>...</ol>
</nav>
```

### Focus Management
- **Skip Link**: First focusable element → `<a href="#main-content">Skip to main content</a>`
- **Focus Trap**: In modals, sheets, dropdowns
- **Focus Restoration**: Return to trigger on close
- **Visible Focus**: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

### Screen Reader Announcements
- **Route changes**: Announce page title via `aria-live="polite"`
- **Notifications**: `aria-live="assertive"` for new notifications
- **Loading**: `aria-busy="true"` on sections
- **Filter results**: "X results found" announcement

---

## 9. Visual States

### Active States
| Element | Default | Hover | Active/Selected | Focus |
|---------|---------|-------|-----------------|-------|
| Sidebar Item | Transparent | `bg-muted` | `bg-primary text-primary-foreground` | Ring |
| Project Tab | `text-muted-foreground` | `text-foreground` | `text-primary border-b-2 border-primary` | Ring |
| Top Bar Action | `text-muted-foreground` | `text-foreground bg-muted` | `text-primary` | Ring |
| User Menu Item | `text-foreground` | `bg-muted` | - | Ring |

### Badges/Indicators
- **Unread notifications**: Red dot (8px) on bell, count in badge
- **Project updates**: Blue dot on project in sidebar
- **New comments**: Small indicator on task row
- **Mentions**: Highlight in notification list

---

## 10. Implementation Checklist

### Components to Build
- [ ] `Sidebar` - Collapsible, responsive, keyboard accessible
- [ ] `TopBar` - Search, theme, language, notifications, user menu
- [ ] `ProjectHeader` - Sticky, tabs, actions dropdown
- [ ] `Breadcrumb` - Desktop only, RTL-aware
- [ ] `CommandPalette` - Global search + actions
- [ ] `ProjectSwitcher` - Quick project navigation
- [ ] `UserMenu` - Avatar dropdown/sheet
- [ ] `NotificationDropdown` - Recent + link to center
- [ ] `LanguageSwitcher` - EN/AR with flag/icons
- [ ] `ThemeToggle` - Light/Dark/System with icons
- [ ] `SkipLink` - Hidden until focus

### Hooks
- [ ] `useSidebar` - Collapse/open state
- [ ] `useProjectContext` - Current project, tabs
- [ ] `useKeyboardShortcuts` - Global + contextual
- [ ] `useNavigation` - Router integration

### Persistence
- [ ] Sidebar collapse state → localStorage
- [ ] Tasks view mode → localStorage
- [ ] Board swimlane → localStorage
- [ ] Table density → localStorage
- [ ] Recent projects → localStorage (max 10)

---

*This navigation architecture supports all 17 screens with consistent patterns, full keyboard accessibility, RTL support, and responsive behavior.*