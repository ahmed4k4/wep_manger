# Activity Logging Architecture

## Overview

This document defines the activity logging system for tracking user actions, system events, and audit trails across all entities in the platform.

---

## Event Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Project** | Project lifecycle | Created, Updated, Archived, Deleted |
| **Task** | Task operations | Created, Updated, Status Changed, Assigned, Deleted |
| **Member** | Membership changes | Invited, Joined, Role Changed, Removed |
| **File** | File operations | Uploaded, Downloaded, Deleted |
| **Note** | Note operations | Created, Updated, Deleted, Privacy Changed |
| **Comment** | Comment operations | Created, Updated, Deleted |
| **User** | User profile | Updated Profile, Changed Avatar |
| **System** | System events | Login, Logout, Password Reset |

---

## Activity Log Data Model

### Database Schema
```sql
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL, -- e.g., 'TASK_CREATED', 'PROJECT_UPDATED'
  entity_type text NOT NULL, -- 'project', 'task', 'member', 'file', 'note', 'comment'
  entity_id uuid NOT NULL,
  metadata jsonb DEFAULT '{}', -- Flexible context data
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_activity_logs_project_created ON activity_logs(project_id, created_at DESC);
CREATE INDEX idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
```

### TypeScript Types
```typescript
// shared/types/activity.ts
export type ActivityAction = 
  | 'PROJECT_CREATED' | 'PROJECT_UPDATED' | 'PROJECT_ARCHIVED' | 'PROJECT_DELETED'
  | 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_STATUS_CHANGED' | 'TASK_ASSIGNED' | 'TASK_DELETED' | 'TASK_PRIORITY_CHANGED'
  | 'MEMBER_INVITED' | 'MEMBER_JOINED' | 'MEMBER_ROLE_CHANGED' | 'MEMBER_REMOVED'
  | 'FILE_UPLOADED' | 'FILE_DOWNLOADED' | 'FILE_DELETED'
  | 'NOTE_CREATED' | 'NOTE_UPDATED' | 'NOTE_DELETED' | 'NOTE_PRIVACY_CHANGED'
  | 'COMMENT_CREATED' | 'COMMENT_UPDATED' | 'COMMENT_DELETED'
  | 'USER_PROFILE_UPDATED' | 'USER_AVATAR_CHANGED'
  | 'USER_LOGIN' | 'USER_LOGOUT' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET';

export type EntityType = 'project' | 'task' | 'member' | 'file' | 'note' | 'comment' | 'user';

export interface ActivityLog {
  id: string;
  projectId: string | null;
  userId: string | null;
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  metadata: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface ActivityMetadata {
  // Common fields
  previousValue?: any;
  newValue?: any;
  field?: string;
  
  // Task specific
  previousStatus?: string;
  newStatus?: string;
  previousAssigneeId?: string;
  newAssigneeId?: string;
  previousPriority?: string;
  newPriority?: string;
  
  // Member specific
  previousRole?: string;
  newRole?: string;
  invitedBy?: string;
  
  // File specific
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  
  // Note specific
  isPrivate?: boolean;
  
  // Comment specific
  parentId?: string;
}
```

---

## Activity Service

### Core Service
```typescript
// features/activity/services/activityService.ts
import { createServerClient } from '@/shared/lib/supabase/server';
import { ActivityAction, EntityType, ActivityMetadata } from '@/shared/types/activity';

export const activityService = {
  /**
   * Log an activity event
   */
  async log(params: {
    userId: string | null;
    action: ActivityAction;
    entityType: EntityType;
    entityId: string;
    projectId?: string | null;
    metadata?: ActivityMetadata;
    request?: Request;
  }): Promise<void> {
    const supabase = createServerClient();
    
    // Extract request metadata
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    
    if (params.request) {
      ipAddress = params.request.headers.get('x-forwarded-for') || 
                  params.request.headers.get('x-real-ip') || 
                  null;
      userAgent = params.request.headers.get('user-agent') || null;
    }
    
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: params.userId,
        project_id: params.projectId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        metadata: params.metadata || {},
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    
    if (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - logging should never break the main operation
    }
  },
  
  /**
   * Log multiple activities in batch
   */
  async logBatch(activities: Array<{
    userId: string | null;
    action: ActivityAction;
    entityType: EntityType;
    entityId: string;
    projectId?: string | null;
    metadata?: ActivityMetadata;
  }>): Promise<void> {
    const supabase = createServerClient();
    
    const { error } = await supabase
      .from('activity_logs')
      .insert(activities.map(a => ({
        user_id: a.userId,
        project_id: a.projectId,
        action: a.action,
        entity_type: a.entityType,
        entity_id: a.entityId,
        metadata: a.metadata || {},
      })));
    
    if (error) {
      console.error('Failed to log activity batch:', error);
    }
  },
  
  /**
   * Get activity feed for a project
   */
  async getProjectActivity(
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
      actions?: ActivityAction[];
      userId?: string;
      entityType?: EntityType;
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<ActivityLog[]> {
    const supabase = createServerClient();
    
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    if (options.actions?.length) query = query.in('action', options.actions);
    if (options.userId) query = query.eq('user_id', options.userId);
    if (options.entityType) query = query.eq('entity_type', options.entityType);
    if (options.fromDate) query = query.gte('created_at', options.fromDate.toISOString());
    if (options.toDate) query = query.lte('created_at', options.toDate.toISOString());
    
    const { data, error } = await query;
    
    if (error) throw new Error('Failed to fetch activity');
    
    return data || [];
  },
  
  /**
   * Get activity for a specific entity
   */
  async getEntityActivity(
    entityType: EntityType,
    entityId: string,
    limit = 50
  ): Promise<ActivityLog[]> {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user:users(id, full_name, email, avatar_url)
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error('Failed to fetch entity activity');
    
    return data || [];
  },
  
  /**
   * Get user's recent activity across all projects
   */
  async getUserActivity(
    userId: string,
    limit = 50
  ): Promise<ActivityLog[]> {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        project:projects(id, name, key),
        user:users(id, full_name, email, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error('Failed to fetch user activity');
    
    return data || [];
  },
};
```

---

## Activity Logging Helpers

### Entity-Specific Helpers
```typescript
// features/activity/helpers/taskActivity.ts
import { activityService } from '../services/activityService';
import { ActivityAction, ActivityMetadata } from '@/shared/types/activity';

export const taskActivity = {
  created: (params: {
    userId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'TASK_CREATED',
    entityType: 'task',
    entityId: params.taskId,
    projectId: params.projectId,
    metadata: { taskTitle: params.taskTitle },
    request: params.request,
  }),
  
  updated: (params: {
    userId: string;
    projectId: string;
    taskId: string;
    field: string;
    previousValue: any;
    newValue: any;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'TASK_UPDATED',
    entityType: 'task',
    entityId: params.taskId,
    projectId: params.projectId,
    metadata: { 
      field: params.field,
      previousValue: params.previousValue,
      newValue: params.newValue,
    },
    request: params.request,
  }),
  
  statusChanged: (params: {
    userId: string;
    projectId: string;
    taskId: string;
    previousStatus: string;
    newStatus: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'TASK_STATUS_CHANGED',
    entityType: 'task',
    entityId: params.taskId,
    projectId: params.projectId,
    metadata: { 
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
    },
    request: params.request,
  }),
  
  assigned: (params: {
    userId: string;
    projectId: string;
    taskId: string;
    previousAssigneeId: string | null;
    newAssigneeId: string | null;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'TASK_ASSIGNED',
    entityType: 'task',
    entityId: params.taskId,
    projectId: params.projectId,
    metadata: { 
      previousAssigneeId: params.previousAssigneeId,
      newAssigneeId: params.newAssigneeId,
    },
    request: params.request,
  }),
  
  priorityChanged: (params: {
    userId: string;
    projectId: string;
    taskId: string;
    previousPriority: string;
    newPriority: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'TASK_PRIORITY_CHANGED',
    entityType: 'task',
    entityId: params.taskId,
    projectId: params.projectId,
    metadata: { 
      previousPriority: params.previousPriority,
      newPriority: params.newPriority,
    },
    request: params.request,
  }),
  
  deleted: (params: {
    userId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'TASK_DELETED',
    entityType: 'task',
    entityId: params.taskId,
    projectId: params.projectId,
    metadata: { taskTitle: params.taskTitle },
    request: params.request,
  }),
};
```

```typescript
// features/activity/helpers/projectActivity.ts
import { activityService } from '../services/activityService';

export const projectActivity = {
  created: (params: {
    userId: string;
    projectId: string;
    projectName: string;
    projectKey: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'PROJECT_CREATED',
    entityType: 'project',
    entityId: params.projectId,
    projectId: params.projectId,
    metadata: { projectName: params.projectName, projectKey: params.projectKey },
    request: params.request,
  }),
  
  updated: (params: {
    userId: string;
    projectId: string;
    field: string;
    previousValue: any;
    newValue: any;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'PROJECT_UPDATED',
    entityType: 'project',
    entityId: params.projectId,
    projectId: params.projectId,
    metadata: { 
      field: params.field,
      previousValue: params.previousValue,
      newValue: params.newValue,
    },
    request: params.request,
  }),
  
  archived: (params: {
    userId: string;
    projectId: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'PROJECT_ARCHIVED',
    entityType: 'project',
    entityId: params.projectId,
    projectId: params.projectId,
    request: params.request,
  }),
  
  deleted: (params: {
    userId: string;
    projectId: string;
    projectName: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'PROJECT_DELETED',
    entityType: 'project',
    entityId: params.projectId,
    projectId: params.projectId,
    metadata: { projectName: params.projectName },
    request: params.request,
  }),
};
```

```typescript
// features/activity/helpers/memberActivity.ts
import { activityService } from '../services/activityService';

export const memberActivity = {
  invited: (params: {
    userId: string; // Inviter
    projectId: string;
    invitedUserId: string;
    invitedEmail: string;
    role: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'MEMBER_INVITED',
    entityType: 'member',
    entityId: params.invitedUserId,
    projectId: params.projectId,
    metadata: { 
      invitedEmail: params.invitedEmail,
      role: params.role,
      invitedBy: params.userId,
    },
    request: params.request,
  }),
  
  joined: (params: {
    userId: string; // User who joined
    projectId: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'MEMBER_JOINED',
    entityType: 'member',
    entityId: params.userId,
    projectId: params.projectId,
    request: params.request,
  }),
  
  roleChanged: (params: {
    userId: string; // Who changed the role
    projectId: string;
    targetUserId: string;
    previousRole: string;
    newRole: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'MEMBER_ROLE_CHANGED',
    entityType: 'member',
    entityId: params.targetUserId,
    projectId: params.projectId,
    metadata: { 
      previousRole: params.previousRole,
      newRole: params.newRole,
    },
    request: params.request,
  }),
  
  removed: (params: {
    userId: string; // Who removed
    projectId: string;
    removedUserId: string;
    removedUserName: string;
    request?: Request;
  }) => activityService.log({
    userId: params.userId,
    action: 'MEMBER_REMOVED',
    entityType: 'member',
    entityId: params.removedUserId,
    projectId: params.projectId,
    metadata: { removedUserName: params.removedUserName },
    request: params.request,
  }),
};
```

---

## Integration with Server Actions

### Task Actions with Activity Logging
```typescript
// features/tasks/actions/updateTask.ts
'use server';

import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { permissionService } from '@/shared/services/permissionService';
import { taskService } from '../services/taskService';
import { updateTaskSchema } from '../schemas/task';
import { taskActivity } from '@/features/activity/helpers/taskActivity';
import { ok, err, Result } from '@/shared/lib/result';
import { ValidationError, ForbiddenError, ServerError, NotFoundError } from '@/shared/errors';

export async function updateTaskAction(
  taskId: string,
  formData: FormData
): Promise<Result<Task, ValidationError | ForbiddenError | ServerError | NotFoundError>> {
  const user = await getCurrentUser();
  if (!user) return err(new AuthenticationError());
  
  // Get current task for comparison
  const currentTask = await taskService.findById(taskId);
  if (!currentTask) return err(new NotFoundError('Task'));
  
  const projectId = currentTask.projectId;
  const canUpdate = await permissionService.can(user.id, 'tasks:update', { 
    projectId, 
    resourceOwnerId: currentTask.createdById 
  });
  if (!canUpdate) return err(new ForbiddenError());
  
  // Parse and validate
  const rawData = Object.fromEntries(formData.entries());
  const validated = updateTaskSchema.safeParse(rawData);
  if (!validated.success) {
    return err(new ValidationError(validated.error.flatten().fieldErrors));
  }
  
  // Detect changes
  const changes: Record<string, { previous: any; new: any }> = {};
  const updateData: Partial<Task> = {};
  
  for (const [key, value] of Object.entries(validated.data)) {
    if (value !== undefined && currentTask[key as keyof Task] !== value) {
      changes[key] = { previous: currentTask[key as keyof Task], new: value };
      updateData[key as keyof Task] = value;
    }
  }
  
  if (Object.keys(updateData).length === 0) {
    return ok(currentTask); // No changes
  }
  
  // Update task
  const updatedTask = await taskService.updateTask(taskId, updateData);
  
  // Log activities for each change
  for (const [field, { previous, new: newVal }] of Object.entries(changes)) {
    if (field === 'status') {
      await taskActivity.statusChanged({
        userId: user.id,
        projectId,
        taskId,
        previousStatus: previous,
        newStatus: newVal,
      });
    } else if (field === 'assigneeId') {
      await taskActivity.assigned({
        userId: user.id,
        projectId,
        taskId,
        previousAssigneeId: previous,
        newAssigneeId: newVal,
      });
    } else if (field === 'priority') {
      await taskActivity.priorityChanged({
        userId: user.id,
        projectId,
        taskId,
        previousPriority: previous,
        newPriority: newVal,
      });
    } else {
      await taskActivity.updated({
        userId: user.id,
        projectId,
        taskId,
        field,
        previousValue: previous,
        newValue: newVal,
      });
    }
  }
  
  revalidatePath(`/projects/${projectId}`);
  return ok(updatedTask);
}
```

---

## Activity Feed Components

### Activity Feed Display
```typescript
// features/activity/components/ActivityFeed.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { ActivityLog } from '@/shared/types/activity';
import { formatRelativeTime } from '@/shared/lib/i18n/formatters';
import { DataDisplay } from '@/shared/components/ui/DataDisplay';
import { TableSkeleton } from '@/shared/components/ui/Skeletons';
import { useTranslations } from 'next-intl';

interface ActivityFeedProps {
  projectId: string;
  limit?: number;
}

export function ActivityFeed({ projectId, limit = 20 }: ActivityFeedProps) {
  const t = useTranslations('activity');
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['activity', projectId, limit],
    queryFn: () => fetchProjectActivity(projectId, limit),
  });
  
  return (
    <DataDisplay
      data={data}
      error={error}
      isLoading={isLoading}
      skeleton={<TableSkeleton rows={limit} columns={4} />}
      onRetry={() => refetch()}
    >
      {(activities) => (
        <div className="space-y-3">
          {activities.map(activity => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </DataDisplay>
  );
}

function ActivityItem({ activity }: { activity: ActivityLog }) {
  const t = useTranslations('activity');
  const user = activity.user;
  const time = formatRelativeTime(activity.createdAt, 'en'); // Would use locale
  
  const actionLabel = getActionLabel(activity.action, t);
  const actionIcon = getActionIcon(activity.action);
  
  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        {actionIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{user?.full_name || 'Unknown'}</span>
          {' '}{actionLabel}{' '}
          <span className="font-medium">{getEntityLabel(activity.entityType, activity.metadata)}</span>
        </p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
      
      {activity.metadata?.previousValue !== undefined && (
        <div className="text-xs text-muted-foreground font-mono max-w-xs truncate">
          {JSON.stringify(activity.metadata.previousValue)} → {JSON.stringify(activity.metadata.newValue)}
        </div>
      )}
    </div>
  );
}

function getActionLabel(action: string, t: ReturnType<typeof useTranslations>): string {
  const labels: Record<string, string> = {
    'TASK_CREATED': t('created'),
    'TASK_UPDATED': t('updated'),
    'TASK_STATUS_CHANGED': t('changedStatus'),
    'TASK_ASSIGNED': t('assigned'),
    'TASK_PRIORITY_CHANGED': t('changedPriority'),
    'TASK_DELETED': t('deleted'),
    'PROJECT_CREATED': t('created'),
    'PROJECT_UPDATED': t('updated'),
    'PROJECT_ARCHIVED': t('archived'),
    'MEMBER_INVITED': t('invited'),
    'MEMBER_JOINED': t('joined'),
    'MEMBER_ROLE_CHANGED': t('changedRole'),
    'MEMBER_REMOVED': t('removed'),
    'FILE_UPLOADED': t('uploaded'),
    'FILE_DOWNLOADED': t('downloaded'),
    'FILE_DELETED': t('deleted'),
    'NOTE_CREATED': t('created'),
    'NOTE_UPDATED': t('updated'),
    'NOTE_DELETED': t('deleted'),
    'COMMENT_CREATED': t('commented'),
    'COMMENT_DELETED': t('deletedComment'),
  };
  return labels[action] || action.toLowerCase().replace(/_/g, ' ');
}

function getActionIcon(action: string): React.ReactNode {
  // Return appropriate Lucide icon based on action
  // Simplified for brevity
  return <span>●</span>;
}

function getEntityLabel(entityType: string, metadata: Record<string, any>): string {
  switch (entityType) {
    case 'task': return metadata?.taskTitle || 'task';
    case 'project': return metadata?.projectName || 'project';
    case 'member': return metadata?.invitedEmail || 'member';
    case 'file': return metadata?.fileName || 'file';
    case 'note': return metadata?.noteTitle || 'note';
    case 'comment': return 'comment';
    default: return entityType;
  }
}
```

---

## Real-time Activity (Optional)

### Supabase Realtime
```typescript
// features/activity/hooks/useRealtimeActivity.ts
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/shared/lib/supabase/browser';
import { ActivityLog } from '@/shared/types/activity';

export function useRealtimeActivity(projectId: string) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const supabase = createBrowserClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`activity:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newActivity = payload.new as ActivityLog;
          setActivities(prev => [newActivity, ...prev].slice(0, 100));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);
  
  return activities;
}
```

---

## Activity Retention & Cleanup

### Retention Policy
```sql
-- Delete activity logs older than 1 year (run via pg_cron or scheduled job)
DELETE FROM activity_logs 
WHERE created_at < now() - interval '1 year';

-- Or archive to cold storage
INSERT INTO activity_logs_archive 
SELECT * FROM activity_logs 
WHERE created_at < now() - interval '1 year';

DELETE FROM activity_logs 
WHERE created_at < now() - interval '1 year';
```

### Cleanup Job
```typescript
// scripts/cleanup-activity-logs.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function cleanupOldActivityLogs(retentionDays = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const { error } = await supabase
    .from('activity_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString());
  
  if (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
  
  console.log(`Cleaned up activity logs older than ${retentionDays} days`);
}
```

---

## Querying & Filtering

### Advanced Filters
```typescript
// features/activity/repositories/activityQueries.ts
import { createServerClient } from '@/shared/lib/supabase/server';
import { ActivityAction, EntityType } from '@/shared/types/activity';

export async function getFilteredActivity(filters: {
  projectId?: string;
  userId?: string;
  actions?: ActivityAction[];
  entityTypes?: EntityType[];
  dateRange?: { from: Date; to: Date };
  search?: string; // Search in metadata
  limit?: number;
  offset?: number;
}) {
  const supabase = createServerClient();
  
  let query = supabase
    .from('activity_logs')
    .select(`
      *,
      user:users(id, full_name, email, avatar_url),
      project:projects(id, name, key)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });
  
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.userId) query = query.eq('user_id', filters.userId);
  if (filters.actions?.length) query = query.in('action', filters.actions);
  if (filters.entityTypes?.length) query = query.in('entity_type', filters.entityTypes);
  if (filters.dateRange) {
    query = query
      .gte('created_at', filters.dateRange.from.toISOString())
      .lte('created_at', filters.dateRange.to.toISOString());
  }
  if (filters.search) {
    // Search in metadata JSON
    query = query.ilike('metadata::text', `%${filters.search}%`);
  }
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  
  const { data, error, count } = await query;
  
  if (error) throw new Error('Failed to fetch activity');
  
  return { data: data || [], total: count || 0 };
}
```

---

## Security & Privacy

### Access Control
- Users can only view activity for projects they're members of
- RLS policies enforce this at database level
- Admins can view all activity

### Sensitive Data
```typescript
// Never log sensitive data
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'key', 'creditCard', 'ssn'];

function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = { ...metadata };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_FIELDS.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}
```

---

## Testing Activity Logging

### Unit Tests
```typescript
// features/activity/services/__tests__/activityService.test.ts
import { activityService } from '../activityService';
import { createServerClient } from '@/shared/lib/supabase/server';

jest.mock('@/shared/lib/supabase/server');

describe('activityService', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
  };
  
  (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  
  it('logs activity', async () => {
    await activityService.log({
      userId: 'user-1',
      action: 'TASK_CREATED',
      entityType: 'task',
      entityId: 'task-1',
      projectId: 'project-1',
    });
    
    expect(mockSupabase.from).toHaveBeenCalledWith('activity_logs');
    expect(mockSupabase.insert).toHaveBeenCalled();
  });
  
  it('fetches project activity', async () => {
    mockSupabase.select.mockResolvedValueOnce({ 
      data: [{ id: '1', action: 'TASK_CREATED' }], 
      error: null 
    });
    
    const result = await activityService.getProjectActivity('project-1');
    
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('TASK_CREATED');
  });
});
```

---

## Summary

| Aspect | Implementation |
|--------|----------------|
| **Storage** | `activity_logs` table with RLS |
| **Service** | `activityService.log()` + entity helpers |
| **Integration** | Called from Server Actions after mutations |
| **Querying** | Filtered, paginated, with user/project joins |
| **Real-time** | Supabase Realtime (optional) |
| **Retention** | 1 year default, configurable cleanup |
| **Security** | RLS + sensitive data sanitization |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*