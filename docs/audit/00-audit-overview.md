# Project Management System - Architecture & Security Audit

## Executive Summary

**Project**: Internal Project Management Platform  
**Tech Stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL, Auth, Storage)  
**Audit Date**: 2026-10-02  
**Auditor**: Senior Software Architect

## Audit Scope

This audit covers:
1. Database Schema & Migrations
2. RLS Policies (Database & Storage)
3. Authentication & Session Management
4. Authorization (Server Actions + Permission Matrix)
5. Storage & File Security (Signed URLs, Private Files)
6. Core Features: Projects, Tasks, Comments, Notifications, Activity Logs
7. i18n (Arabic/English, RTL/LTR)
8. Dark/Light Mode & Responsive Design
9. Component Boundaries (Server/Client Components)
10. Query Performance (N+1, Indexes, Duplicate Queries)
11. Error Handling, Validation, Loading/Empty States
12. Permission Scenarios (Admin, PM, User, Cross-project Access)
13. Security Vulnerabilities (RLS Bypass, Auth Bypass, Data Leakage)

## Architecture Overview

### Folder Structure (Feature-Based)

```
src/
├── app/
│   ├── [locale]/                    # Locale-aware routes (next-intl)
│   │   ├── (dashboard)/             # Dashboard route group
│   │   │   ├── projects/[id]/       # Project-scoped pages
│   │   │   │   ├── overview/        # Project dashboard
│   │   │   │   ├── tasks/           # Task list & kanban
│   │   │   │   │   └── [taskId]/    # Task detail
│   │   │   │   ├── members/         # Member management
│   │   │   │   ├── files/           # File management
│   │   │   │   ├── activity/        # Activity log
│   │   │   │   └── settings/        # Project settings
│   │   │   ├── notifications/       # Notification center
│   │   │   ├── profile/             # User profile
│   │   │   └── settings/            # User settings
│   │   └── layout.tsx               # Root locale layout
│   ├── actions/                     # Server Actions (mutations)
│   │   ├── tasks.ts                 # Task CRUD, comments, attachments
│   │   ├── files.ts                 # File upload/download/preview
│   │   ├── projects.ts              # Project CRUD, members
│   │   ├── notifications.ts         # Notification actions
│   │   └── auth.ts                  # Auth actions
│   ├── api/                         # Route Handlers (webhooks, SSE)
│   │   ├── projects/[id]/activity   # Activity stream
│   │   └── tasks/[taskId]/comments  # Comment endpoints
│   ├── globals.css                  # Global styles
│   └── middleware.ts                # Auth + i18n middleware
├── components/
│   ├── ui/                          # shadcn/ui primitives
│   ├── projects/                    # Project feature components
│   ├── tasks/                       # Task feature components
│   ├── files/                       # File feature components
│   ├── activity/                    # Activity log components
│   ├── comments/                    # Comment components
│   ├── notifications/               # Notification components
│   ├── theme-provider.tsx           # Theme context provider
│   └── theme-switcher.tsx           # Theme toggle
├── lib/
│   ├── db/
│   │   ├── supabase-server.ts       # Server Supabase clients
│   │   └── queries/                 # Data Access Layer (DAL)
│   │       ├── projects.ts
│   │       ├── tasks.ts
│   │       ├── files.ts
│   │       ├── notifications.ts
│   │       ├── activity.ts
│   │       └── members.ts
│   ├── utils.ts                     # Shared utilities
│   └── validations/                 # Zod schemas
├── shared/
│   ├── lib/
│   │   ├── i18n/                    # Internationalization config
│   │   │   ├── config.ts            # Locale definitions
│   │   │   ├── routing.ts           # next-intl routing
│   │   │   └── formatters.ts        # Date/number formatters
│   │   └── supabase/
│   │       └── middleware.ts        # Auth session refresh
│   └── types/                       # Shared type definitions
├── types/
│   └── project.ts                   # Core domain types
└── messages/
    ├── en.json                      # English translations
    └── ar.json                      # Arabic translations
```

## Layer Responsibilities

| Layer | Responsibility | Examples |
|-------|----------------|----------|
| **Server Components** | Data fetching, initial render, SEO | `TaskKanbanBoardContainer`, Project pages |
| **Client Components** | Interactivity, state, browser APIs | `TaskKanbanBoard`, `TaskCard`, `FileUpload` |
| **Server Actions** | Mutations, form handling, revalidation | `createTaskAction`, `getProjectFileUploadUrl` |
| **Route Handlers** | Webhooks, SSE, public APIs | `api/notifications/stream` |
| **Data Access Layer** | SQL queries, RLS context, transformations | `getTasks`, `createTask`, `getNotifications` |
| **Supabase (DB/Auth/Storage)** | Data persistence, auth, file storage | RLS policies, signed URLs, realtime |

## Key Design Decisions

1. **Feature-Based Architecture** - Colocation by domain (projects, tasks, files)
2. **Server-First Rendering** - Default to Server Components, opt-in to Client
3. **Defense in Depth** - App-layer permissions + RLS + Storage policies
4. **Signed URLs Only** - No public file access, all downloads via Server Actions
5. **Server-Side i18n** - next-intl with middleware-based locale detection
6. **System Theme Detection** - Inline script in `<head>` for flash-free SSR

---

*Generated by Architecture Audit - 2026-10-02*