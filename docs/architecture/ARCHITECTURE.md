# Project Management Platform - Architecture Overview

## Executive Summary

This document provides a comprehensive architectural blueprint for an internal Project Management Platform built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Supabase**, **PostgreSQL**, **Supabase Auth**, and **Supabase Storage**.

The architecture follows **Feature-Based Architecture** with strict separation of concerns across **UI**, **Business Logic**, and **Data Access** layers, designed for production scalability and maintainability.

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | Next.js | 14+ (App Router) |
| **Language** | TypeScript | 5+ |
| **Styling** | Tailwind CSS | 3+ |
| **UI Components** | shadcn/ui | Latest |
| **Database** | PostgreSQL (Supabase) | 15+ |
| **Auth** | Supabase Auth | Latest |
| **Storage** | Supabase Storage | Latest |
| **Realtime** | Supabase Realtime | Latest |
| **i18n** | next-intl | 3+ |
| **Validation** | Zod | 3+ |
| **Testing** | Vitest, Playwright | Latest |

---

## Architecture Principles

1. **Feature-Based Organization** - Code organized by business domain, not technical layer
2. **Separation of Concerns** - UI, Business Logic, Data Access strictly separated
3. **Server-First** - Leverage Server Components, Server Actions, Route Handlers
4. **Type Safety** - End-to-end TypeScript with Zod schema inference
5. **Security by Default** - RLS policies, permission checks at every boundary
6. **Scalability** - Stateless services, connection pooling, efficient queries
7. **Developer Experience** - Consistent patterns, shared utilities, comprehensive testing

---

## Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # Internationalized routes
│   │   ├── (auth)/               # Auth pages (login, register)
│   │   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── admin/                # Admin-only routes
│   │   ├── api/                  # Route handlers (API)
│   │   ├── layout.tsx            # Root layout with providers
│   │   ├── loading.tsx           # Route loading UI
│   │   └── error.tsx             # Route error boundary
│   └── globals.css               # Global styles + CSS variables
│
├── features/                     # Feature-based modules (CORE)
│   ├── auth/                     # Authentication feature
│   │   ├── actions/              # Server actions
│   │   ├── components/           # Client components
│   │   ├── hooks/                # Custom hooks
│   │   ├── schemas/              # Zod schemas
│   │   └── services/             # Business logic
│   ├── projects/                 # Projects feature
│   ├── tasks/                    # Tasks feature
│   ├── members/                  # Members feature
│   ├── files/                    # Files feature
│   ├── notes/                    # Notes feature
│   ├── comments/                 # Comments feature
│   ├── activity/                 # Activity logging feature
│   └── notifications/            # Notifications feature
│
├── shared/                       # Shared kernel (cross-cutting)
│   ├── components/               # Shared UI components
│   │   ├── ui/                   # Base components (Button, Input, etc.)
│   │   ├── layout/               # Layout components
│   │   └── feedback/             # Toast, Modal, Skeleton
│   ├── lib/                      # Shared utilities
│   │   ├── supabase/             # Supabase clients (server/browser)
│   │   ├── i18n/                 # Internationalization config
│   │   ├── theme/                # Theme provider & utilities
│   │   ├── result.ts             # Result pattern for error handling
│   │   ├── utils.ts              # General utilities (cn, etc.)
│   │   └── validation.ts         # Validation helpers
│   ├── hooks/                    # Shared React hooks
│   ├── services/                 # Shared services (permissions, etc.)
│   ├── schemas/                  # Shared Zod schemas
│   ├── types/                    # Shared TypeScript types
│   ├── errors/                   # Custom error classes
│   └── constants/                # Application constants
│
├── middleware.ts                 # Next.js middleware (auth, i18n)
└── instrumentation.ts            # OpenTelemetry/Sentry (optional)
```

---

## Layer Responsibilities

### 1. UI Layer (Components)
- **Server Components** - Data fetching, static content, SEO
- **Client Components** - Interactivity, state, browser APIs
- **Shared UI** - Reusable, themeable, accessible components

### 2. Business Logic Layer
- **Server Actions** - Mutations, form handling, revalidation
- **Services** - Pure business logic, orchestration
- **Permissions** - Authorization checks
- **Validation** - Zod schema validation

### 3. Data Access Layer
- **Repositories/Queries** - Database operations
- **Supabase Client** - Typed database access
- **RLS Policies** - Row-level security enforcement

---

## Component Responsibilities Matrix

| Component Type | Use For | Data Fetching | Mutations | Interactivity |
|----------------|---------|---------------|-----------|---------------|
| **Server Component** | Pages, layouts, data display | ✅ Direct (async/await) | ❌ | ❌ |
| **Client Component** | Forms, modals, drag-drop | ❌ (via hooks) | ✅ (Server Actions) | ✅ |
| **Server Action** | Form submissions, mutations | ❌ | ✅ Direct DB | ❌ |
| **Route Handler** | Webhooks, file uploads, APIs | ✅ | ✅ | ❌ |
| **Middleware** | Auth, i18n, logging | ❌ | ❌ | ❌ |

---

## Database Architecture

### Core Tables
- **users** - User profiles (synced from auth.users)
- **projects** - Project entities
- **project_members** - Project membership with roles
- **tasks** - Task entities with status/priority/assignee
- **files** - File metadata with storage references
- **notes** - Notes with privacy controls
- **comments** - Polymorphic comments on entities
- **activity_logs** - Audit trail
- **notifications** - User notifications

### Security: Row Level Security (RLS)
All tables enforce RLS with policies for:
- **Project access** - Members only
- **Ownership** - Creators can manage
- **Role-based** - Admin/Owner/Member/Viewer permissions
- **Privacy** - Private files/notes only visible to owner + admins

---

## Authentication & Authorization

### Authentication (Supabase Auth)
- **Email/Password** - Primary method
- **Magic Links** - Passwordless option
- **OAuth** - Google, GitHub (extensible)
- **Session Management** - JWT in httpOnly cookies
- **Middleware Protection** - Route-level auth guards

### Authorization (Custom Permission System)
```
Permission = Resource + Action + Context

Resources: projects, tasks, members, files, notes, comments
Actions: create, read, update, delete, manage
Context: projectId, resourceOwnerId, userRole
```

**Roles**: Admin (global) → Owner (project) → Admin (project) → Member → Viewer

### Permission Checks
- **Server Actions** - Check before mutation
- **Services** - Check in business logic
- **RLS** - Enforce at database level
- **UI** - Conditional rendering

---

## Key Architectural Decisions

### 1. Feature-Based Architecture
Each feature is self-contained with its own:
- Schemas (validation)
- Services (business logic)
- Actions (mutations)
- Components (UI)
- Hooks (client state)
- Repositories (data access)

### 2. Result Pattern for Error Handling
```typescript
type Result<T, E> = { success: true; data: T } | { success: false; error: E }
```
- No exceptions for expected errors
- Type-safe error handling
- Consistent across actions/services

### 3. Server Actions as Primary Mutation Layer
- Progressive enhancement
- Automatic revalidation
- FormData native handling
- Streaming support

### 4. Supabase as Backend-as-a-Service
- **Auth** - Managed authentication
- **Database** - PostgreSQL with RLS
- **Storage** - File storage with signed URLs
- **Realtime** - Live updates for notifications/activity
- **Edge Functions** - Future serverless compute

### 5. Internationalization (i18n)
- **next-intl** with App Router
- **Locale routing** - `/en/`, `/ar/`
- **RTL support** - Logical CSS properties
- **Translation files** - JSON per locale
- **Pluralization** - ICU MessageFormat

### 6. Theming (Dark/Light/System)
- **CSS Variables** - HSL color system
- **Tailwind darkMode: 'class'**
- **Context + localStorage + Cookie** for SSR sync
- **No flash** - Inline script in `<head>`

### 7. File Handling
- **Two buckets**: `project-files` (shared), `private-files` (user-scoped)
- **Path structure**: `{projectId}/...` or `{userId}/{projectId}/...`
- **Signed URLs** - Temporary access tokens
- **Metadata in DB** - Not in storage

### 8. Activity Logging
- **Centralized service** - `activityService.log()`
- **Entity-specific helpers** - `taskActivity.created()`, etc.
- **Metadata-rich** - Previous/new values, context
- **RLS protected** - Project members only

### 9. Notifications
- **In-app** - Database + Realtime
- **Email** - Resend/SendGrid via templates
- **Preferences** - Per-user, per-type, per-channel
- **Mentions** - Regex parsing + user lookup

### 10. Loading & Empty States
- **Skeletons** - Per-component composites
- **Suspense** - Streaming with fallbacks
- **EmptyState** - Icon + title + CTA pattern
- **DataDisplay** - Unified loading/error/empty handler

---

## Cross-Cutting Concerns

| Concern | Implementation |
|---------|----------------|
| **Error Handling** | Custom error classes, Result pattern, centralized API handler |
| **Validation** | Zod schemas, safeParse, React Hook Form + zodResolver |
| **Logging** | Structured logger, request IDs, error tracking ready |
| **Testing** | Unit (Vitest), Integration (Vitest+MSW), E2E (Playwright) |
| **Accessibility** | ARIA, semantic HTML, focus management, screen readers |
| **Performance** | Server Components, streaming, code splitting, caching |

---

## Security Checklist

- [x] RLS on all tables
- [x] Permission checks in Server Actions
- [x] Input validation with Zod
- [x] XSS prevention (sanitization)
- [x] CSRF protection (SameSite cookies)
- [x] Secure headers (CSP, HSTS)
- [x] Rate limiting (middleware)
- [x] Audit logging (activity_logs)
- [x] Sensitive data redaction
- [x] Signed URLs for file access

---

## Scalability Considerations

| Area | Strategy |
|------|----------|
| **Database** | Connection pooling, indexes, read replicas |
| **Storage** | CDN, signed URLs, multipart uploads |
| **Realtime** | Presence, broadcast, postgres_changes |
| **Caching** | Next.js cache, revalidatePath, ISR |
| **Compute** | Edge middleware, serverless functions |
| **Monitoring** | Structured logs, metrics, tracing |

---

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start Supabase locally
supabase start

# Run dev server
npm run dev

# Run tests
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Code Quality
```bash
# Lint
npm run lint

# Type check
npm run type-check

# Format
npm run format
```

### CI/CD Pipeline
1. **Lint & Type Check** - Every commit
2. **Unit Tests** - Every commit
3. **Integration Tests** - PR/CI
4. **E2E Tests** - PR/CI/Nightly
5. **Build** - On merge to main
6. **Deploy** - Vercel/Container

---

## Document Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [Feature-Based Architecture](01-feature-based-architecture.md) | Folder structure, feature organization |
| 02 | [Layer Responsibilities](02-layer-responsibilities.md) | UI, Business Logic, Data Access separation |
| 03 | [Component Responsibilities](03-component-responsibilities.md) | Server/Client Components, Actions, Handlers |
| 04 | [Supabase & Storage](04-supabase-storage-architecture.md) | Database, Auth, Storage, Realtime |
| 05 | [Authentication](05-authentication-architecture.md) | Supabase Auth, sessions, middleware |
| 06 | [Authorization & Permissions](06-authorization-permission-system.md) | RBAC, permission service, RLS |
| 07 | [Supabase RLS Policies](07-supabase-rls-policies.md) | Row-level security policies |
| 08 | [File Handling](08-file-handling.md) | Public/private files, uploads, signed URLs |
| 09 | [i18n & RTL](09-i18n-rtl.md) | Arabic/English, RTL/LTR, next-intl |
| 10 | [Dark/Light Mode](10-dark-light-mode.md) | Theming, CSS variables, SSR sync |
| 11 | [Error Handling](11-error-handling.md) | Error classes, Result pattern, boundaries |
| 12 | [Validation](12-validation-strategy.md) | Zod schemas, server/client validation |
| 13 | [Loading & Empty States](13-loading-empty-states.md) | Skeletons, Suspense, EmptyState components |
| 14 | [Activity Logging](14-activity-logging.md) | Audit trail, entity helpers, realtime |
| 15 | [Notifications](15-notifications.md) | In-app, email, preferences, realtime |
| 16 | [Testing Strategy](16-testing-strategy.md) | Unit, integration, E2E, CI/CD |

---

## Future Extensibility

The architecture supports adding:
- **Webhooks** - Route handlers for external integrations
- **Background Jobs** - Supabase Edge Functions or BullMQ
- **Analytics** - Event tracking, dashboards
- **Mobile App** - Shared API, React Native
- **AI Features** - Embeddings, vector search (pgvector)
- **Multi-tenancy** - Organizations, workspaces
- **Advanced Search** - Full-text, filters, facets

---

## Governance

### Architecture Review Process
1. **Propose** - RFC document for significant changes
2. **Review** - Team discussion, trade-off analysis
3. **Decide** - Consensus or tech lead decision
4. **Document** - Update relevant architecture docs
5. **Implement** - Follow established patterns

### Coding Standards
- **TypeScript strict mode** - No `any`, explicit types
- **ESLint + Prettier** - Enforced in CI
- **Conventional Commits** - Structured commit messages
- **PR Reviews** - Required for all changes

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*
*Status: Complete Architecture Specification*