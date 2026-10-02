# Validation Strategy

## Overview

This document defines the validation architecture using **Zod** for schema validation with consistent patterns across Server Actions, Route Handlers, and Client Components.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Schema Definition** | Zod |
| **Type Inference** | `z.infer<typeof schema>` |
| **Form Handling** | React Hook Form + Zod Resolver |
| **Server Validation** | Zod `safeParse` |

---

## Validation Principles

1. **Single Source of Truth** - Schemas defined once, used everywhere
2. **Fail Fast** - Validate at boundaries (Server Actions, API)
3. **Type Safety** - Infer TypeScript types from schemas
4. **User-Friendly Messages** - Localized error messages
5. **Composable** - Reusable schema fragments

---

## Schema Organization

### Shared Schemas (`shared/schemas/`)
```typescript
// shared/schemas/common.ts
import { z } from 'zod';

// Reusable primitives
export const idSchema = z.string().uuid('Invalid ID format');
export const emailSchema = z.string().email('Invalid email address');
export const urlSchema = z.string().url('Invalid URL').optional().or(z.literal(''));
export const slugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens');

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Date range
export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine(
  data => !data.from || !data.to || new Date(data.from) <= new Date(data.to),
  { message: 'From date must be before to date', path: ['from'] }
);

// File upload
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(50 * 1024 * 1024), // 50MB
  allowedTypes: z.array(z.string()).default([
    'image/',
    'application/pdf',
    'text/',
    'application/msword',
    'application/vnd.openxmlformats',
    'application/zip',
  ]),
});
```

### Feature Schemas (`features/*/schemas/`)
```typescript
// features/projects/schemas/project.ts
import { z } from 'zod';
import { idSchema, slugSchema } from '@/shared/schemas/common';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long'),
  key: slugSchema.min(2, 'Key must be at least 2 characters').max(10, 'Key too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'ON_HOLD']).default('ACTIVE'),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: idSchema,
});

export const projectParamsSchema = z.object({
  projectId: idSchema,
});

export const projectQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'ARCHIVED', 'ON_HOLD', 'ALL']).default('ACTIVE'),
  search: z.string().optional(),
});

// Types inferred from schemas
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectParams = z.infer<typeof projectParamsSchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
```

```typescript
// features/tasks/schemas/task.ts
import { z } from 'zod';
import { idSchema, paginationSchema, dateRangeSchema } from '@/shared/schemas/common';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Title too long'),
  description: z.string().max(10000, 'Description too long').optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: idSchema.optional(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: idSchema,
});

export const taskParamsSchema = z.object({
  taskId: idSchema,
});

export const taskQuerySchema = paginationSchema.extend({
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ALL']).default('ALL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'ALL']).default('ALL'),
  assigneeId: idSchema.optional(),
  search: z.string().optional(),
  ...dateRangeSchema.shape,
});

// Types
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskParams = z.infer<typeof taskParamsSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
```

```typescript
// features/members/schemas/member.ts
import { z } from 'zod';
import { emailSchema, idSchema } from '@/shared/schemas/common';

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
  projectId: idSchema,
});

export const updateMemberSchema = z.object({
  userId: idSchema,
  projectId: idSchema,
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

export const memberParamsSchema = z.object({
  projectId: idSchema,
  userId: idSchema,
});

// Types
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MemberParams = z.infer<typeof memberParamsSchema>;
```

```typescript
// features/notes/schemas/note.ts
import { z } from 'zod';
import { idSchema, paginationSchema } from '@/shared/schemas/common';

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
  isPrivate: z.boolean().default(false),
  projectId: idSchema,
});

export const updateNoteSchema = createNoteSchema.partial().extend({
  id: idSchema,
});

export const noteParamsSchema = z.object({
  noteId: idSchema,
});

export const noteQuerySchema = paginationSchema.extend({
  isPrivate: z.boolean().optional(),
  search: z.string().optional(),
});

// Types
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteParams = z.infer<typeof noteParamsSchema>;
export type NoteQuery = z.infer<typeof noteQuerySchema>;
```

```typescript
// features/files/schemas/file.ts
import { z } from 'zod';
import { idSchema, paginationSchema, fileUploadSchema } from '@/shared/schemas/common';

export const uploadFileSchema = z.object({
  entityType: z.enum(['task', 'note', 'general']),
  entityId: idSchema.optional(),
  projectId: idSchema,
});

export const fileParamsSchema = z.object({
  fileId: idSchema,
});

export const fileQuerySchema = paginationSchema.extend({
  entityType: z.enum(['task', 'note', 'general', 'ALL']).default('ALL'),
  mimeType: z.string().optional(),
});

// Types
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type FileParams = z.infer<typeof fileParamsSchema>;
export type FileQuery = z.infer<typeof fileQuerySchema>;
```

---

## Server-Side Validation

### Server Action Validation
```typescript
// features/tasks/actions/createTask.ts
'use server';

import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { permissionService } from '@/shared/services/permissionService';
import { taskService } from '../services/taskService';
import { createTaskSchema } from '../schemas/task';
import { ok, err, Result } from '@/shared/lib/result';
import { ValidationError, ForbiddenError, ServerError } from '@/shared/errors';

export async function createTaskAction(
  projectId: string,
  formData: FormData
): Promise<Result<Task, ValidationError | ForbiddenError | ServerError>> {
  const user = await getCurrentUser();
  if (!user) return err(new AuthenticationError());
  
  const canCreate = await permissionService.can(user.id, 'tasks:create', { projectId });
  if (!canCreate) return err(new ForbiddenError('Cannot create tasks in this project'));
  
  // Parse and validate
  const rawData = Object.fromEntries(formData.entries());
  
  // Convert form data to proper types
  const parsedData = {
    ...rawData,
    tags: rawData.tags ? JSON.parse(rawData.tags as string) : [],
    dueDate: rawData.dueDate || null,
  };
  
  const validated = createTaskSchema.safeParse(parsedData);
  if (!validated.success) {
    return err(new ValidationError(validated.error.flatten().fieldErrors));
  }
  
  // Business logic with validated data
  const task = await taskService.createTask(user.id, { 
    ...validated.data, 
    projectId 
  });
  
  revalidatePath(`/projects/${projectId}`);
  return ok(task);
}
```

### Route Handler Validation
```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createTaskSchema } from '@/features/tasks/schemas/task';
import { taskService } from '@/features/tasks/services/taskService';
import { withErrorHandling } from '../_lib/withErrorHandling';
import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { permissionService } from '@/shared/services/permissionService';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  
  const body = await request.json();
  const projectId = body.projectId;
  
  const canCreate = await permissionService.can(user.id, 'tasks:create', { projectId });
  if (!canCreate) throw new ForbiddenError();
  
  // Validate
  const validated = createTaskSchema.safeParse(body);
  if (!validated.success) {
    throw new ValidationError(validated.error.flatten().fieldErrors);
  }
  
  const task = await taskService.createTask(user.id, { ...validated.data, projectId });
  
  return NextResponse.json(task, { status: 201 });
});
```

### Query Parameter Validation
```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { projectQuerySchema } from '@/features/projects/schemas/project';
import { projectService } from '@/features/projects/services/projectService';
import { withErrorHandling } from '../_lib/withErrorHandling';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  
  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const rawParams = Object.fromEntries(searchParams.entries());
  
  const validated = projectQuerySchema.safeParse(rawParams);
  if (!validated.success) {
    throw new ValidationError(validated.error.flatten().fieldErrors);
  }
  
  const projects = await projectService.listProjects(user.id, validated.data);
  
  return NextResponse.json(projects);
});
```

---

## Client-Side Validation

### React Hook Form + Zod
```typescript
// features/tasks/components/CreateTaskForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, CreateTaskInput } from '../schemas/task';
import { createTaskAction } from '../actions/createTask';
import { useFormAction } from '@/shared/hooks/useFormAction';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select } from '@/shared/ui/select';
import { DatePicker } from '@/shared/ui/date-picker';

export function CreateTaskForm({ projectId }: { projectId: string }) {
  const { formAction, fieldErrors, generalError, pending, isSuccess } = 
    useFormAction((formData) => createTaskAction(projectId, formData));
  
  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      status: 'TODO',
      priority: 'MEDIUM',
      tags: [],
    },
  });
  
  const onSubmit = (data: CreateTaskInput) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });
    formAction(formData);
  };
  
  if (isSuccess) {
    form.reset();
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {generalError && (
        <div className="alert alert-destructive" role="alert">
          {generalError}
        </div>
      )}
      
      <div>
        <label htmlFor="title" className="label">Title *</label>
        <Input
          id="title"
          {...form.register('title')}
          className={fieldErrors.title ? 'border-destructive' : ''}
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? 'title-error' : undefined}
        />
        {fieldErrors.title && (
          <p id="title-error" className="text-sm text-destructive mt-1" role="alert">
            {fieldErrors.title[0]}
          </p>
        )}
      </div>
      
      <div>
        <label htmlFor="description" className="label">Description</label>
        <Textarea
          id="description"
          {...form.register('description')}
          rows={4}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="status" className="label">Status</label>
          <Select
            id="status"
            {...form.register('status')}
            options={[
              { value: 'TODO', label: 'To Do' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'IN_REVIEW', label: 'In Review' },
              { value: 'DONE', label: 'Done' },
            ]}
          />
        </div>
        
        <div>
          <label htmlFor="priority" className="label">Priority</label>
          <Select
            id="priority"
            {...form.register('priority')}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' },
            ]}
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="dueDate" className="label">Due Date</label>
        <DatePicker
          id="dueDate"
          {...form.register('dueDate', { 
            valueAsDate: true 
          })}
        />
      </div>
      
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating...' : 'Create Task'}
      </Button>
    </form>
  );
}
```

### Client-Side Validation Helpers
```typescript
// shared/lib/validation.ts
import { z } from 'zod';

export function validateField<T>(
  schema: z.ZodType<T>,
  value: unknown
): string | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    return result.error.flatten().fieldErrors?._errors?.[0] || 'Invalid value';
  }
  return undefined;
}

export function validateForm<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: Record<string, unknown>
): Record<string, string> {
  const result = schema.safeParse(data);
  if (!result.success) {
    return result.error.flatten().fieldErrors as Record<string, string>;
  }
  return {};
}

// Real-time validation hook
export function useFieldValidation<T>(
  schema: z.ZodType<T>,
  value: T,
  onChange: (error: string | undefined) => void
) {
  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      const error = validateField(schema, value);
      onChange(error);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, schema, onChange]);
}
```

---

## Validation Error Formatting

### Zod Error Flattening
```typescript
// shared/lib/zodHelpers.ts
import { z } from 'zod';

export function formatZodError(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors;
}

export function getFirstFieldError(
  fieldErrors: Record<string, string[]>,
  fieldName: string
): string | undefined {
  return fieldErrors[fieldName]?.[0];
}

export function hasFieldError(
  fieldErrors: Record<string, string[]>,
  fieldName: string
): boolean {
  return !!fieldErrors[fieldName]?.length;
}
```

### Localized Error Messages
```typescript
// shared/schemas/messages.ts
import { z } from 'zod';

// Custom error map for Arabic/English
export const zodErrorMap: z.ZodErrorMap = (issue, ctx) => {
  const locale = ctx.data?.locale || 'en';
  const messages = locale === 'ar' ? arMessages : enMessages;
  
  switch (issue.code) {
    case 'invalid_type':
      return { message: messages.invalid_type(issue.expected, issue.received) };
    case 'invalid_string':
      if (issue.validation === 'email') return { message: messages.email };
      if (issue.validation === 'url') return { message: messages.url };
      if (issue.validation === 'uuid') return { message: messages.uuid };
      return { message: messages.invalid_string };
    case 'too_small':
      return { message: messages.too_small(issue.minimum, issue.type) };
    case 'too_big':
      return { message: messages.too_big(issue.maximum, issue.type) };
    case 'custom':
      return { message: issue.params?.message || messages.custom };
    default:
      return { message: ctx.defaultError };
  }
};

const enMessages = {
  invalid_type: (expected: string, received: string) => 
    `Expected ${expected}, received ${received}`,
  email: 'Invalid email address',
  url: 'Invalid URL',
  uuid: 'Invalid ID format',
  invalid_string: 'Invalid value',
  too_small: (min: number, type: string) => 
    type === 'string' ? `Must be at least ${min} characters` : `Must be at least ${min}`,
  too_big: (max: number, type: string) => 
    type === 'string' ? `Must be at most ${max} characters` : `Must be at most ${max}`,
  custom: 'Invalid value',
};

const arMessages = {
  invalid_type: (expected: string, received: string) => 
    `متوقع ${expected}, تم استلام ${received}`,
  email: 'بريد إلكتروني غير صالح',
  url: 'رابط غير صالح',
  uuid: 'تنسيق معرف غير صالح',
  invalid_string: 'قيمة غير صالحة',
  too_small: (min: number, type: string) => 
    type === 'string' ? `يجب أن يكون ${min} أحرف على الأقل` : `يجب أن يكون ${min} على الأقل`,
  too_big: (max: number, type: string) => 
    type === 'string' ? `يجب أن يكون ${max} أحرف على الأكثر` : `يجب أن يكون ${max} على الأكثر`,
  custom: 'قيمة غير صالحة',
};

// Set global error map
z.setErrorMap(zodErrorMap);
```

---

## Sanitization

### Input Sanitization
```typescript
// shared/lib/sanitize.ts
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;');
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\.+/g, '.')
    .substring(0, 255);
}

export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 100);
}

// Zod transform for sanitization
export const sanitizedString = z.string().transform(sanitizeHtml);
export const sanitizedFileName = z.string().transform(sanitizeFileName);
export const sanitizedSearch = z.string().transform(sanitizeSearchQuery);
```

---

## Testing Validation

### Schema Tests
```typescript
// features/tasks/schemas/__tests__/task.test.ts
import { createTaskSchema, updateTaskSchema } from '../task';
import { idSchema } from '@/shared/schemas/common';

describe('Task Schemas', () => {
  describe('createTaskSchema', () => {
    it('validates valid task data', () => {
      const data = {
        title: 'Test Task',
        description: 'Description',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: '2024-12-31T23:59:59.000Z',
        tags: ['tag1', 'tag2'],
      };
      
      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it('rejects empty title', () => {
      const data = { title: '', status: 'TODO' };
      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error.flatten().fieldErrors).toHaveProperty('title');
    });
    
    it('rejects title too long', () => {
      const data = { title: 'a'.repeat(201), status: 'TODO' };
      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
    
    it('rejects invalid status', () => {
      const data = { title: 'Test', status: 'INVALID' };
      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
    
    it('rejects invalid dueDate format', () => {
      const data = { title: 'Test', dueDate: 'invalid-date' };
      const result = createTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
  
  describe('updateTaskSchema', () => {
    it('allows partial updates', () => {
      const data = { id: 'valid-uuid', title: 'Updated' };
      const result = updateTaskSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it('requires id', () => {
      const data = { title: 'Updated' };
      const result = updateTaskSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error.flatten().fieldErrors).toHaveProperty('id');
    });
  });
});
```

---

## Validation Best Practices

| Practice | Description |
|----------|-------------|
| **Define schemas once** | Share between server/client via `shared/schemas` |
| **Use `safeParse`** | Never throw, always handle result |
| **Infer types** | `z.infer<typeof schema>` for TypeScript |
| **Validate at boundaries** | Server Actions, API routes, form submissions |
| **Localize messages** | Use Zod error map with locale |
| **Sanitize input** | Transform strings for XSS prevention |
| **Test schemas** | Unit test all validation rules |

---

## Summary

| Layer | Validation Method |
|-------|-------------------|
| **Shared** | Common schemas (`idSchema`, `emailSchema`, etc.) |
| **Features** | Feature-specific schemas with inferred types |
| **Server Actions** | `safeParse` → `ValidationError` in Result |
| **Route Handlers** | `safeParse` → throw `ValidationError` |
| **Client Forms** | React Hook Form + `zodResolver` |
| **Real-time** | Debounced `validateField` hook |
| **Localization** | Custom Zod error map |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*