# Page Specifications - All 17 Screens

## Project Management Platform - Detailed UI/UX Specifications

---

## Screen 1: Login Page (`/auth/login`)

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ┌─────────────────────┐                  │
│                    │      Logo           │                  │
│                    │   ProjectHub        │                  │
│                    └─────────────────────┘                  │
│                           │                                 │
│                    ┌─────────────────────┐                  │
│                    │  Welcome back       │                  │
│                    │  Sign in to your    │                  │
│                    │  account            │                  │
│                    └─────────────────────┘                  │
│                           │                                 │
│                    ┌─────────────────────┐                  │
│                    │  Email              │  [____________]  │
│                    │  Password           │  [____________]  │
│                    │  [ ] Remember me    │  Forgot password?│
│                    └─────────────────────┘                  │
│                           │                                 │
│                    ┌─────────────────────┐                  │
│                    │  [ Sign In ]        │  Primary Button  │
│                    └─────────────────────┘                  │
│                           │                                 │
│                    ┌─────────────────────┐                  │
│                    │  Or continue with   │                  │
│                    │  [Google] [GitHub]  │  Outline Buttons │
│                    └─────────────────────┘                  │
│                           │                                 │
│                    Don't have an account? Sign up          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Specifications
- **Container**: Centered, max-width 400px, padding 48px
- **Card**: White background, shadow-lg, rounded-xl
- **Logo**: 48px icon + "ProjectHub" text-2xl font-semibold
- **Form**: Space-y-4, labels above inputs
- **Password Input**: Show/hide toggle (Eye/EyeOff icon)
- **Submit**: Full width, loading state with spinner
- **Social Buttons**: Outline variant, 16px icons
- **Links**: Text-sm, primary color, underline on hover
- **Background**: Subtle pattern or gradient (light: slate-50, dark: slate-950)

### States
- **Loading**: Button disabled, spinner, "Signing in..."
- **Error**: Toast + inline error on fields
- **Success**: Redirect to intended page or `/dashboard`

### RTL
- Form direction RTL, labels right-aligned
- Social buttons order: GitHub, Google
- Icons flip (ChevronLeft for "back")

---

## Screen 2: Admin Dashboard (`/admin`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar                                                           │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Admin Dashboard                                   [+ New User]    │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│         │ │ Total Users │ │ Total Projs │ │ Active Projs│ │ Storage Used│  │
│         │ │   1,234     │ │     56      │ │     42      │ │   23.4 GB   │  │
│         │ │   +12%      │ │   +3%       │ │   -2%       │ │   +5%       │  │
│         │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ Recent Users                                    Recent Projects   │
│         │ ┌─────────────────────────────┐         ┌─────────────────────┐ │
│         │ │ Name      | Role    | Status│         │ Name      | Members │ │
│         │ │ ──────────|────────|───────│         │ ──────────|─────────│ │
│         │ │ Ahmed A.  | Admin   | Active│         │ Project A │    12   │ │
│         │ │ Sara M.   | PM      | Active│         │ Project B │     8   │ │
│         │ │ John D.   | User    | Invited│        │ Project C │    15   │ │
│         │ │ ...                           │         │ ...                  │
│         │ └─────────────────────────────┘         └─────────────────────┘ │
│         └───────────────────────────────────────────────────────────────────┘
```

### Specifications
- **Stats Cards**: 4-column grid, responsive (2 on md, 1 on sm)
- **Stat Card**: Icon (24px) + value (text-3xl) + label + trend (text-sm, green/red)
- **Tables**: Striped, hover highlight, sortable columns
- **Actions**: View, Edit, Suspend, Delete (dropdown)
- **Empty States**: For users/projects with 0 results
- **Pagination**: Bottom of each table

### Permissions
- **Only ADMIN role** can access
- **Server-side check** in layout + middleware

### Responsive
- < lg: Stack tables vertically
- < md: Stat cards single column
- Actions in dropdown on mobile

---

## Screen 3: User Dashboard (`/dashboard`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar                                                           │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Dashboard                              [Create Task] [New Project]│
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ My Projects                                              🔍 │  │
│         │ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │  │
│         │ │ │ Project A    │ │ Project B    │ │ Project C    │        │  │
│         │ │ │ PROJ         │ │ PROB         │ │ PROC         │        │  │
│         │ │ │ ████████░░ 75%│ │ ████░░░░░░ 40%│ │ ██░░░░░░░░ 15%│        │  │
│         │ │ │ 5 tasks · 3  │ │ 8 tasks · 2  │ │ 12 tasks · 5 │        │  │
│         │ │ │ due soon     │ │ overdue      │ │ in progress  │        │  │
│         │ │ └──────────────┘ └──────────────┘ └──────────────┘        │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌──────────────────────┐ ┌────────────────────────────────────┐ │
│         │ │ My Tasks (5)         │ │ Activity Feed                      │ │
│         │ │ ┌──────────────────┐ │ │ ┌────────────────────────────────┐ │ │
│         │ │ │ 🔴 URGENT        │ │ │ │ Ahmed commented on "Design..." │ │
│         │ │ │ Design new UI    │ │ │ │ 2 minutes ago                  │ │
│         │ │ │ Project A · Today│ │ │ ├────────────────────────────────┤ │ │
│         │ │ ├──────────────────┤ │ │ │ Sara assigned you to "Fix..."  │ │
│         │ │ │ 🟠 HIGH          │ │ │ │ 15 minutes ago                 │ │
│         │ │ │ Fix login bug    │ │ │ ├────────────────────────────────┤ │ │
│         │ │ │ Project B · Tomorrow    │ │ Project A archived           │ │
│         │ │ ├──────────────────┤ │ │ │ 2 hours ago                    │ │
│         │ │ │ 🟡 MEDIUM        │ │ │ └────────────────────────────────┘ │ │
│         │ │ │ Write tests      │ │ │                                    │ │
│         │ │ │ Project A · Fri  │ │ │ [View All Activity]                │ │
│         │ │ └──────────────────┘ │ └────────────────────────────────────┘ │
│         │ └──────────────────────┘ └────────────────────────────────────┘ │
│         └───────────────────────────────────────────────────────────────────┘
```

### Specifications
- **Project Cards**: Grid (3/2/1 columns), progress bar, key metrics
- **My Tasks**: List view, grouped by priority (Urgent → High → Medium → Low)
- **Task Row**: Priority badge, title, project badge, due date, status icon
- **Activity Feed**: Timeline style, avatar + action + time, max 10 items
- **Quick Actions**: Create Task (dialog), New Project (dialog - if PM/Admin)

### Empty States
- No projects: "Create your first project" + CTA
- No tasks: "All caught up!" + illustration
- No activity: "No recent activity"

### Responsive
- < lg: Single column layout
- < md: Project cards stacked, tasks full width

---

## Screen 4: Projects List (`/projects`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar                                                           │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Projects                                    [+ New Project]       │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ [Search projects...]  [Status ▼] [Role ▼] [Sort ▼] [View]  │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ ██ Project Alpha                    ACTIVE    12 members   │  │
│         │ │     PROJ · Updated 2h ago        ████████░░ 75%   🔴 3     │  │
│         │ │     5/8 tasks done · 3 overdue                              │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ ██ Project Beta                     ON_HOLD   8 members    │  │
│         │ │     PROB · Updated 1d ago        ████░░░░░░ 40%   🟠 1     │  │
│         │ │     3/5 tasks done · 1 overdue                              │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ ██ Project Gamma                    ARCHIVED  5 members    │  │
│         │ │     PROG · Updated 1w ago        ██████████ 100%             │  │
│         │ │     Completed                                                 │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         │                    [Previous] 1 2 3 [Next]                       │
│         └───────────────────────────────────────────────────────────────────┘
```

### Card View (Mobile/Tablet)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Project Alpha                    ACTIVE    12 members                       │
│ PROJ                                                                         │
│ ████████░░ 75%                    🔴 3 urgent · 🟠 2 high                   │
│ 5/8 tasks done · 3 overdue                                                   │
│ Updated 2h ago · [View] [Edit] [Archive]                                    │
├─────────────────────────────────────────────────────────────────────────────┤
```

### Specifications
- **Toolbar**: Search (debounced 300ms), multi-select filters, sort, view toggle
- **List Row**: Avatar/color, name + key, status badge, progress bar, member count, priority counts, updated
- **Row Actions**: View (click), Edit, Archive, Delete (dropdown)
- **Status Badges**: Colored dot + label (Active=green, On Hold=yellow, Archived=gray)
- **Progress Bar**: Thin (4px), color by status (completed=green, in-progress=blue)
- **Sortable**: Name, Updated, Progress, Members
- **Pagination**: Server-side, 20 per page

### Permissions
- **All authenticated users** see projects they're members of
- **Admin/PM** see "New Project" button
- **Admin** sees all projects (with "All" filter)

### Responsive
- ≥ lg: Table view
- < lg: Card view with horizontal scroll for actions
- Filters in collapsible sidebar on mobile

---

## Screen 5: Project Details - Overview (`/projects/:id/overview`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar | Project Header (Tabs: Overview Tasks Board Members...) │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Project Alpha (PROJ)          ACTIVE              [Actions ▼]    │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ Description:                                                │  │
│         │ │ This project covers the redesign of our customer portal... │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
│         │ │ Progress     │ │ Tasks        │ │ Members      │ │ Files    │ │
│         │ │ ████████░░   │ │ Total: 24    │ │ 12 members   │ │ 47 files │ │
│         │ │ 75%          │ │ Done: 18     │ │ 3 pending    │ │ 2.3 GB   │ │
│         │ │              │ │ In Prog: 4   │ │              │ │          │ │
│         │ │              │ │ Review: 1    │ │              │ │          │ │
│         │ │              │ │ Blocked: 1   │ │              │ │          │ │
│         │ │              │ │ Todo: 0      │ │              │ │          │ │
│         │ └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘ │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌──────────────────────────────┐ ┌──────────────────────────────┐ │
│         │ │ Task Status Distribution     │ │ Priority Distribution        │ │
│         │ │ ┌──────────────────────────┐ │ │ ┌──────────────────────────┐ │ │
│         │ │ │ ████████████████████ Done │ │ │ │ ████████████ Low        │ │ │
│         │ │ │ ████ In Progress         │ │ │ │ ██████████████ Medium    │ │ │
│         │ │ │ ██ Review                │ │ │ │ ██████ High              │ │ │
│         │ │ │ █ Blocked                │ │ │ │ ████████ Urgent          │ │ │
│         │ │ └──────────────────────────┘ │ │ └──────────────────────────┘ │ │
│         │ └──────────────────────────────┘ └──────────────────────────────┘ │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────┐ ┌─────────────────────────────────────┐  │
│         │ │ Upcoming Deadlines  │ │ Recent Activity                     │ │
│         │ │ ┌─────────────────┐ │ │ ┌─────────────────────────────────┐ │ │
│         │ │ │ 🔴 Fix auth bug │ │ │ │ Ahmed completed "Design..."     │ │ │
│         │ │ │ Tomorrow · High │ │ │ │ 10 min ago                      │ │ │
│         │ │ ├─────────────────┤ │ │ ├─────────────────────────────────┤ │ │
│         │ │ │ 🟠 Write tests  │ │ │ │ Sara uploaded "mockups.fig"     │ │ │
│         │ │ │ Fri · Medium    │ │ │ │ 1 hour ago                      │ │ │
│         │ │ └─────────────────┘ │ │ └─────────────────────────────────┘ │ │
│         │ └─────────────────────┘ └─────────────────────────────────────┘ │
│         └───────────────────────────────────────────────────────────────────┘
```

### Specifications
- **Project Header**: Sticky, 72px, back link, avatar (gradient from key), name+key, status badge, actions dropdown
- **Description**: Markdown rendering, empty state if none
- **Stat Cards**: 4 cards, large numbers, icons, secondary metrics
- **Charts**: Simple donut/bar charts (SVG or recharts), responsive
- **Upcoming Deadlines**: Next 7 days, max 5, priority colored
- **Recent Activity**: Timeline, avatar, action, relative time, max 10

### Permissions
- **Project members only** (VIEWER+)
- **Owner/Admin** see all stats, can edit description

### Responsive
- < lg: Stats stack 2x2, charts stacked, activity full width

---

## Screen 6: Project Tasks List (`/projects/:id/tasks`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar | Project Header                                          │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Tasks                              [Filters] [View: List] [+ Task] │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ [Search tasks...]  [Status ▼] [Priority ▼] [Assignee ▼]    │  │
│         │ │ [Sort ▼] [Columns ▼] [Density: ◼◼◼] [Save View]            │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌───┬─────────────┬──────────┬─────────┬────────┬────────┬──────┐│
│         │ │ ☐ │ Title       │ Status   │ Priority│ Assignee│ Due    │ Act  ││
│         │ ├───┼─────────────┼──────────┼─────────┼────────┼────────┼──────┤│
│         │ │ ☐ │ Design UI   │ 🟦 IN_PRO│ 🟠 HIGH │ 👤 Ahmed│ Tomorrow│ ⋮  ││
│         │ │ ☐ │ Fix login   │ 🟢 REVIEW│ 🔴 URGENT│ 👤 Sara │ Today   │ ⋮  ││
│         │ │ ☐ │ Write tests │ ⚪ TODO  │ 🟡 MED  │ -       │ Fri     │ ⋮  ││
│         │ │ ☐ │ Update docs │ ⚪ TODO  │ ⚪ LOW   │ 👤 John │ Mon     │ ⋮  ││
│         │ │ ☐ │ Refactor API│ 🔴 BLOCKED│ 🟠 HIGH │ 👤 Ahmed│ -       │ ⋮  ││
│         │ └───┴─────────────┴──────────┴─────────┴────────┴────────┴──────┘│
│         │                    [Previous] 1 2 3 [Next]    24 tasks           │
│         └───────────────────────────────────────────────────────────────────┘
```

### Column Definitions
| Column | Width | Mobile | Sortable | Filterable |
|--------|-------|--------|----------|------------|
| Select | 48px | Hidden | No | No |
| Title | Flex | Visible | Yes | Search |
| Status | 140px | Badge | Yes | Multi-select |
| Priority | 120px | Badge | Yes | Multi-select |
| Assignee | 160px | Avatar | Yes | Multi-select |
| Due Date | 120px | Text | Yes | Range |
| Actions | 80px | Dropdown | No | No |

### Features
- **Multi-select**: Checkbox header → select all on page, shift+click range
- **Bulk Actions** (when selected): Change status, priority, assignee, delete
- **Inline Edit**: Click status/priority → dropdown, click assignee → search select
- **Drag Rows**: Reorder (updates position field)
- **Row Click**: Open task detail (modal or page)
- **Keyboard**: Arrow keys navigate, Enter opens, Space selects

### Column Visibility
- **Default**: Title, Status, Priority, Assignee, Due, Actions
- **Optional**: Progress, Reporter, Created, Updated, Tags
- **Saved per user** in localStorage

### Responsive
- ≥ lg: Full table
- md-lg: Horizontal scroll
- < md: Card view (see below)

### Card View (Mobile)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Design new dashboard                              🟦 IN_PROGRESS  🟠 HIGH  │
│ Project Alpha · Assigned to Ahmed · Due Tomorrow                          │
│ ████████░░ 60%                                                         [⋮] │
├─────────────────────────────────────────────────────────────────────────────┤
```

---

## Screen 7: Kanban Board (`/projects/:id/board`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar | Project Header                                          │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Board                              [Filters] [Swimlane ▼] [+ Task] │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐  │
│         │ │ TODO (3)     │ │ IN_PROGRESS  │ │ REVIEW (1)   │ │ DONE (8) │  │
│         │ │ ┌──────────┐ │ │ (4)          │ │ ┌──────────┐ │ │          │  │
│         │ │ │ 🔴 Fix   │ │ │ ┌──────────┐ │ │ │ 🟢 Final │ │ │ ┌──────┐ │  │
│         │ │ │   auth   │ │ │ │ 🟠 Design│ │ │ │   review │ │ │ │ 📝   │ │  │
│         │ │ │ 👤 Sara  │ │ │ │   UI     │ │ │ │ 👤 Ahmed │ │ │ │ Docs │ │  │
│         │ │ │ Tomorrow │ │ │ │ 👤 Ahmed │ │ │ │ Today    │ │ │ │ 👤 J │ │  │
│         │ │ ├──────────┤ │ │ │  60%     │ │ │ └──────────┘ │ │ └──────┘ │  │
│         │ │ │ 🟠 Write │ │ │ ├──────────┤ │ │              │ │          │  │
│         │ │ │   tests  │ │ │ │ 🟡 Refac │ │ │  + Add card  │ │  + Add    │  │
│         │ │ │ 👤 -     │ │ │ │   API    │ │ │              │ │          │  │
│         │ │ │ Fri      │ │ │ │ 👤 John  │ │ │              │ │          │  │
│         │ │ ├──────────┤ │ │ │   30%    │ │ │              │ │          │  │
│         │ │ │ 🟡 Update│ │ │ └──────────┘ │ │              │ │          │  │
│         │ │ │   docs   │ │ │              │ │              │ │          │  │
│         │ │ │ 👤 John  │ │ │  + Add card  │ │              │ │          │  │
│         │ │ │ Mon      │ │ │              │ │              │ │          │  │
│         │ │ └──────────┘ │ └──────────────┘ └──────────────┘ └──────────┘  │
│         │ └──────────────┘                                                │  │
│         └───────────────────────────────────────────────────────────────────┘
```

### Card Specifications
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Task Card (min-w-64, max-w-80)                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🔴 URGENT badge (top-left)                                                  │
│                                                                             │
│ Fix authentication bug                              [Drag Handle ⋮⋮]      │
│                                                                             │
│ 👤 Sara M.                    🏷️ bug  🏷️ auth                               │
│                                                                             │
│ ████████░░ 60%                    📅 Tomorrow                               │
│                                                                             │
│ 3 comments  ·  2 attachments                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Interactions
- **Drag & Drop**: Between columns (updates status), within column (updates position)
- **Click Card**: Open task detail modal
- **Column Header**: Count badge, "+ Add card" at bottom
- **Swimlanes**: None / By Assignee / By Priority (horizontal sections)
- **Horizontal Scroll**: When columns exceed viewport
- **Column Width**: Min 280px, max 360px, equal flex

### Empty Column
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TODO (0)                                                                    │
│                                                                             │
│       ┌─────────────────────┐                                               │
│       │     No tasks        │                                               │
│       │  Click + to add     │                                               │
│       └─────────────────────┘                                               │
│                                                                             │
│  + Add card                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Responsive
- ≥ xl: 4-5 columns visible
- lg-xl: 3-4 columns, horizontal scroll
- md-lg: 2 columns, horizontal scroll
- < md: **Stacked columns** (vertical tabs), one column at a time

---

## Screen 8: Project Members (`/projects/:id/members`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar | Project Header                                          │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Members                            [Invite Member]                │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ [Search members...]  [Role ▼] [Status ▼]                    │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌────┬─────────────┬──────────┬────────────┬──────────┬────────┐│
│         │ │Avatar│ Name        │ Role     │ Joined       │ Status   │Actions││
│         │ ├────┼─────────────┼──────────┼────────────┼──────────┼────────┤│
│         │ │ 👤  │ Ahmed Hassan│ 👑 OWNER │ Jan 15, 2024 │ Active   │ ⋮    ││
│         │ │ 👤  │ Sara Mohammed│ 🛡 ADMIN | Feb 3, 2024  │ Active   │ ⋮    ││
│         │ │ 👤  │ John Doe    │ 👤 MEMBER| Mar 1, 2024  │ Active   │ ⋮    ││
│         │ │ 👤  │ Jane Smith  │ 👁 VIEWER| Mar 10, 2024 │ Active   │ ⋮    ││
│         │ │ 👤  │ Bob Wilson  │ 👤 MEMBER| Mar 15, 2024 │ Invited  │ ⋮    ││
│         │ └────┴─────────────┴──────────┴────────────┴──────────┴────────┘│
│         └───────────────────────────────────────────────────────────────────┘
```

### Invite Member Dialog
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Invite Member                                          [✕]                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Email Address                                                        [____] │
│                                                                             │
│ Role                                        [MEMBER ▼]                      │
│   • Viewer - View only                                                     │
│   • Member - Create/edit tasks, upload files                              │
│   • Admin - Manage members, edit project, delete tasks                    │
│   • Owner - Full control (transfer only)                                  │
│                                                                             │
│ [ ] Send invitation email                                                  │
│                                                                             │
│                    [Cancel]              [Send Invitation]                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Member Actions Dropdown
| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| Change Role | ✓ | ✓ (not Owner) | ✗ | ✗ |
| Resend Invite | ✓ | ✓ | ✗ | ✗ |
| Remove | ✓ | ✓ (not Owner) | ✗ | ✗ |
| View Profile | ✓ | ✓ | ✓ | ✓ |

### Specifications
- **Avatar**: Initials fallback, status indicator (green dot = online)
- **Role Badge**: Crown=Owner, Shield=Admin, User=Member, Eye=Viewer
- **Status**: Active (green), Invited (yellow), Pending (gray)
- **Invited Members**: Show "Resend" and "Cancel" actions
- **Self Row**: Highlighted, no "Remove" for Owner

### Permissions
- **VIEWER+**: View members
- **MEMBER+**: Invite members (dialog)
- **ADMIN+**: Change roles, remove members
- **OWNER**: Transfer ownership (special flow)

---

## Screen 9: Project Files (`/projects/:id/files`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar | Project Header                                          │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Files                              [Upload] [New Folder] [View]  │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ [Search files...]  [Type ▼] [Sort ▼] [All/Shared/Private]  │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ Breadcrumb: All Files > Design > Mockups                    [↑] │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│         │ │  📁 Design  │  📁 Docs     │  📄 spec.pdf  │  📄 mockup.fig│  │
│         │ │  12 items   │  8 items     │  2.4 MB       │  5.1 MB      │  │
│         │ │  Updated 2h │  Updated 1d  │  by Ahmed     │  by Sara     │  │
│         │ │  ago        │  ago         │  2h ago       │  1d ago      │  │
│         │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │
│         │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │
│         │ │  📄 readme  │  🖼️  hero.png │  📊 data.xlsx │                  │
│         │ │  12 KB      │  845 KB      │  56 KB        │                  │
│         │ └─────────────┘ └─────────────┘ └─────────────┘                  │
│         └───────────────────────────────────────────────────────────────────┘
```

### Grid View (Default) vs List View
- **Grid**: Cards with large icons, name, size, uploader, time
- **List**: Table with columns: Name, Type, Size, Uploader, Modified, Actions

### File Card
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ File Card (200px × 240px)                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│        📄 (Large icon - type specific)                                      │
│                                                                             │
│        mockup.fig                                                           │
│                                                                             │
│        5.1 MB  ·  Figma                                                     │
│        by Sara  ·  1 day ago                                                │
│                                                                             │
│  [Preview] [Download] [⋮]                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Upload Dialog
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Upload Files                                         [✕]                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Drag & drop files here, or click to browse                                 │
│ Max 100MB per file · Allowed: All types                                    │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ 📄 design-spec.pdf          2.4 MB    ████████████ 100%    [✕]     │    │
│ │ 🖼️  hero.png                845 KB     ████████░░░░  78%    [⏸]     │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│ Folder: [Design ▼]  [Create Folder]                                        │
│                                                                             │
│                    [Cancel]              [Upload All]                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File Actions Dropdown
- Preview (images, PDF, text)
- Download
- Rename
- Move to folder
- Copy link (signed URL)
- Delete (Owner/Admin)

### Permissions
- **VIEWER+**: View, download shared files
- **MEMBER+**: Upload, create folders
- **UPLOADER/ADMIN**: Rename, move, delete
- **Private files**: Separate tab, only owner sees

---

## Screen 10: Project Notes (`/projects/:id/notes`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar | Project Header                                          │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Notes                              [+ New Note] [View: Grid/List] │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ [Search notes...]  [All/Pinned/Shared/Private] [Sort ▼]    │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ 📌 Project Requirements                    👤 Ahmed · 2d ago │  │
│         │ │ This document outlines the core requirements for the...     │  │
│         │ │ #requirements #v1                                            │  │
│         │ │ [🔓 Shared]                                      [⋮]        │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ 📝 Meeting Notes - Sprint Planning          👤 Sara · 5h ago │  │
│         │ │ Discussed timeline, blockers, and resource allocation...    │  │
│         │ │ #meeting #sprint                                               │  │
│         │ │ [🔓 Shared]                                      [⋮]        │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ 🔒 My Private Thoughts                        👤 You · 1h ago │  │
│         │ │ Personal notes about the API design decisions...            │  │
│         │ │ [🔒 Private]                                     [⋮]        │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         └───────────────────────────────────────────────────────────────────┘
```

### Note Card
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Note Card                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📌 Pin indicator (top-right if pinned)                                      │
│                                                                             │
│ Title                                                                        │
│                                                                             │
│ Content preview (3 lines, markdown rendered)                                │
│                                                                             │
│ 👤 Author · Relative time     #tag1 #tag2    [🔓 Shared / 🔒 Private] [⋮]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Create/Edit Note Dialog
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ New Note                                           [✕]                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Title                                              [____________________]  │
│                                                                             │
│ Content (Markdown)                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ # Heading                                                           │    │
│ │ **Bold** *Italic* `code`                                            │    │
│ │ - List item                                                         │    │
│ │ 1. Numbered                                                         │    │
│ │ > Quote                                                             │    │
│ │ [Link](url) ![Image](url)                                           │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
│ Toolbar: [B] [I] [Code] [H1] [H2] [List] [Quote] [Link] [Image] [Table]   │
│                                                                             │
│ Privacy:  [🔓 Shared with project]  [🔒 Private - Only me]                │
│           (Radio group, default: Shared for MEMBER+, Private for VIEWER)  │
│                                                                             │
│ [ ] Pin this note                                                          │
│                                                                             │
│                    [Cancel]              [Save]                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Note Detail (Click to open)
- Full markdown rendering
- Comments section at bottom
- Version history (sidebar)
- Share dialog (link, permissions)

### Permissions
- **VIEWER+**: View shared notes
- **MEMBER+**: Create shared notes
- **OWNER**: Create private notes (all roles can)
- **Author/Admin**: Edit/delete
- **Private notes**: Only author + global admins

---

## Screen 11: Task Details (`/tasks/:id` or Modal)

### Layout (Modal - Default)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                              [✕]                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🔴 URGENT  ·  IN_PROGRESS  ·  Project Alpha (PROJ)  ·  #42              │ │
│ │                                                                           │ │
│ │ Design new dashboard                                                    │ │
│ │                                                                           │ │
│ │ ──────────────────────────────────────────────────────────────────────  │ │
│ │ Description                                                             │ │
│ │ We need to redesign the main dashboard to improve usability...         │ │
│ │ [Edit]                                                                  │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────────┐  │ │
│ │ │ Assignee    │ │ Priority    │ │ Progress    │ │ Due Date          │  │ │
│ │ │ 👤 Ahmed    │ │ 🟠 HIGH     │ │ ██████░░ 60%│ │ Tomorrow          │  │ │
│ │ │ [Change]    │ │ [Change]    │ │ [Update]    │ │ [Change]          │  │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘ └───────────────────┘  │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────────────┐  │ │
│ │ │ Reporter    │ │ Created     │ │ Updated     │ │ Start Date        │  │ │
│ │ │ 👤 Sara     │ │ Jan 10      │ │ 2h ago      │ │ Jan 15            │  │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘ └───────────────────┘  │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ Attachments (3)                                    [+ Add]              │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                         │ │
│ │ │ 📄 spec.pdf │ │ 🖼️ mockup   │ │ 📊 data.xlsx│                         │ │
│ │ │ 2.4 MB      │ │ 845 KB      │ │ 56 KB       │                         │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘                         │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ Comments (5)                                            [👁 Show All]    │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐  │ │
│ │ │ 👤 Ahmed: @Sara please review the new mockups                      │  │ │
│ │ │ 10 min ago                                    [Edit] [Delete]       │  │ │
│ │ ├─────────────────────────────────────────────────────────────────────┤  │ │
│ │ │ 👤 Sara: Will do by EOD! 👍                                        │  │ │
│ │ │ 5 min ago                                       [Edit] [Delete]     │  │ │
│ │ └─────────────────────────────────────────────────────────────────────┘  │ │
│ │ ┌─────────────────────────────────────────────────────────────────────┐  │ │
│ │ │ [Write a comment...]                                    [Comment]   │  │ │
│ │ └─────────────────────────────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layout (Page - Alternative)
- Same content, full page with sidebar
- Better for complex tasks with many comments
- URL: `/projects/:projectId/tasks/:taskId`

### Fields
| Field | Editable By | Input Type |
|-------|-------------|------------|
| Title | Owner/Admin/Assignee | Text |
| Description | Owner/Admin/Assignee | Markdown |
| Status | Owner/Admin/Assignee | Select (kanban) |
| Priority | Owner/Admin | Select |
| Progress | Owner/Admin/Assignee | Slider (0-100) |
| Assignee | Owner/Admin | User Select |
| Due Date | Owner/Admin/Assignee | Date Picker |
| Start Date | Owner/Admin | Date Picker |
| Tags | Owner/Admin/Assignee | Multi-select + create |

### Comments Section
- **Real-time**: New comments appear via Supabase Realtime
- **Mentions**: `@username` autocomplete
- **Markdown**: Rendered (bold, italic, code, links)
- **System Comments**: Gray background, italic (status changes, assignments)
- **Actions**: Edit (author), Delete (author/admin)

### Keyboard Shortcuts (in modal)
- `E` - Edit task
- `C` - Focus comment input
- `S` - Cycle status
- `P` - Cycle priority
- `A` - Assign to me
- `Escape` - Close

---

## Screen 12: Task Comments (Part of Task Details)

### Specifications
- **Threaded**: Replies indented, max 2 levels
- **Real-time**: Supabase Realtime subscription
- **Mentions**: `@` triggers user search, sends notification
- **Markdown**: Full support (GFM)
- **Edit**: Inline, shows "edited" timestamp
- **Delete**: Soft delete, shows "This comment was deleted"
- **Reactions**: 👍 👎 ❤️ 🎉 👀 (optional)

### Comment Input
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────┐    │
│ │ @Sara please review the new mockups when you have a moment         │    │
│ │                                                                     │    │
│ │ [Bold] [Italic] [Code] [Strike] [Link] [Mention] [Emoji]           │    │
│ └─────────────────────────────────────────────────────────────────────┘    │
│                    [Cancel]              [Comment (Ctrl+Enter)]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 13: Notifications Center (`/notifications`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar                                                           │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Notifications                    [Mark All Read] [Filter ▼]       │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ 🔴 @Sara mentioned you in "Design new dashboard"           │  │
│         │ │ Task comment · Project Alpha · 2 min ago                   │  │
│         │ │ [Go to Task]                                                │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ 🟢 You were assigned to "Fix authentication bug"           │  │
│         │ │ Task assigned · Project Alpha · 15 min ago                 │  │
│         │ │ [Go to Task]                                                │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ 🟡 "Update documentation" status changed to IN_PROGRESS    │  │
│         │ │ Task updated · Project Beta · 1 hour ago                   │  │
│         │ │ [Go to Task]                                                │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ 🔵 New file "spec.pdf" uploaded to Project Alpha           │  │
│         │ │ File uploaded · 2 hours ago                                │  │
│         │ │ [View File]                                                 │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ ⚪ Project Gamma has been archived                         │  │
│         │ │ Project updated · 1 day ago                                │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         │                    [Load More]                                   │
│         └───────────────────────────────────────────────────────────────────┘
```

### Notification Item
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Notification Row                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ ● Unread indicator (blue dot)                                               │
│                                                                             │
│ Icon + Title                                                                │
│ Subtitle: Type · Project · Relative Time                                    │
│                                                                             │
│ [Primary Action Button]                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Icon Mapping
| Type | Icon | Color |
|------|------|-------|
| Mention | AtSign | Primary |
| Task Assigned | UserPlus | Accent |
| Task Updated | Bell | Primary |
| Status Changed | ArrowRightLeft | Warning |
| Comment | MessageSquare | Primary |
| Due Soon | Clock | Warning |
| Overdue | AlertTriangle | Destructive |
| File Upload | File | Primary |
| Note Created | FileText | Accent |
| Project Invite | UserPlus | Accent |
| System | AlertCircle | Muted |

### Features
- **Tabs**: All / Unread / Mentions / Tasks / Projects
- **Mark Read**: Click row, or "Mark all read" button
- **Group by Date**: Today, Yesterday, This Week, Older
- **Infinite Scroll**: Load 20 at a time
- **Real-time**: New notifications prepend via Realtime

### Empty State
```
┌─────────────────────────────────────────────────────────────────────────────┐
│         🔔                                                                    │
│                                                                             │
│       All caught up!                                                        │
│   You have no unread notifications.                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 14: Users Management (`/admin/users`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar                                                           │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Users Management                        [+ Invite User]           │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ [Search users...]  [Role ▼] [Status ▼] [Sort ▼]            │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌────┬─────────────┬──────────┬────────────┬──────────┬────────┐│
│         │ │Avatar│ Name        │ Email    │ Role       │ Status   │Actions││
│         │ ├────┼─────────────┼──────────┼────────────┼──────────┼────────┤│
│         │ │ 👤  │ Ahmed Hassan│ a@co.com │ 👑 ADMIN   │ Active   │ ⋮    ││
│         │ │ 👤  │ Sara Mohammed│ s@co.com │ 🛡 PM      │ Active   │ ⋮    ││
│         │ │ 👤  │ John Doe    │ j@co.com │ 👤 USER    │ Active   │ ⋮    ││
│         │ │ 👤  │ Jane Smith  │ j2@co.com│ 👤 USER    │ Invited  │ ⋮    ││
│         │ │ 👤  │ Bob Wilson  │ b@co.com │ 👤 USER    │ Suspended│ ⋮    ││
│         │ └────┴─────────────┴──────────┴────────────┴──────────┴────────┘│
│         │                    [Previous] 1 2 3 [Next]                       │
│         └───────────────────────────────────────────────────────────────────┘
```

### User Actions Dropdown
- View Profile
- Edit Role (Admin only, cannot create other Admins)
- Reset Password (sends email)
- Suspend/Activate
- Delete (with confirmation, transfers ownership)
- View Activity Log
- Impersonate (Admin only, audit logged)

### Invite User Dialog
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Invite User                                          [✕]                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Email                                          [____________________]      │
│                                                                             │
│ Role                                        [USER ▼]                        │
│   • User - Standard access                                                 │
│   • Project Manager - Can create/manage projects                          │
│   • Admin - Full system access (requires confirmation)                    │
│                                                                             │
│ Projects (optional)                    [Select projects...]               │
│   Pre-assign to projects                                                   │
│                                                                             │
│ [ ] Send invitation email                                                  │
│                                                                             │
│                    [Cancel]              [Send Invitation]                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Permissions
- **ADMIN only** - Server enforced
- **Cannot modify own role**
- **Cannot delete self**

---

## Screen 15: Settings - System (`/admin/settings`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar                                                           │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ System Settings                                                   │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────────────────────────────────────────────────┐  │
│         │ │ General                                                     │  │
│         │ │ ┌─────────────────────────────────────────────────────────┐ │  │
│         │ │ │ Organization Name                    [________________] │ │  │
│         │ │ │ Default Language                     [English ▼]        │ │  │
│         │ │ │ Default Theme                        [System ▼]         │ │  │
│         │ │ │ Timezone                             [UTC ▼]            │ │  │
│         │ │ │ Date Format                          [DD/MM/YYYY ▼]     │ │  │
│         │ │ └─────────────────────────────────────────────────────────┘ │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ Authentication                                              │  │
│         │ │ ┌─────────────────────────────────────────────────────────┐ │  │
│         │ │ │ [✓] Email/Password                                      │ │  │
│         │ │ │ [✓] Google OAuth                                        │ │  │
│         │ │ │ [✓] GitHub OAuth                                        │ │  │
│         │ │ │ [ ] MFA Required for Admins                            │ │  │
│         │ │ │ [ ] MFA Required for All Users                          │ │  │
│         │ │ │ Session Timeout                    [24 hours ▼]        │ │  │
│         │ │ │ Password Min Length                    [12]             │ │  │
│         │ │ └─────────────────────────────────────────────────────────┘ │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ Storage                                                     │  │
│         │ │ ┌─────────────────────────────────────────────────────────┐ │  │
│         │ │ │ Max File Size                        [100 MB]           │ │  │
│         │ │ │ Allowed Types                    [All / Custom...]      │ │  │
│         │ │ │ Retention: Deleted Files             [30 days]          │ │  │
│         │ │ │ Storage Quota per Project            [10 GB]            │ │  │
│         │ │ └─────────────────────────────────────────────────────────┘ │  │
│         │ ├─────────────────────────────────────────────────────────────┤  │
│         │ │ Notifications                                               │  │
│         │ │ ┌─────────────────────────────────────────────────────────┐ │  │
│         │ │ │ Email Provider                    [Resend ▼]            │ │  │
│         │ │ │ From Address                    [noreply@company.com]   │ │  │
│         │ │ │ [✓] Task Assignments                                     │ │  │
│         │ │ │ [✓] Mentions                                             │ │  │
│         │ │ │ [✓] Due Date Reminders                                   │ │  │
│         │ │ │ [✓] Daily Digest                                         │ │  │
│         │ │ └─────────────────────────────────────────────────────────┘ │  │
│         │ └─────────────────────────────────────────────────────────────┘  │
│         │                    [Save Changes]                                 │
│         └───────────────────────────────────────────────────────────────────┘
```

### Specifications
- **Accordion Sections**: Collapsible, one open at a time
- **Form Fields**: Consistent with design system
- **Validation**: Client + Server (Zod)
- **Save**: Single button at bottom, shows toast on success
- **Unsaved Changes Warning**: On navigation away

---

## Screen 16: Profile & Settings (`/profile`)

### Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar | Top Bar                                                           │
├─────────┼───────────────────────────────────────────────────────────────────┤
│         │ Profile Settings                    [Save Changes]               │
│         ├───────────────────────────────────────────────────────────────────┤
│         │ ┌─────────────────┐ ┌─────────────────────────────────────────┐  │
│         │ │                 │ │ Account                                 │  │
│         │ │     👤          │ │ ┌─────────────────────────────────────┐ │  │
│         │ │                 │ │ │ Full Name                    [_____] │ │  │
│         │ │  [Change]       │ │ │ Email                      [_____] │ │  │
│         │ │                 │ │ │ Bio                        [________] │ │  │
│         │ │  [Remove]       │ │ │ Timezone                 [UTC ▼]    │ │  │
│         │ │                 │ │ │ Language                 [English ▼] │ │  │
│         │ └─────────────────┘ │ └─────────────────────────────────────┘ │  │
│         │                     ├─────────────────────────────────────────┤  │
│         │                     │ Appearance                              │  │
│         │                     │ ┌─────────────────────────────────────┐ │  │
│         │                     │ │ Theme:  [☀ Light] [🌙 Dark] [💻 System]│ │  │
│         │                     │ │ Density: [Comfortable] [Compact]    │ │  │
│         │                     │ │ Sidebar: [Expanded] [Collapsed]     │ │  │
│         │                     │ └─────────────────────────────────────┘ │  │
│         │                     ├─────────────────────────────────────────┤  │
│         │                     │ Notifications                           │  │
│         │                     │ ┌─────────────────────────────────────┐ │  │
│         │                     │ │ [✓] Email: Task assigned to me      │ │  │
│         │                     │ │ [✓] Email: Mentioned in comment     │ │  │
│         │                     │ │ [✓] Email: Task due soon            │ │  │
│         │                     │ │ [✓] In-app: All notifications       │ │  │
│         │                     │ │ [ ] In-app: Only mentions           │ │  │
│         │                     │ │ [✓] Push: Urgent tasks              │ │  │
│         │                     │ │ Digest: [Daily ▼]                   │ │  │
│         │                     │ └─────────────────────────────────────┘ │  │
│         │                     ├─────────────────────────────────────────┤  │
│         │                     │ Security                                │  │
│         │                     │ ┌─────────────────────────────────────┐ │  │
│         │                     │ │ [Change Password]                   │ │  │
│         │                     │ │ [Setup 2FA]        [Authenticator]  │ │  │
│         │                     │ │ [View Sessions]  [Revoke All]       │ │  │
│         │                     │ └─────────────────────────────────────┘ │  │
│         │                     ├─────────────────────────────────────────┤  │
│         │                     │ Danger Zone                             │  │
│         │                     │ ┌─────────────────────────────────────┐ │  │
│         │                     │ │ [Delete Account]  (Destructive)     │ │  │
│         │                     │ └─────────────────────────────────────┘ │  │
│         │                     └─────────────────────────────────────────┘  │
│         └───────────────────────────────────────────────────────────────────┘
```

### Specifications
- **Two Column**: Avatar + Account on left, tabs on right
- **Avatar**: Upload dialog, crop preview, remove option
- **Tabs**: Account, Appearance, Notifications, Security, Danger Zone
- **Theme Selector**: Radio cards with icons
- **2FA Setup**: QR code + backup codes
- **Sessions Table**: Device, Location, Last Active, Current, Revoke

---

## Screen 17: Task Comments (Detailed View)

### Already covered in Screen 11 (Task Details)

---

## Cross-Cutting Patterns

### Modals & Dialogs
| Size | Max Width | Use Case |
|------|-----------|----------|
| `sm` | 320px | Confirmations, simple inputs |
| `md` | 480px | Forms (invite, create task) |
| `lg` | 640px | Complex forms, note editor |
| `xl` | 800px | Task detail, file preview |
| `full` | 95vw | Mobile sheets, full-screen |

### Dropdown Menus
- **Trigger**: Button with ChevronDown
- **Position**: Bottom-start, flip on collision
- **Items**: Icon + Label + Shortcut (optional)
- **Dividers**: Between groups
- **Dangerous**: Red text, separated

### Tooltips
- **Delay**: 200ms