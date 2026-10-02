# Component Responsibilities

## Overview

This document defines the responsibilities and boundaries for each type of component in the Next.js App Router architecture.

---

## 1. Server Components (Default)

### Definition
React components that render **exclusively on the server**. No JavaScript sent to client.

### Responsibilities
- **Data Fetching** - Direct database access via repositories
- **Initial Render** - HTML generated on server, streamed to client
- **SEO-Critical Content** - Metadata, Open Graph, structured data
- **Static Content** - Pages that don't require interactivity
- **Composition** - Compose Client Components as "islands of interactivity"

### Capabilities
| Can Do | Cannot Do |
|--------|-----------|
| `await` database calls | `useState`, `useEffect`, `useRef` |
| Access cookies, headers | Event handlers (`onClick`, `onChange`) |
| Use Server Actions directly | Browser APIs (`window`, `localStorage`) |
| Stream large responses | Real-time subscriptions |

### Patterns

#### Page Component (Data Fetching + Composition)
```typescript
// app/(dashboard)/projects/[projectId]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProjectWithDetails } from '@/features/projects/repositories/projectQueries';
import { ProjectHeader } from '@/features/projects/components/ProjectHeader';
import { TaskBoard } from '@/features/tasks/components/TaskBoard';
import { ProjectMembers } from '@/features/members/components/ProjectMembers';

export async function generateMetadata({ params }: { params: Promise<{ projectId: string }> }): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProjectWithDetails(projectId);
  return { title: project?.name || 'Project Not Found' };
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectWithDetails(projectId);
  
  if (!project) notFound();
  
  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TaskBoard projectId={projectId} initialTasks={project.tasks} />
        </div>
        <div>
          <ProjectMembers projectId={projectId} members={project.members} />
        </div>
      </div>
    </div>
  );
}
```

#### Layout Component (Shared UI Shell)
```typescript
// app/(dashboard)/layout.tsx
import { Sidebar } from '@/shared/components/layout/sidebar/Sidebar';
import { Header } from '@/shared/components/layout/header/Header';
import { Toaster } from '@/shared/ui/toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
```

---

## 2. Client Components (Opt-In)

### Definition
Components with `'use client'` directive that hydrate in the browser.

### Responsibilities
- **Interactivity** - Event handlers, state, effects
- **Real-time UI** - Supabase Realtime subscriptions
- **Optimistic Updates** - Immediate UI feedback before server confirmation
- **Browser APIs** - localStorage, clipboard, file uploads, drag-drop
- **Complex Forms** - Controlled inputs, validation UX

### Capabilities
| Can Do | Cannot Do |
|--------|-----------|
| `useState`, `useEffect`, `useRef` | Direct database access |
| Event handlers | `async/await` database calls |
| Browser APIs | Access server-only cookies (use Server Actions) |
| Real-time subscriptions | Generate metadata |

### Patterns

#### Interactive Component (Task Board with Drag-Drop)
```typescript
// features/tasks/components/TaskBoard.tsx
'use client';

import { useState, useCallback } from 'react';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { TaskColumn } from './TaskColumn';
import { TaskSkeleton } from './TaskSkeleton';
import { cn } from '@/shared/utils/classnames';

interface TaskBoardProps {
  projectId: string;
  initialTasks: Task[];
  columns: TaskColumnConfig[];
}

export function TaskBoard({ projectId, initialTasks, columns }: TaskBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const { moveTask, updateTask, isPending } = useTaskMutations(projectId);
  
  const handleDragEnd = useCallback(async (result: DragEndEvent) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }
    
    // Optimistic update
    const newTasks = Array.from(tasks);
    const [movedTask] = newTasks.splice(source.index, 1);
    newTasks.splice(destination.index, 0, movedTask);
    setTasks(newTasks);
    
    try {
      await moveTask(draggableId, {
        status: destination.droppableId,
        position: destination.index * 1000,
      });
    } catch (error) {
      // Rollback on failure
      setTasks(tasks);
      toast.error('Failed to move task');
    }
  }, [tasks, moveTask]);
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {columns.map(column => (
          <TaskColumn
            key={column.id}
            column={column}
            tasks={tasks.filter(t => t.status === column.id)}
            isPending={isPending}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
```

#### Real-time Subscription Component
```typescript
// features/comments/components/CommentThread.tsx
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/shared/lib/supabase/client';
import { Comment, CommentForm } from './CommentForm';
import { CommentList } from './CommentList';

interface CommentThreadProps {
  entityType: 'task' | 'project' | 'file';
  entityId: string;
  initialComments: Comment[];
}

export function CommentThread({ entityType, entityId, initialComments }: CommentThreadProps) {
  const [comments, setComments] = useState(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const supabase = createBrowserClient();
    
    const channel = supabase
      .channel(`comments:${entityType}:${entityId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `${entityType}_id=eq.${entityId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments(prev => [...prev, payload.new as Comment]);
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev => prev.map(c => c.id === payload.new.id ? payload.new as Comment : c));
          }
        }
      )
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [entityType, entityId]);
  
  const handleAddComment = async (content: string) => {
    setIsLoading(true);
    try {
      await createCommentAction({ entityType, entityId, content });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <CommentList comments={comments} />
      <CommentForm onSubmit={handleAddComment} isLoading={isLoading} />
    </div>
  );
}
```

---

## 3. Server Actions

### Definition
Async functions that run **only on the server**, called from Client Components or forms.

### Responsibilities
- **Mutations** - Create, Update, Delete operations
- **Form Handling** - Process form submissions (progressive enhancement)
- **Authorization** - Verify permissions before mutations
- **Validation** - Schema validation (Zod) + business rule validation
- **Side Effects** - Activity logging, notifications, emails
- **Revalidation** - `revalidatePath`, `revalidateTag` for cache invalidation

### Capabilities
| Can Do | Cannot Do |
|--------|-----------|
| Direct database access (via repositories) | Return React components |
| Call Business Logic (services) | Use `useState`, `useEffect` |
| Access cookies, headers | Stream responses |
| `revalidatePath`, `revalidateTag` | Real-time subscriptions |
| `redirect()`, `cookies()` | Browser APIs |

### Patterns

#### Standard Server Action
```typescript
// features/tasks/actions/updateTask.ts
'use server';

import { createServerClient } from '@/shared/lib/supabase/server';
import { taskService } from '../services/taskService';
import { updateTaskSchema } from '../schemas/updateTask';
import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateTaskAction(taskId: string, formData: FormData) {
  // 1. Authentication
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  
  // 2. Input Validation (Zod)
  const rawData = Object.fromEntries(formData.entries());
  const validated = updateTaskSchema.safeParse(rawData);
  
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }
  
  // 3. Business Logic (Service Layer)
  try {
    const task = await taskService.updateTask(user.id, taskId, validated.data);
    
    // 4. Cache Invalidation
    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath(`/projects/${task.projectId}/tasks/${taskId}`);
    
    return { success: true, task };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { error: 'You do not have permission to update this task' };
    }
    if (error instanceof ValidationError) {
      return { error: error.fieldErrors };
    }
    return { error: 'Failed to update task' };
  }
}
```

#### Form with Progressive Enhancement
```typescript
// features/tasks/components/TaskForm.tsx
'use client';

import { useActionState } from 'react';
import { updateTaskAction } from '../actions/updateTask';
import { TaskFormFields } from './TaskFormFields';

export function TaskForm({ task, projectId }: { task: Task; projectId: string }) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await updateTaskAction(task.id, formData);
    },
    { error: null, success: false }
  );
  
  return (
    <form action={formAction} className="space-y-4">
      <TaskFormFields task={task} disabled={isPending} />
      {state.error && (
        <div className="text-sm text-red-500" role="alert">
          {typeof state.error === 'string' ? state.error : 'Validation failed'}
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
```

---

## 4. Route Handlers (API Routes)

### Definition
Files named `route.ts` that handle HTTP requests (GET, POST, PUT, DELETE, etc.).

### Responsibilities
- **Webhooks** - External service callbacks (Stripe, GitHub, Email providers)
- **File Uploads** - Multipart/form-data handling (Supabase Storage signed URLs)
- **Streaming Responses** - Large data exports, SSE for real-time
- **Third-Party Integrations** - OAuth callbacks, API proxies
- **On-Demand Revalidation** - `POST /api/revalidate` for ISR

### When to Use Route Handlers vs Server Actions

| Scenario | Use |
|----------|-----|
| Form submission from Client Component | **Server Action** |
| Webhook from external service | **Route Handler** |
| File upload (large/binary) | **Route Handler** |
| OAuth callback | **Route Handler** |
| Streaming CSV/PDF export | **Route Handler** |
| Simple CRUD mutation | **Server Action** |
| Real-time event broadcast | **Route Handler** |

### Patterns

#### Webhook Handler
```typescript
// app/api/webhooks/github/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { verifyGitHubSignature } from '@/modules/integrations/github/verify';
import { syncGitHubIssues } from '@/modules/integrations/github/sync';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-hub-signature-256');
  const body = await request.text();
  
  if (!verifyGitHubSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const event = request.headers.get('x-github-event');
  const payload = JSON.parse(body);
  
  if (event === 'issues' || event === 'issue_comment') {
    await syncGitHubIssues(payload);
  }
  
  return NextResponse.json({ received: true });
}
```

#### File Upload (Signed URL)
```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/shared/lib/supabase/server';
import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { generateSignedUploadUrl } from '@/modules/storage/helpers';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const bucket = formData.get('bucket') as string; // 'project-files' | 'user-files'
  const projectId = formData.get('projectId') as string;
  
  if (!file || !bucket) {
    return NextResponse.json({ error: 'Missing file or bucket' }, { status: 400 });
  }
  
  // Validate file type/size
  const allowedTypes = ['image/', 'application/pdf', 'text/'];
  if (!allowedTypes.some(t => file.type.startsWith(t))) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }
  
  // Generate signed URL for direct-to-S3 upload
  const { signedUrl, path } = await generateSignedUploadUrl({
    bucket,
    userId: user.id,
    projectId,
    fileName: file.name,
    contentType: file.type,
  });
  
  return NextResponse.json({ signedUrl, path });
}
```

#### On-Demand Revalidation
```typescript
// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }
  
  const body = await request.json();
  const { path, tag } = body;
  
  if (path) revalidatePath(path);
  if (tag) revalidateTag(tag);
  
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```

---

## 5. Supabase Client Variants

### Three Client Types

| Client | Location | Use Case |
|--------|----------|----------|
| **Browser Client** | `shared/lib/supabase/client.ts` | Client Components, real-time subscriptions |
| **Server Client** | `shared/lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers |
| **Admin Client** | `shared/lib/supabase/admin.ts` | Cron jobs, webhooks, system operations (service role) |

### Browser Client (Client Components Only)
```typescript
// shared/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client (Server Components/Actions)
```typescript
// shared/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

### Admin Client (Service Role - Restricted)
```typescript
// shared/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

**⚠️ Admin Client Rules:**
- Only in `modules/`, `app/api/`, or cron jobs
- Never in features/ or shared/components/
- Audited for security compliance

---

## 6. Supabase Storage

### Bucket Structure
```
project-files/          # Public project files (shared with members)
├── {projectId}/
│   ├── tasks/{taskId}/
│   ├── notes/{noteId}/
│   └── general/
user-files/             # Private user files (only owner + admins)
├── {userId}/
│   ├── avatar/
│   ├── documents/
│   └── exports/
system-files/           # System-generated (reports, backups)
├── reports/
├── exports/
└── backups/
```

### Access Patterns

#### Public Project Files (RLS Protected)
```typescript
// modules/storage/buckets.ts
export const BUCKETS = {
  PROJECT_FILES: 'project-files',
  USER_FILES: 'user-files',
  SYSTEM_FILES: 'system-files',
} as const;

// Upload: Server Action generates signed URL → Client uploads directly
// Download: Server Component checks RLS → Returns signed download URL
```

#### Private User Files
```typescript
// features/files/actions/uploadUserFile.ts
'use server';

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';

export async function uploadUserFileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError();
  
  const file = formData.get('file') as File;
  const admin = createAdminClient();
  
  const path = `${user.id}/documents/${Date.now()}-${file.name}`;
  const { data, error } = await admin.storage
    .from('user-files')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  
  if (error) throw new DatabaseError('Upload failed', error);
  
  // Create file record in DB
  await fileRepository.create({
    userId: user.id,
    path: data.path,
    bucket: 'user-files',
    name: file.name,
    size: file.size,
    mimeType: file.type,
    isPrivate: true,
  });
  
  return { success: true, path: data.path };
}
```

---

## Summary: When to Use What

| Need | Solution |
|------|----------|
| Fetch data for initial render | **Server Component** + Repository |
| SEO metadata | **Server Component** + `generateMetadata` |
| Interactive UI (drag-drop, modals) | **Client Component** + Hooks |
| Real-time updates | **Client Component** + Supabase Realtime |
| Form submission | **Server Action** (progressive enhancement) |
| Complex mutation + side effects | **Server Action** → Service → Repository |
| Webhook from external service | **Route Handler** |
| File upload (large/binary) | **Route Handler** → Signed URL → Direct to S3 |
| OAuth callback | **Route Handler** |
| Streaming export | **Route Handler** |
| System job (cron, cleanup) | **Admin Client** in Route Handler |

---

## Decision Tree

```
Is it a page/layout?
  ├─ Yes → Server Component (default)
  │         ├─ Needs interactivity? → Extract to Client Component
  │         └─ Needs real-time? → Extract to Client Component
  └─ No → Is it an API endpoint?
            ├─ Webhook/OAuth/Upload/Stream → Route Handler
            └─ Form submission/Mutation → Server Action
```

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*