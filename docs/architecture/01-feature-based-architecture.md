# Feature-Based Architecture & Folder Structure

## Philosophy

Feature-Based Architecture organizes code by **business domain** rather than technical layers. Each feature is a self-contained module containing its own UI, business logic, and data access code. This promotes:

- **High Cohesion** - Related code stays together
- **Low Coupling** - Features interact through well-defined interfaces
- **Scalability** - New features can be added without touching existing ones
- **Team Autonomy** - Different teams can own different features
- **Maintainability** - Changes to a feature are localized

## Root Folder Structure

```
src/
├── app/                          # Next.js App Router (Routes)
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   ├── register/
│   │   ├── reset-password/
│   │   └── layout.tsx
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── layout.tsx            # Dashboard shell (sidebar, header)
│   │   ├── projects/
│   │   │   ├── [projectId]/
│   │   │   │   ├── tasks/
│   │   │   │   │   ├── [taskId]/
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── members/
│   │   │   │   ├── files/
│   │   │   │   ├── notes/
│   │   │   │   ├── activity/
│   │   │   │   └── settings/
│   │   │   └── layout.tsx
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   ├── projects/
│   │   │   └── settings/
│   │   ├── profile/
│   │   └── notifications/
│   ├── api/                      # Route Handlers (API endpoints)
│   │   ├── webhooks/
│   │   ├── upload/
│   │   └── realtime/
│   ├── globals.css
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── not-found.tsx
│
├── features/                     # Feature-Based Modules (Core Business Logic)
│   ├── auth/
│   │   ├── components/           # Feature-specific UI components
│   │   ├── hooks/                # Feature-specific hooks
│   │   ├── actions/              # Server Actions
│   │   ├── services/             # Business Logic (Pure Functions)
│   │   ├── repositories/         # Data Access Layer
│   │   ├── types/                # Feature TypeScript types
│   │   ├── schemas/              # Zod validation schemas
│   │   ├── utils/                # Feature utilities
│   │   └── index.ts              # Public API exports
│   ├── projects/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── index.ts
│   ├── tasks/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── index.ts
│   ├── members/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── index.ts
│   ├── files/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── index.ts
│   ├── notes/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── index.ts
│   ├── comments/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── index.ts
│   ├── activity/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── index.ts
│   ├── notifications/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── actions/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── index.ts
│   └── admin/
│       ├── components/
│       ├── hooks/
│       ├── actions/
│       ├── services/
│       ├── repositories/
│       ├── types/
│       ├── schemas/
│       ├── utils/
│       └── index.ts
│
├── shared/                       # Shared Code (Cross-Feature)
│   ├── ui/                       # Shared UI Components (shadcn/ui wrappers)
│   │   ├── button/
│   │   ├── input/
│   │   ├── dialog/
│   │   ├── table/
│   │   ├── dropdown/
│   │   ├── avatar/
│   │   ├── badge/
│   │   ├── toast/
│   │   └── index.ts
│   ├── components/               # Shared Layout/Composite Components
│   │   ├── layout/
│   │   │   ├── sidebar/
│   │   │   ├── header/
│   │   │   ├── breadcrumb/
│   │   │   └── footer/
│   │   ├── forms/
│   │   ├── data-display/
│   │   ├── feedback/
│   │   └── navigation/
│   ├── hooks/                    # Shared React Hooks
│   │   ├── use-debounce.ts
│   │   ├── use-local-storage.ts
│   │   ├── use-media-query.ts
│   │   └── index.ts
│   ├── utils/                    # Shared Utilities
│   │   ├── date.ts
│   │   ├── string.ts
│   │   ├── validation.ts
│   │   ├── classnames.ts
│   │   └── index.ts
│   ├── constants/                # Shared Constants
│   │   ├── roles.ts
│   │   ├── permissions.ts
│   │   ├── statuses.ts
│   │   ├── priorities.ts
│   │   └── index.ts
│   ├── types/                    # Shared TypeScript Types
│   │   ├── user.ts
│   │   ├── api.ts
│   │   ├── database.ts
│   │   └── index.ts
│   ├── schemas/                  # Shared Zod Schemas
│   │   ├── common.ts
│   │   └── index.ts
│   ├── lib/                      # Shared Library Configurations
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser client
│   │   │   ├── server.ts         # Server client
│   │   │   ├── admin.ts          # Admin client (service role)
│   │   │   └── middleware.ts     # Middleware client
│   │   ├── i18n/
│   │   │   ├── config.ts
│   │   │   ├── routing.ts
│   │   │   └── index.ts
│   │   ├── theme/
│   │   │   ├── provider.tsx
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   └── logger/
│   │       ├── client.ts
│   │       ├── server.ts
│   │       └── index.ts
│   └── middleware/               # Shared Middleware
│       ├── auth.ts
│       ├── i18n.ts
│       └── index.ts
│
├── modules/                      # Technical Modules (Infrastructure)
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   ├── types.ts              # Generated DB types
│   │   └── index.ts
│   ├── auth/
│   │   ├── providers/
│   │   ├── guards/
│   │   ├── session/
│   │   └── index.ts
│   ├── storage/
│   │   ├── buckets.ts
│   │   ├── policies.ts
│   │   ├── helpers.ts
│   │   └── index.ts
│   ├── realtime/
│   │   ├── channels.ts
│   │   ├── subscriptions.ts
│   │   └── index.ts
│   └── email/
│       ├── templates/
│       ├── providers/
│       └── index.ts
│
├── config/                       # Application Configuration
│   ├── env.ts                    # Validated environment variables
│   ├── site.ts                   # Site metadata
│   ├── navigation.ts             # Navigation structure
│   └── features.ts               # Feature flags
│
├── styles/                       # Global Styles
│   ├── globals.css
│   ├── variables.css
│   └── tailwind.css
│
├── types/                        # Global TypeScript Declarations
│   ├── global.d.ts
│   ├── next-env.d.ts
│   └── env.d.ts
│
└── middleware.ts                 # Next.js Middleware Entry Point
```

## Feature Module Structure (Standardized)

Each feature in `src/features/{feature}/` follows this structure:

```
features/{feature}/
├── components/           # React Components (UI Layer)
│   ├── {Feature}List.tsx
│   ├── {Feature}Card.tsx
│   ├── {Feature}Form.tsx
│   ├── {Feature}Detail.tsx
│   ├── {Feature}Skeleton.tsx
│   ├── {Feature}Empty.tsx
│   └── index.ts
├── hooks/                # React Hooks (UI Logic)
│   ├── use{Feature}.ts
│   ├── use{Feature}List.ts
│   ├── use{Feature}Mutations.ts
│   └── index.ts
├── actions/              # Server Actions (Server-Side Mutations)
│   ├── create{Feature}.ts
│   ├── update{Feature}.ts
│   ├── delete{Feature}.ts
│   ├── bulk{Feature}.ts
│   └── index.ts
├── services/             # Business Logic (Pure Functions)
│   ├── {feature}Service.ts
│   ├── {feature}Validator.ts
│   ├── {feature}Calculator.ts
│   └── index.ts
├── repositories/         # Data Access Layer
│   ├── {feature}Repository.ts
│   ├── {feature}Queries.ts
│   ├── {feature}Mutations.ts
│   └── index.ts
├── types/                # Feature Types
│   ├── {feature}.ts
│   ├── dto.ts
│   └── index.ts
├── schemas/              # Zod Validation Schemas
│   ├── create{Feature}.ts
│   ├── update{Feature}.ts
│   ├── filter{Feature}.ts
│   └── index.ts
├── utils/                # Feature Utilities
│   ├── helpers.ts
│   ├── formatters.ts
│   └── index.ts
├── constants/            # Feature Constants (if needed)
│   └── index.ts
└── index.ts              # Public API (Barrel Export)
```

## Import Rules (Enforced by ESLint)

| From | Can Import From |
|------|-----------------|
| `app/` | `features/`, `shared/`, `modules/`, `config/` |
| `features/{feature}/` | `features/{feature}/`, `shared/`, `modules/`, `config/` |
| `features/{feature}/` | **NOT** `features/{otherFeature}/` (use shared instead) |
| `shared/` | `modules/`, `config/` |
| `modules/` | `config/` |
| `config/` | (none) |

## Feature Communication

Features communicate **only** through:
1. **Shared Types/Schemas** - Defined in `shared/types/`, `shared/schemas/`
2. **Shared UI Components** - Defined in `shared/ui/`, `shared/components/`
3. **Server Actions** - Called directly from Server Components
4. **Route Handlers** - For webhooks, file uploads, real-time
5. **Event Bus** (optional) - For decoupled cross-feature events

## Adding a New Feature

1. Create folder under `src/features/{featureName}/`
2. Follow the standardized structure
3. Export public API from `index.ts`
4. Add types to `shared/types/` if cross-feature
5. Add UI components to `shared/ui/` if reusable
6. Update navigation config if needed
7. Write tests in `__tests__/` alongside each file

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*