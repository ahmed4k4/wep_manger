# Layer Responsibilities

## Three-Layer Architecture

The system follows a strict **Three-Layer Architecture** within each feature:

```
┌─────────────────────────────────────────────────────────────┐
│                     UI LAYER (Components)                    │
│  Server Components • Client Components • Hooks • Forms      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER (Services)            │
│  Pure Functions • Domain Logic • Validation • Calculations  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA ACCESS LAYER (Repositories)           │
│  Database Queries • Mutations • Supabase Client • Caching   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. UI Layer (`features/{feature}/components/`, `hooks/`)

### Responsibilities
- **Presentation Only** - Render data, handle user interactions
- **No Business Logic** - No calculations, no data transformations, no authorization decisions
- **No Direct Data Access** - Never call Supabase client directly
- **State Management** - Local UI state (modals, dropdowns, form inputs)
- **Data Fetching** - Via Server Components (async) or Client Hooks (SWR/TanStack Query)

### Server Components (Default)
```typescript
// app/(dashboard)/projects/[projectId]/page.tsx
import { getProjectWithTasks } from '@/features/projects/repositories/projectQueries';
import { ProjectView } from '@/features/projects/components/ProjectView';

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectWithTasks(projectId); // Direct DB call
  return <ProjectView project={project} />;
}
```

**When to Use:**
- Initial page loads
- SEO-critical pages
- Data that doesn't need real-time updates
- Reducing client bundle size

### Client Components (When Needed)
```typescript
// features/tasks/components/TaskBoard.tsx
'use client';
import { useTaskMutations } from '@/features/tasks/hooks/useTaskMutations';
import { TaskColumn } from './TaskColumn';

export function TaskBoard({ projectId }: { projectId: string }) {
  const { moveTask, updateTask } = useTaskMutations(projectId);
  // Interactive drag-and-drop, optimistic updates
  return <TaskColumn onMove={moveTask} onUpdate={updateTask} />;
}
```

**When to Use:**
- Interactivity (drag-drop, modals, dropdowns)
- Real-time subscriptions
- Optimistic UI updates
- Browser-only APIs (localStorage, WebGL)

### Hooks (`features/{feature}/hooks/`)
- Encapsulate **UI logic** (not business logic)
- Manage client-side state
- Coordinate between components and Server Actions
- Example: `useTaskFilters`, `useTaskBoardDragDrop`, `useFileUpload`

---

## 2. Business Logic Layer (`features/{feature}/services/`)

### Responsibilities
- **Pure Functions** - No side effects, same input = same output
- **Domain Logic** - Business rules, calculations, transformations
- **Validation** - Business rule validation (not schema validation)
- **Orchestration** - Coordinate multiple repository calls
- **Authorization Decisions** - "Can this user do X?" (delegates to permission system)
- **Data Transformation** - DTO ↔ Domain Model mapping

### Structure
```typescript
// features/tasks/services/taskService.ts
import { Task, CreateTaskDTO, TaskWithRelations } from '../types';
import { taskRepository } from '../repositories/taskRepository';
import { permissionService } from '@/shared/services/permissionService';
import { ActivityService } from '@/features/activity/services/activityService';

export const taskService = {
  /**
   * Creates a task with business rule validation
   */
  async createTask(userId: string, dto: CreateTaskDTO): Promise<Task> {
    // 1. Business Rule Validation
    await this.validateCreateTask(userId, dto);
    
    // 2. Authorization
    const canCreate = await permissionService.can(userId, 'tasks:create', { projectId: dto.projectId });
    if (!canCreate) throw new ForbiddenError('Cannot create tasks in this project');
    
    // 3. Data Transformation
    const taskData = this.mapToTaskEntity(userId, dto);
    
    // 4. Persist via Repository
    const task = await taskRepository.create(taskData);
    
    // 5. Side Effects (Activity Log, Notifications)
    await ActivityService.log({
      userId,
      action: 'TASK_CREATED',
      entityType: 'task',
      entityId: task.id,
      projectId: dto.projectId,
      metadata: { title: task.title }
    });
    
    await NotificationService.notifyAssignees(task);
    
    return task;
  },

  /**
   * Business rule: Validate task creation
   */
  async validateCreateTask(userId: string, dto: CreateTaskDTO): Promise<void> {
    // Due date cannot be in the past
    if (dto.dueDate && new Date(dto.dueDate) < new Date()) {
      throw new ValidationError('Due date cannot be in the past');
    }
    
    // Assignee must be project member
    if (dto.assigneeId) {
      const isMember = await memberRepository.isProjectMember(dto.projectId, dto.assigneeId);
      if (!isMember) throw new ValidationError('Assignee must be a project member');
    }
    
    // Project must be active
    const project = await projectRepository.findById(dto.projectId);
    if (project?.status !== 'ACTIVE') throw new ValidationError('Project is not active');
  },

  /**
   * Maps DTO to database entity
   */
  mapToTaskEntity(userId: string, dto: CreateTaskDTO) {
    return {
      ...dto,
      createdById: userId,
      status: 'TODO' as const,
      position: 0, // Will be calculated
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  /**
   * Calculates task position for ordering
   */
  async calculatePosition(projectId: string, columnId: string): Promise<number> {
    const maxPosition = await taskRepository.getMaxPosition(projectId, columnId);
    return maxPosition + 1000; // Gap for reordering
  },
};
```

### Rules
- **No React imports** - Pure TypeScript
- **No Supabase client** - Use repositories
- **Throw domain errors** - `ValidationError`, `ForbiddenError`, `NotFoundError`
- **Return domain models** - Not database rows
- **Testable in isolation** - No mocks needed for pure functions

---

## 3. Data Access Layer (`features/{feature}/repositories/`)

### Responsibilities
- **Database Queries** - Read operations
- **Database Mutations** - Write operations
- **Supabase Client Usage** - Only place that uses Supabase directly
- **Query Optimization** - Select columns, joins, indexes
- **Caching Strategy** - React Cache, unstable_cache, or manual caching
- **Error Translation** - Convert DB errors to domain errors

### Structure
```typescript
// features/tasks/repositories/taskRepository.ts
import { createServerClient } from '@/shared/lib/supabase/server';
import { Task, TaskInsert, TaskUpdate, TaskFilters } from '../types';
import { DatabaseError } from '@/shared/errors';

const TABLE = 'tasks';

export const taskRepository = {
  /**
   * Find task by ID with relations
   */
  async findById(id: string): Promise<TaskWithRelations | null> {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        *,
        assignee:users!tasks_assignee_id_fkey(id, full_name, avatar_url, email),
        creator:users!tasks_created_by_id_fkey(id, full_name, avatar_url),
        project:projects(id, name, key),
        comments(count),
        attachments(count)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new DatabaseError('Failed to fetch task', error);
    }
    
    return this.mapRowToTask(data);
  },

  /**
   * List tasks with filters, pagination, sorting
   */
  async findMany(filters: TaskFilters): Promise<PaginatedResult<Task>> {
    const supabase = createServerClient();
    let query = supabase.from(TABLE).select('*', { count: 'exact' });
    
    // Apply filters
    if (filters.projectId) query = query.eq('project_id', filters.projectId);
    if (filters.assigneeId) query = query.eq('assignee_id', filters.assigneeId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.search) query = query.ilike('title', `%${filters.search}%`);
    
    // Apply sorting
    const sortBy = filters.sortBy || 'position';
    const sortOrder = filters.sortOrder || 'asc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) throw new DatabaseError('Failed to fetch tasks', error);
    
    return {
      data: data.map(this.mapRowToTask),
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
    };
  },

  /**
   * Create task
   */
  async create(input: TaskInsert): Promise<Task> {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from(TABLE)
      .insert(input)
      .select()
      .single();
    
    if (error) throw new DatabaseError('Failed to create task', error);
    
    return this.mapRowToTask(data);
  },

  /**
   * Update task
   */
  async update(id: string, input: TaskUpdate): Promise<Task> {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new DatabaseError('Failed to update task', error);
    
    return this.mapRowToTask(data);
  },

  /**
   * Bulk update positions (for drag-drop)
   */
  async updatePositions(updates: { id: string; position: number; status?: string }[]): Promise<void> {
    const supabase = createServerClient();
    
    // Use transaction for atomicity
    const { error } = await supabase.rpc('bulk_update_task_positions', {
      updates: updates.map(u => ({ id: u.id, position: u.position, status: u.status }))
    });
    
    if (error) throw new DatabaseError('Failed to update positions', error);
  },

  /**
   * Delete task
   */
  async delete(id: string): Promise<void> {
    const supabase = createServerClient();
    
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    
    if (error) throw new DatabaseError('Failed to delete task', error);
  },

  /**
   * Get max position for column
   */
  async getMaxPosition(projectId: string, status: string): Promise<number> {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from(TABLE)
      .select('position')
      .eq('project_id', projectId)
      .eq('status', status)
      .order('position', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw new DatabaseError('Failed to get max position', error);
    
    return data?.position || 0;
  },

  /**
   * Map database row to domain model
   */
  mapRowToTask(row: any): Task {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      position: row.position,
      dueDate: row.due_date ? new Date(row.due_date) : null,
      assigneeId: row.assignee_id,
      createdById: row.created_by_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      // Relations
      assignee: row.assignee ? this.mapRowToUser(row.assignee) : null,
      creator: row.creator ? this.mapRowToUser(row.creator) : null,
      _count: {
        comments: row.comments?.[0]?.count || 0,
        attachments: row.attachments?.[0]?.count || 0,
      }
    };
  },

  mapRowToUser(row: any) {
    return {
      id: row.id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      email: row.email,
    };
  },
};
```

### Rules
- **Only place using Supabase client** - No Supabase imports in services or components
- **One repository per aggregate root** - Task, Project, Member, File, Note
- **Return typed data** - Use generated DB types + manual mapping
- **Handle errors** - Wrap in `DatabaseError` with context
- **Use server client** - `createServerClient()` for Server Components/Actions
- **Use admin client sparingly** - Only for system operations (cron, webhooks)

---

## Layer Communication Rules

```
UI Layer (Components/Hooks)
       │
       ▼ (calls)
Server Actions (actions/) ──► Business Logic (services/) ──► Data Access (repositories/)
       │                           │                              │
       │                           ▼                              ▼
       │                    Pure Functions                   Supabase Client
       │                           │                              │
       └───────────────────────────┴──────────────────────────────┘
                              │
                              ▼
                    Database (PostgreSQL)
```

### What Each Layer CANNOT Do

| Layer | Cannot Do |
|-------|-----------|
| **UI** | Call Supabase directly, contain business logic, make authorization decisions |
| **Services** | Import React, use Supabase client, handle HTTP requests/responses |
| **Repositories** | Contain business logic, throw HTTP errors, know about UI state |

---

## Cross-Cutting Concerns

### Error Handling
```typescript
// shared/errors/index.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fieldErrors?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, cause: Error) {
    super(message, 'DATABASE_ERROR', 500, cause);
  }
}
```

### Logging
```typescript
// shared/lib/logger/server.ts
export const logger = {
  info: (message: string, meta?: Record<string, any>) => 
    console.log(JSON.stringify({ level: 'info', message, meta, timestamp: new Date().toISOString() })),
  error: (message: string, error: Error, meta?: Record<string, any>) => 
    console.error(JSON.stringify({ level: 'error', message, error: error.message, stack: error.stack, meta, timestamp: new Date().toISOString() })),
  warn: (message: string, meta?: Record<string, any>) => 
    console.warn(JSON.stringify({ level: 'warn', message, meta, timestamp: new Date().toISOString() })),
};
```

---

## Summary

| Layer | Location | Responsibility | Key Rule |
|-------|----------|----------------|----------|
| **UI** | `components/`, `hooks/` | Presentation, Interaction | No business logic, no DB access |
| **Business Logic** | `services/` | Domain rules, Orchestration | Pure functions, no React, no Supabase |
| **Data Access** | `repositories/` | Queries, Mutations | Only place with Supabase client |

This separation ensures **testability**, **maintainability**, and **security**.

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*