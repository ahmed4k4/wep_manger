# Error Handling Strategy

## Overview

This document defines the error handling architecture for consistent, user-friendly, and debuggable error management across the application.

---

## Error Classification

### Error Types

| Type | Description | HTTP Status | User Facing |
|------|-------------|-------------|-------------|
| **ValidationError** | Input validation failed | 400 | Yes (field errors) |
| **AuthenticationError** | Not authenticated | 401 | Yes (redirect to login) |
| **ForbiddenError** | Authenticated but not authorized | 403 | Yes (generic message) |
| **NotFoundError** | Resource not found | 404 | Yes (friendly message) |
| **ConflictError** | Resource conflict (duplicate) | 409 | Yes (specific message) |
| **RateLimitError** | Too many requests | 429 | Yes (retry after) |
| **ServerError** | Unexpected server error | 500 | Generic message |
| **ServiceUnavailableError** | External service down | 503 | Yes (try later) |

---

## Error Classes

### Base Error Class
```typescript
// shared/errors/AppError.ts
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    this.timestamp = new Date();
    
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Specific Error Classes
```typescript
// shared/errors/ValidationError.ts
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(fieldErrors: Record<string, string[]>, message = 'Validation failed') {
    super(message, 'VALIDATION_ERROR', 400, { fieldErrors });
    this.fieldErrors = fieldErrors;
  }
}

// shared/errors/AuthenticationError.ts
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

// shared/errors/ForbiddenError.ts
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 'FORBIDDEN', 403);
  }
}

// shared/errors/NotFoundError.ts
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404, { resource });
  }
}

// shared/errors/ConflictError.ts
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT', 409, details);
  }
}

// shared/errors/RateLimitError.ts
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number, message = 'Too many requests') {
    super(message, 'RATE_LIMIT', 429, { retryAfter });
    this.retryAfter = retryAfter;
  }
}

// shared/errors/ServerError.ts
export class ServerError extends AppError {
  constructor(message = 'An unexpected error occurred', details?: Record<string, any>) {
    super(message, 'SERVER_ERROR', 500, details);
    this.isOperational = false; // Not expected, needs investigation
  }
}
```

---

## Error Handling in Server Actions

### Result Pattern
```typescript
// shared/lib/result.ts
export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function err<E extends AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}
```

### Server Action Error Handling
```typescript
// features/tasks/actions/createTask.ts
'use server';

import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { permissionService } from '@/shared/services/permissionService';
import { taskService } from '../services/taskService';
import { createTaskSchema } from '../schemas/createTask';
import { ok, err, Result } from '@/shared/lib/result';
import { ValidationError, ForbiddenError, ServerError } from '@/shared/errors';

export async function createTaskAction(
  projectId: string, 
  formData: FormData
): Promise<Result<Task, ValidationError | ForbiddenError | ServerError>> {
  try {
    // Authentication
    const user = await getCurrentUser();
    if (!user) return err(new AuthenticationError());
    
    // Authorization
    const canCreate = await permissionService.can(user.id, 'tasks:create', { projectId });
    if (!canCreate) return err(new ForbiddenError('Cannot create tasks in this project'));
    
    // Validation
    const rawData = Object.fromEntries(formData.entries());
    const validated = createTaskSchema.safeParse(rawData);
    if (!validated.success) {
      return err(new ValidationError(validated.error.flatten().fieldErrors));
    }
    
    // Business logic
    const task = await taskService.createTask(user.id, { ...validated.data, projectId });
    
    // Revalidate
    revalidatePath(`/projects/${projectId}`);
    
    return ok(task);
  } catch (error) {
    // Log unexpected errors
    console.error('createTaskAction error:', error);
    
    if (error instanceof AppError) {
      return err(error);
    }
    
    return err(new ServerError('Failed to create task', { originalError: String(error) }));
  }
}
```

---

## Error Handling in Route Handlers (API)

### Centralized Error Handler
```typescript
// app/api/_lib/errorHandler.ts
import { NextRequest, NextResponse } from 'next/server';
import { AppError, ValidationError, AuthenticationError, ForbiddenError, NotFoundError, ConflictError, RateLimitError, ServerError } from '@/shared/errors';
import { logger } from '@/shared/lib/logger';

export function handleApiError(error: unknown): NextResponse {
  // Log all errors
  logger.error('API Error', { 
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  
  // Known operational errors
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { 
        error: 'Validation failed',
        code: error.code,
        fieldErrors: error.fieldErrors,
      },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof ConflictError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message, code: error.code, retryAfter: error.retryAfter },
      { 
        status: error.statusCode,
        headers: { 'Retry-After': String(error.retryAfter) },
      }
    );
  }
  
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  // Unknown errors - don't leak details
  return NextResponse.json(
    { error: 'Internal server error', code: 'SERVER_ERROR' },
    { status: 500 }
  );
}
```

### Wrapper for Route Handlers
```typescript
// app/api/_lib/withErrorHandling.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from './errorHandler';

type Handler = (request: NextRequest, context?: any) => Promise<NextResponse>;

export function withErrorHandling(handler: Handler): Handler {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Usage
// app/api/tasks/route.ts
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const task = await taskService.createTask(userId, body);
  return NextResponse.json(task, { status: 201 });
});
```

---

## Error Handling in Server Components

### Error Boundaries (Client Components)
```typescript
// shared/components/error/ErrorBoundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useTranslations } from 'next-intl';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    
    // Send to error tracking service
    if (typeof window !== 'undefined') {
      // window.Sentry?.captureException(error);
    }
  }
  
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return <DefaultErrorFallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}

// Default fallback
function DefaultErrorFallback({ error }: { error: Error | null }) {
  const t = useTranslations('errors');
  
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">{t('somethingWentWrong')}</h2>
      <p className="text-muted-foreground mb-4 max-w-md">
        {error?.message || t('unexpectedError')}
      </p>
      <Button onClick={() => window.location.reload()}>
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('tryAgain')}
      </Button>
    </div>
  );
}
```

### Page-Level Error (Server Component)
```typescript
// app/[locale]/projects/[projectId]/error.tsx
'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-2xl font-bold mb-2">{t('failedToLoadProject')}</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t('projectLoadError')}
      </p>
      <div className="flex gap-4">
        <Button onClick={reset}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('tryAgain')}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/dashboard`}>{t('backToDashboard')}</Link>
        </Button>
      </div>
    </div>
  );
}
```

---

## Error Handling in Client Components

### Toast Notifications
```typescript
// shared/lib/toast.ts
'use client';

import { toast as sonnerToast, Toaster } from 'sonner';
import { useTranslations } from 'next-intl';

export function useToast() {
  const t = useTranslations('common');
  
  return {
    success: (message?: string) => sonnerToast.success(message || t('saved')),
    error: (message?: string, error?: Error) => {
      sonnerToast.error(message || t('error'), {
        description: error?.message,
        action: error instanceof Error ? {
          label: t('dismiss'),
          onClick: () => {},
        } : undefined,
      });
    },
    warning: (message: string) => sonnerToast.warning(message),
    info: (message: string) => sonnerToast.info(message),
    promise: <T>(promise: Promise<T>, messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }) => sonnerToast.promise(promise, messages),
  };
}

// Toast provider in layout
// app/[locale]/layout.tsx
import { Toaster } from 'sonner';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster 
        position="top-right"
        toastOptions={{
          classNames: {
            toast: 'group',
            description: 'group-has-[[data-toast=error]]:text-destructive',
          },
        }}
      />
    </>
  );
}
```

### Form Error Handling
```typescript
// shared/hooks/useFormError.ts
'use client';

import { useActionState } from 'react';
import { ValidationError } from '@/shared/errors';
import { Result } from '@/shared/lib/result';

export function useFormAction<T, Args extends any[]>(
  action: (...args: Args) => Promise<Result<T>>
) {
  const [state, formAction, pending] = useActionState(
    async (prevState: Result<T> | null, formData: FormData) => {
      return action(formData);
    },
    null
  );
  
  const fieldErrors = state && !state.success && state.error instanceof ValidationError
    ? state.error.fieldErrors
    : {};
  
  const generalError = state && !state.success && !(state.error instanceof ValidationError)
    ? state.error.message
    : null;
  
  return {
    state,
    formAction,
    pending,
    fieldErrors,
    generalError,
    isSuccess: state?.success === true,
  };
}

// Usage in component
function CreateTaskForm({ projectId }: { projectId: string }) {
  const { formAction, fieldErrors, generalError, pending, isSuccess } = 
    useFormAction((formData) => createTaskAction(projectId, formData));
  
  return (
    <form action={formAction} className="space-y-4">
      {generalError && (
        <div className="alert alert-error">{generalError}</div>
      )}
      
      <div>
        <label className="label">Title</label>
        <input name="title" className="input" />
        {fieldErrors.title && (
          <p className="text-sm text-destructive">{fieldErrors.title[0]}</p>
        )}
      </div>
      
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating...' : 'Create Task'}
      </Button>
    </form>
  );
}
```

---

## Error Logging

### Structured Logger
```typescript
// shared/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  requestId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    };
    
    // Console output
    if (this.isDevelopment || level === 'error' || level === 'warn') {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context || '', error || '');
    }
    
    // In production, send to external service
    if (!this.isDevelopment) {
      this.sendToService(entry);
    }
  }
  
  private sendToService(entry: LogEntry) {
    // Send to Sentry, LogRocket, Datadog, etc.
    // fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) });
  }
  
  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }
  
  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: Record<string, any>, error?: Error) {
    this.log('warn', message, context, error);
  }
  
  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log('error', message, context, error);
  }
}

export const logger = new Logger();
```

### Request ID Tracking
```typescript
// middleware.ts (addition)
import { v4 as uuidv4 } from 'uuid';

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || uuidv4();
  
  const response = NextResponse.next({ request });
  response.headers.set('x-request-id', requestId);
  
  // ... rest of middleware
  
  return response;
}

// In logger
logger.error('Database connection failed', { 
  requestId: headers().get('x-request-id'),
  userId: user?.id,
});
```

---

## User-Facing Error Messages

### Message Mapping
```typescript
// shared/lib/errorMessages.ts
import { useTranslations } from 'next-intl';

export function getUserErrorMessage(error: unknown, t: ReturnType<typeof useTranslations>): string {
  if (error instanceof ValidationError) {
    return t('validationFailed');
  }
  
  if (error instanceof AuthenticationError) {
    return t('unauthorized');
  }
  
  if (error instanceof ForbiddenError) {
    return t('forbidden');
  }
  
  if (error instanceof NotFoundError) {
    return t('notFound');
  }
  
  if (error instanceof ConflictError) {
    return error.message; // Usually specific enough
  }
  
  if (error instanceof RateLimitError) {
    return t('rateLimited');
  }
  
  if (error instanceof AppError) {
    return error.message;
  }
  
  // Unknown error
  return t('unexpectedError');
}
```

---

## Error Recovery Strategies

### Retry Logic
```typescript
// shared/lib/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries: number; delay: number; backoff?: number } = { retries: 3, delay: 1000 }
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= options.retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i === options.retries) break;
      
      const delay = options.delay * Math.pow(options.backoff || 2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Usage
const data = await withRetry(() => fetchData(), { retries: 3, delay: 1000 });
```

### Fallback UI
```typescript
// shared/components/ui/DataWithFallback.tsx
'use client';

import { Suspense, ReactNode } from 'react';
import { Skeleton } from '@/shared/ui/skeleton';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useTranslations } from 'next-intl';

interface DataWithFallbackProps<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  children: (data: T) => ReactNode;
  fallback?: ReactNode;
  skeleton?: ReactNode;
  onRetry?: () => void;
}

export function DataWithFallback<T>({ 
  data, 
  error, 
  isLoading, 
  children, 
  fallback,
  skeleton,
  onRetry 
}: DataWithFallbackProps<T>) {
  const t = useTranslations('common');
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        {skeleton || (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
      </div>
    );
  }
  
  if (error) {
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">{t('failedToLoad')}</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          {error.message}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('tryAgain')}
          </Button>
        )}
      </div>
    );
  }
  
  if (!data) {
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p>{t('noData')}</p>
      </div>
    );
  }
  
  return <>{children(data)}</>;
}
```

---

## Testing Error Handling

### Unit Tests
```typescript
// shared/errors/__tests__/AppError.test.ts
import { ValidationError, AuthenticationError, ForbiddenError, NotFoundError } from '../AppError';

describe('AppError', () => {
  describe('ValidationError', () => {
    it('creates error with field errors', () => {
      const error = new ValidationError({ email: ['Invalid email'] });
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.fieldErrors).toEqual({ email: ['Invalid email'] });
    });
  });
  
  describe('AuthenticationError', () => {
    it('creates error with 401 status', () => {
      const error = new AuthenticationError();
      
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
    });
  });
});
```

### Integration Tests
```typescript
// features/tasks/actions/__tests__/createTask.test.ts
import { createTaskAction } from '../createTask';
import { ValidationError, ForbiddenError } from '@/shared/errors';

jest.mock('@/features/auth/actions/getCurrentUser');
jest.mock('@/shared/services/permissionService');

describe('createTaskAction', () => {
  it('returns ValidationError for invalid input', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user-1' });
    (permissionService.can as jest.Mock).mockResolvedValue(true);
    
    const formData = new FormData();
    formData.append('title', ''); // Invalid - empty
    
    const result = await createTaskAction('project-1', formData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ValidationError);
    expect((result.error as ValidationError).fieldErrors).toHaveProperty('title');
  });
  
  it('returns ForbiddenError when no permission', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'user-1' });
    (permissionService.can as jest.Mock).mockResolvedValue(false);
    
    const formData = new FormData();
    formData.append('title', 'Valid title');
    
    const result = await createTaskAction('project-1', formData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ForbiddenError);
  });
});
```

---

## Summary

| Layer | Error Handling |
|-------|----------------|
| **Server Actions** | Result pattern with typed errors |
| **Route Handlers** | Centralized `handleApiError` wrapper |
| **Server Components** | Error boundaries + `error.tsx` pages |
| **Client Components** | Toast notifications + form error states |
| **Logging** | Structured logger with request tracking |
| **Recovery** | Retry logic + fallback UI components |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*