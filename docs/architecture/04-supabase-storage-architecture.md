# Supabase & Storage Architecture

## Overview

This document defines the Supabase integration architecture, including database design, client management, storage buckets, real-time subscriptions, and security policies.

---

## 1. Database Architecture

### Schema Design Principles

1. **UUID Primary Keys** - All tables use `uuid` with `gen_random_uuid()`
2. **Timestamps** - `created_at`, `updated_at` on all tables
3. **Soft Deletes** - `deleted_at` for audit trails
4. **Row Level Security** - Enabled on all tables
5. **Foreign Keys** - Explicit constraints with cascade rules
6. **Indexes** - Strategic indexes for query patterns

### Core Tables

```sql
-- Users (extends auth.users)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'USER',
  locale text NOT NULL DEFAULT 'en',
  theme text NOT NULL DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TYPE user_role AS ENUM ('ADMIN', 'PROJECT_MANAGER', 'USER');

-- Projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL, -- e.g., "PROJ", "MKT"
  name text NOT NULL,
  description text,
  status project_status NOT NULL DEFAULT 'ACTIVE',
  owner_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TYPE project_status AS ENUM ('ACTIVE', 'ARCHIVED', 'ON_HOLD');

-- Project Members
CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'MEMBER',
  joined_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE TYPE member_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'TODO',
  priority task_priority NOT NULL DEFAULT 'MEDIUM',
  position integer NOT NULL DEFAULT 0,
  due_date timestamptz,
  assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_id uuid NOT NULL REFERENCES public.users(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Files
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE, -- For private files
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  bucket text NOT NULL,
  path text NOT NULL,
  name text NOT NULL,
  size bigint NOT NULL,
  mime_type text NOT NULL,
  is_private boolean NOT NULL DEFAULT false,
  uploaded_by_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz DEFAULT now()
);

-- Notes
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  is_private boolean NOT NULL DEFAULT false,
  owner_id uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  file_id uuid REFERENCES public.files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Activity Log
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_files_project ON files(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_notes_project ON notes(project_id);
CREATE INDEX idx_comments_task ON comments(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_activity_project_created ON activity_logs(project_id, created_at DESC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at) WHERE read_at IS NULL;
```

---

## 2. Supabase Client Management

### Client Types & Locations

```
shared/lib/supabase/
├── client.ts      # Browser client (Client Components)
├── server.ts      # Server client (Server Components, Actions, Route Handlers)
├── admin.ts       # Admin client (Service role - restricted)
└── middleware.ts  # Middleware client (Auth refresh)
```

### Browser Client (`client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for Client Components
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
}
```

### Server Client (`server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore cookie setting errors in Server Components
          }
        },
      },
    }
  );
}
```

### Admin Client (`admin.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Usage tracking for audit
const adminClientUsage = new Set<string>();

export function getAdminClient(caller: string) {
  adminClientUsage.add(caller);
  return createAdminClient();
}
```

### Middleware Client (`middleware.ts`)
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  
  // Refresh session if expired
  await supabase.auth.getUser();
  
  return supabaseResponse;
}
```

---

## 3. Storage Architecture

### Bucket Configuration

| Bucket | Public | Purpose | RLS Policy |
|--------|--------|---------|------------|
| `project-files` | No | Project shared files | Project members only |
| `user-files` | No | Private user files | Owner + Admins only |
| `system-files` | No | System generated | Service role only |
| `avatars` | Yes | User avatars | Public read, owner write |

### Bucket Setup (SQL)
```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('project-files', 'project-files', false),
  ('user-files', 'user-files', false),
  ('system-files', 'system-files', false),
  ('avatars', 'avatars', true);

-- RLS Policies for project-files
CREATE POLICY "Project members can view files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-files' AND
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = (storage.foldername(name))[1]::uuid
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-files' AND
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = (storage.foldername(name))[1]::uuid
      AND pm.user_id = auth.uid()
      AND pm.role IN ('OWNER', 'ADMIN', 'MEMBER')
    )
  );

CREATE POLICY "File uploaders can update their files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-files' AND
    owner = auth.uid()
  );

CREATE POLICY "File uploaders or project admins can delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-files' AND
    (owner = auth.uid() OR
     EXISTS (
       SELECT 1 FROM project_members pm
       WHERE pm.project_id = (storage.foldername(name))[1]::uuid
       AND pm.user_id = auth.uid()
       AND pm.role IN ('OWNER', 'ADMIN')
     ))
  );

-- RLS Policies for user-files (private)
CREATE POLICY "Users can manage their own files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS Policies for avatars (public read)
CREATE POLICY "Public avatar read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

### File Path Structure

```
project-files/
├── {projectId}/
│   ├── tasks/
│   │   └── {taskId}/
│   │       └── {timestamp}-{filename}
│   ├── notes/
│   │   └── {noteId}/
│   │       └── {timestamp}-{filename}
│   └── general/
│       └── {timestamp}-{filename}

user-files/
├── {userId}/
│   ├── avatar/
│   │   └── {timestamp}-{filename}
│   ├── documents/
│   │   └── {timestamp}-{filename}
│   └── exports/
│       └── {timestamp}-{filename}

system-files/
├── reports/
│   └── {timestamp}-{reportName}.pdf
├── exports/
│   └── {timestamp}-{exportName}.csv
└── backups/
    └── {timestamp}-backup.sql
```

### Storage Helpers (`modules/storage/helpers.ts`)
```typescript
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { BUCKETS } from './buckets';

export interface SignedUploadUrlResult {
  signedUrl: string;
  path: string;
  token: string;
}

export interface UploadOptions {
  bucket: keyof typeof BUCKETS;
  userId: string;
  projectId?: string;
  fileName: string;
  contentType: string;
  expiresIn?: number; // seconds
}

export async function generateSignedUploadUrl(options: UploadOptions): Promise<SignedUploadUrlResult> {
  const admin = createAdminClient();
  const { bucket, userId, projectId, fileName, contentType, expiresIn = 3600 } = options;
  
  // Generate path based on bucket type
  let path: string;
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  switch (bucket) {
    case 'PROJECT_FILES':
      if (!projectId) throw new Error('projectId required for project-files');
      path = `${projectId}/general/${timestamp}-${sanitizedName}`;
      break;
    case 'USER_FILES':
      path = `${userId}/documents/${timestamp}-${sanitizedName}`;
      break;
    case 'AVATARS':
      path = `${userId}/avatar/${timestamp}-${sanitizedName}`;
      break;
    default:
      throw new Error(`Unknown bucket: ${bucket}`);
  }
  
  const { data, error } = await admin.storage
    .from(BUCKETS[bucket])
    .createSignedUploadUrl(path, { expiresIn });
  
  if (error) throw new Error(`Failed to generate signed URL: ${error.message}`);
  
  return { signedUrl: data.signedUrl, path: data.path, token: data.token };
}

export async function generateSignedDownloadUrl(
  bucket: keyof typeof BUCKETS,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const admin = createAdminClient();
  
  const { data, error } = await admin.storage
    .from(BUCKETS[bucket])
    .createSignedUrl(path, expiresIn);
  
  if (error) throw new Error(`Failed to generate download URL: ${error.message}`);
  
  return data.signedUrl;
}

export async function deleteFile(bucket: keyof typeof BUCKETS, path: string): Promise<void> {
  const admin = createAdminClient();
  
  const { error } = await admin.storage.from(BUCKETS[bucket]).remove([path]);
  
  if (error) throw new Error(`Failed to delete file: ${error.message}`);
}

export async function getFileMetadata(bucket: keyof typeof BUCKETS, path: string) {
  const admin = createAdminClient();
  
  const { data, error } = await admin.storage.from(BUCKETS[bucket]).list(path.split('/').slice(0, -1).join('/'), {
    search: path.split('/').pop(),
  });
  
  if (error) throw new Error(`Failed to get file metadata: ${error.message}`);
  
  return data?.[0] || null;
}
```

---

## 4. Real-time Architecture

### Channel Naming Convention
```
{feature}:{entityType}:{entityId}
```

Examples:
- `tasks:project:proj_123` - All tasks in project
- `comments:task:task_456` - Comments on a task
- `members:project:proj_123` - Project members
- `notifications:user:user_789` - User notifications

### Subscription Management (`modules/realtime/subscriptions.ts`)
```typescript
import { RealtimeChannel } from '@supabase/supabase-js';
import { createBrowserClient } from '@/shared/lib/supabase/client';

type SubscriptionCallback = (payload: any) => void;

interface Subscription {
  channel: RealtimeChannel;
  callbacks: Set<SubscriptionCallback>;
}

const subscriptions = new Map<string, Subscription>();

export function subscribe(
  channelName: string,
  table: string,
  filter: string,
  callback: SubscriptionCallback,
  events: ('INSERT' | 'UPDATE' | 'DELETE')[] = ['INSERT', 'UPDATE', 'DELETE']
): () => void {
  const supabase = createBrowserClient();
  
  let subscription = subscriptions.get(channelName);
  
  if (!subscription) {
    const channel = supabase.channel(channelName);
    
    events.forEach(event => {
      channel.on(
        'postgres_changes',
        { event, schema: 'public', table, filter },
        (payload) => {
          subscription?.callbacks.forEach(cb => cb(payload));
        }
      );
    });
    
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error(`Realtime channel error: ${channelName}`);
      }
    });
    
    subscription = { channel, callbacks: new Set() };
    subscriptions.set(channelName, subscription);
  }
  
  subscription.callbacks.add(callback);
  
  // Return unsubscribe function
  return () => {
    const sub = subscriptions.get(channelName);
    if (sub) {
      sub.callbacks.delete(callback);
      if (sub.callbacks.size === 0) {
        supabase.removeChannel(sub.channel);
        subscriptions.delete(channelName);
      }
    }
  };
}

// Feature-specific subscription helpers
export const realtime = {
  tasks: {
    subscribeToProject(projectId: string, callback: SubscriptionCallback) {
      return subscribe(
        `tasks:project:${projectId}`,
        'tasks',
        `project_id=eq.${projectId}`,
        callback
      );
    },
  },
  comments: {
    subscribeToTask(taskId: string, callback: SubscriptionCallback) {
      return subscribe(
        `comments:task:${taskId}`,
        'comments',
        `task_id=eq.${taskId}`,
        callback
      );
    },
    subscribeToNote(noteId: string, callback: SubscriptionCallback) {
      return subscribe(
        `comments:note:${noteId}`,
        'comments',
        `note_id=eq.${noteId}`,
        callback
      );
    },
  },
  members: {
    subscribeToProject(projectId: string, callback: SubscriptionCallback) {
      return subscribe(
        `members:project:${projectId}`,
        'project_members',
        `project_id=eq.${projectId}`,
        callback
      );
    },
  },
  notifications: {
    subscribeToUser(userId: string, callback: SubscriptionCallback) {
      return subscribe(
        `notifications:user:${userId}`,
        'notifications',
        `user_id=eq.${userId}`,
        callback,
        ['INSERT'] // Only new notifications
      );
    },
  },
};
```

### Usage in Client Component
```typescript
// features/tasks/components/TaskBoard.tsx
'use client';

import { useEffect } from 'react';
import { realtime } from '@/modules/realtime/subscriptions';

export function TaskBoard({ projectId, initialTasks }: TaskBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  
  useEffect(() => {
    const unsubscribe = realtime.tasks.subscribeToProject(projectId, (payload) => {
      if (payload.eventType === 'INSERT') {
        setTasks(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
      } else if (payload.eventType === 'DELETE') {
        setTasks(prev => prev.filter(t => t.id !== payload.old.id));
      }
    });
    
    return unsubscribe;
  }, [projectId]);
  
  // ... render
}
```

---

## 5. Database Functions (RPC)

### Custom PostgreSQL Functions

```sql
-- Bulk update task positions (atomic)
CREATE OR REPLACE FUNCTION bulk_update_task_positions(updates jsonb[])
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  update_record jsonb;
BEGIN
  FOREACH update_record IN ARRAY updates LOOP
    UPDATE tasks
    SET position = (update_record->>'position')::int,
        status = COALESCE((update_record->>'status'), status),
        updated_at = now()
    WHERE id = (update_record->>'id')::uuid;
  END LOOP;
END;
$$;

-- Get user's accessible projects
CREATE OR REPLACE FUNCTION get_user_projects(user_id uuid)
RETURNS TABLE (
  id uuid, key text, name text, description text, status text,
  owner_id uuid, member_role text, created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.key, p.name, p.description, p.status,
         p.owner_id, pm.role as member_role, p.created_at
  FROM projects p
  JOIN project_members pm ON pm.project_id = p.id
  WHERE pm.user_id = user_id AND p.deleted_at IS NULL
  UNION
  SELECT p.id, p.key, p.name, p.description, p.status,
         p.owner_id, 'OWNER' as member_role, p.created_at
  FROM projects p
  WHERE p.owner_id = user_id AND p.deleted_at IS NULL;
END;
$$;

-- Check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(project_id uuid, user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2
  ) OR EXISTS (
    SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2
  );
END;
$$;

-- Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM notifications
    WHERE user_id = $1 AND read_at IS NULL
  );
END;
$$;
```

---

## 6. Edge Cases & Error Handling

### Connection Pooling
- Supabase uses PgBouncer in transaction mode
- Server Components: New connection per request (OK for low traffic)
- Server Actions: Reuse connections via `createServerClient()`
- High traffic: Consider connection pooling middleware

### Retry Logic
```typescript
// shared/lib/supabase/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 1000 } = options;
  
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    // Only retry on transient errors
    if (isTransientError(error)) {
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, { retries: retries - 1, delay: delay * 2 });
    }
    
    throw error;
  }
}

function isTransientError(error: any): boolean {
  // Network errors, timeouts, deadlocks
  return (
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === '40001' || // Serialization failure
    error?.message?.includes('connection') ||
    error?.message?.includes('timeout')
  );
}
```

### Health Checks
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/shared/lib/supabase/server';

export async function GET() {
  const supabase = await createServerClient();
  
  const start = Date.now();
  const { error } = await supabase.from('users').select('id').limit(1);
  const latency = Date.now() - start;
  
  if (error) {
    return NextResponse.json(
      { status: 'unhealthy', database: 'error', latency },
      { status: 503 }
    );
  }
  
  return NextResponse.json({
    status: 'healthy',
    database: 'ok',
    latency,
    timestamp: new Date().toISOString(),
  });
}
```

---

## Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL (Supabase) | Primary data store |
| Auth | Supabase Auth | Authentication & user management |
| Storage | Supabase Storage (S3) | File uploads/downloads |
| Real-time | Supabase Realtime | Live updates |
| Client (Browser) | `@supabase/ssr` | Client Components |
| Client (Server) | `@supabase/ssr` | Server Components, Actions |
| Client (Admin) | `@supabase/supabase-js` | System operations |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*