# Testing Strategy

## Overview

This document defines the testing architecture covering unit tests, integration tests, end-to-end tests, and testing utilities for the project management platform.

---

## Testing Pyramid

```
                    ┌─────────────┐
                    │   E2E       │  Few, critical paths
                    │  (Playwright)│
                  ┌───────────────┐
                  │  Integration  │  Some, feature flows
                  │  (Vitest)     │
                ┌───────────────────┐
                │      Unit         │  Many, isolated logic
                │    (Vitest)       │
              ┌───────────────────────┐
              │   Static Analysis     │  Every commit
              │  (TypeScript, ESLint) │
            ┌───────────────────────────┐
```

---

## Technology Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **Unit** | Vitest + React Testing Library | Component & logic testing |
| **Integration** | Vitest + MSW | API & service testing |
| **E2E** | Playwright | Critical user flows |
| **Static** | TypeScript, ESLint, Prettier | Code quality |
| **Coverage** | Vitest Coverage (v8) | Coverage reports |

---

## Project Structure

```
tests/
├── unit/                    # Unit tests (mirrors src/)
│   ├── shared/
│   │   ├── lib/
│   │   ├── components/
│   │   └── hooks/
│   └── features/
│       └── [feature]/
├── integration/             # Integration tests
│   ├── api/
│   ├── actions/
│   └── services/
├── e2e/                     # Playwright E2E tests
│   ├── auth/
│   ├── projects/
│   ├── tasks/
│   └── fixtures/
├── utils/                   # Test utilities
│   ├── factories/           # Test data factories
│   ├── mocks/               # MSW handlers
│   ├── helpers/             # Custom render, etc.
│   └── setup.ts             # Global test setup
└── playwright.config.ts
```

---

## Unit Testing

### Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/utils/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup
```typescript
// tests/utils/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/en/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  getTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

// Mock Supabase
vi.mock('@/shared/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

### Component Testing
```typescript
// tests/unit/shared/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/shared/components/ui/Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
  
  it('handles click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('shows loading state', () => {
    render(<Button loading>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
  
  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });
});
```

### Hook Testing
```typescript
// tests/unit/shared/hooks/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('returns initial value', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('default');
  });
  
  it('persists value', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    
    act(() => {
      result.current[1]('new value');
    });
    
    expect(result.current[0]).toBe('new value');
    expect(localStorage.getItem('key')).toBe('"new value"');
  });
  
  it('handles JSON parsing', () => {
    localStorage.setItem('key', '"stored value"');
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('stored value');
  });
});
```

### Utility Testing
```typescript
// tests/unit/shared/lib/utils.test.ts
import { cn, formatDate, formatRelativeTime } from '@/shared/lib/utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });
  
  it('handles conditional classes', () => {
    expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
  });
});

describe('formatDate', () => {
  it('formats date in English', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date, 'en')).toBe('Jan 15, 2024');
  });
  
  it('formats date in Arabic', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date, 'ar')).toContain('٢٠٢٤');
  });
});
```

---

## Integration Testing

### Server Action Testing
```typescript
// tests/integration/actions/createTask.test.ts
import { createTaskAction } from '@/features/tasks/actions/createTask';
import { getCurrentUser } from '@/features/auth/actions/getCurrentUser';
import { permissionService } from '@/shared/services/permissionService';
import { taskService } from '@/features/tasks/services/taskService';

jest.mock('@/features/auth/actions/getCurrentUser');
jest.mock('@/shared/services/permissionService');
jest.mock('@/features/tasks/services/taskService');

describe('createTaskAction', () => {
  const mockUser = { id: 'user-1', fullName: 'Test User' };
  const mockTask = { id: 'task-1', title: 'Test Task' };
  
  beforeEach(() => {
    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (permissionService.can as jest.Mock).mockResolvedValue(true);
    (taskService.createTask as jest.Mock).mockResolvedValue(mockTask);
  });
  
  it('creates task successfully', async () => {
    const formData = new FormData();
    formData.append('title', 'Test Task');
    formData.append('status', 'TODO');
    formData.append('priority', 'MEDIUM');
    
    const result = await createTaskAction('project-1', formData);
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockTask);
    expect(taskService.createTask).toHaveBeenCalledWith('user-1', expect.objectContaining({
      projectId: 'project-1',
      title: 'Test Task',
    }));
  });
  
  it('returns ValidationError for invalid input', async () => {
    const formData = new FormData();
    formData.append('title', ''); // Invalid
    
    const result = await createTaskAction('project-1', formData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ValidationError);
  });
  
  it('returns ForbiddenError when no permission', async () => {
    (permissionService.can as jest.Mock).mockResolvedValue(false);
    
    const formData = new FormData();
    formData.append('title', 'Valid');
    
    const result = await createTaskAction('project-1', formData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ForbiddenError);
  });
});
```

### Service Testing
```typescript
// tests/integration/services/taskService.test.ts
import { taskService } from '@/features/tasks/services/taskService';
import { createServerClient } from '@/shared/lib/supabase/server';

jest.mock('@/shared/lib/supabase/server');

describe('taskService', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };
  
  (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  
  describe('createTask', () => {
    it('creates task with user', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ 
        data: { id: 'task-1', title: 'Test' }, 
        error: null 
      });
      
      const task = await taskService.createTask('user-1', { 
        projectId: 'project-1', 
        title: 'Test' 
      });
      
      expect(task.id).toBe('task-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });
  });
  
  describe('findById', () => {
    it('returns task when found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { id: 'task-1', title: 'Test' }, 
        error: null 
      });
      
      const task = await taskService.findById('task-1');
      
      expect(task).toEqual({ id: 'task-1', title: 'Test' });
    });
    
    it('returns null when not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });
      
      const task = await taskService.findById('task-1');
      
      expect(task).toBeNull();
    });
  });
});
```

### API Route Testing (with MSW)
```typescript
// tests/integration/api/tasks.test.ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { GET, POST } from '@/app/api/tasks/route';

const server = setupServer(
  http.get('/api/tasks', () => {
    return HttpResponse.json([{ id: '1', title: 'Task 1' }]);
  }),
  http.post('/api/tasks', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '2', ...body }, { status: 201 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Tasks API', () => {
  it('GET returns tasks', async () => {
    const request = new Request('http://localhost/api/tasks');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });
  
  it('POST creates task', async () => {
    const request = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'New Task' }),
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(201);
    expect(data.title).toBe('New Task');
  });
});
```

---

## End-to-End Testing

### Playwright Configuration
```typescript
// tests/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Authentication Fixtures
```typescript
// tests/e2e/fixtures/auth.ts
import { test as base, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

interface AuthFixtures {
  authenticatedPage: Page;
  adminPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login via API
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });
    
    // Set auth cookies
    const { data: { session } } = await supabase.auth.getSession();
    
    await page.context().addCookies([
      { name: 'sb-access-token', value: session?.access_token || '', domain: 'localhost', path: '/' },
      { name: 'sb-refresh-token', value: session?.refresh_token || '', domain: 'localhost', path: '/' },
    ]);
    
    await use(page);
  },
  
  adminPage: async ({ page }, use) => {
    // Similar but with admin user
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

### E2E Test Examples
```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from './fixtures/auth';

test.describe('Authentication', () => {
  test('user can sign in', async ({ page }) => {
    await page.goto('/en/login');
    
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/en/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
  
  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/en/login');
    
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

```typescript
// tests/e2e/projects/create.spec.ts
import { test, expect } from './fixtures/auth';

test.describe('Projects', () => {
  test('user can create project', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/en/projects');
    await page.click('text=Create Project');
    
    await page.fill('[name="name"]', 'Test Project');
    await page.fill('[name="key"]', 'TEST');
    await page.fill('[name="description"]', 'Project description');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/en\/projects\/[a-z0-9-]+/);
    await expect(page.locator('text=Test Project')).toBeVisible();
  });
  
  test('user can invite member', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/en/projects/test-project/members');
    await page.click('text=Invite Member');
    
    await page.fill('[name="email"]', 'newmember@example.com');
    await page.selectOption('[name="role"]', 'MEMBER');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=newmember@example.com')).toBeVisible();
  });
});
```

```typescript
// tests/e2e/tasks/board.spec.ts
import { test, expect } from './fixtures/auth';

test.describe('Task Board', () => {
  test('user can drag and drop task', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/en/projects/test-project/tasks');
    
    // Wait for board to load
    await expect(page.locator('[data-column="TODO"]')).toBeVisible();
    
    // Drag task from TODO to IN_PROGRESS
    const task = page.locator('[data-task-id="task-1"]').first();
    const targetColumn = page.locator('[data-column="IN_PROGRESS"]');
    
    await task.dragTo(targetColumn);
    
    // Verify task moved
    await expect(targetColumn.locator('[data-task-id="task-1"]')).toBeVisible();
  });
  
  test('user can create task from board', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    
    await page.goto('/en/projects/test-project/tasks');
    await page.click('[data-column="TODO"] button:has-text("Add Task")');
    
    await page.fill('[name="title"]', 'New Task from Board');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=New Task from Board')).toBeVisible();
  });
});
```

---

## Test Data Factories

### Factory Utilities
```typescript
// tests/utils/factories/index.ts
import { faker } from '@faker-js/faker';

export const factories = {
  user: (overrides = {}) => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    fullName: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    role: 'USER',
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  }),
  
  project: (overrides = {}) => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    key: faker.string.alphanumeric(4).toUpperCase(),
    description: faker.lorem.sentence(),
    status: 'ACTIVE',
    ownerId: faker.string.uuid(),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  }),
  
  task: (overrides = {}) => ({
    id: faker.string.uuid(),
    title: faker.lorem.words(4),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
    priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    projectId: faker.string.uuid(),
    assigneeId: faker.string.uuid(),
    dueDate: faker.date.future().toISOString(),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  }),
  
  member: (overrides = {}) => ({
    userId: faker.string.uuid(),
    projectId: faker.string.uuid(),
    role: faker.helpers.arrayElement(['ADMIN', 'MEMBER', 'VIEWER']),
    joinedAt: faker.date.past().toISOString(),
    ...overrides,
  }),
  
  notification: (overrides = {}) => ({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    projectId: faker.string.uuid(),
    type: 'TASK_ASSIGNED',
    title: 'Test Notification',
    message: faker.lorem.sentence(),
    readAt: null,
    createdAt: faker.date.recent().toISOString(),
    ...overrides,
  }),
};
```

---

## Mocking Strategy

### MSW Handlers
```typescript
// tests/utils/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { factories } from '../factories';

export const handlers = [
  // Auth
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: factories.user({ email: body.email }),
        session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
      });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),
  
  // Projects
  http.get('/api/projects', () => {
    return HttpResponse.json(Array.from({ length: 5 }, () => factories.project()));
  }),
  
  http.post('/api/projects', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(factories.project(body), { status: 201 });
  }),
  
  // Tasks
  http.get('/api/projects/:projectId/tasks', ({ params }) => {
    return HttpResponse.json(Array.from({ length: 10 }, () => factories.task({ projectId: params.projectId })));
  }),
  
  // Notifications
  http.get('/api/notifications', () => {
    return HttpResponse.json({
      notifications: Array.from({ length: 3 }, () => factories.notification()),
      unreadCount: 3,
    });
  }),
];
```

---

## Coverage Requirements

### Minimum Coverage
```json
// package.json
{
  "vitest": {
    "coverage": {
      "thresholds": {
        "lines": 70,
        "functions": 70,
        "branches": 50,
        "statements": 70
      }
    }
  }
}
```

### Coverage by Layer
| Layer | Target | Critical Paths |
|-------|--------|----------------|
| **Shared Utils** | 90% | All utilities |
| **Shared Components** | 80% | Button, Input, Modal, etc. |
| **Hooks** | 80% | All custom hooks |
| **Services** | 70% | Business logic |
| **Server Actions** | 70% | Mutations |
| **API Routes** | 60% | Endpoints |

---

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
```

---

## Testing Best Practices

| Practice | Description |
|----------|-------------|
| **Test Behavior, Not Implementation** | Test what the user sees/does |
| **Use Descriptive Names** | `should create task when valid data provided` |
| **Arrange-Act-Assert** | Clear test structure |
| **One Assertion Per Test** | When possible |
| **Mock at Boundaries** | Mock external dependencies |
| **Don't Test Framework Code** | Test your logic, not React/Next.js |
| **Clean Up** | Reset mocks, clear storage between tests |
| **Deterministic Tests** | No random data, no flaky tests |

---

## Debugging Tests

### VS Code Launch Config
```json
// .vscode/launch.json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${file}"],
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Playwright",
      "program": "${workspaceFolder}/node_modules/@playwright/test/cli.js",
      "args": ["test", "${file}"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Summary

| Test Type | Tool | Coverage Target | When to Run |
|-----------|------|-----------------|-------------|
| **Static** | TypeScript, ESLint | 100% | Every commit |
| **Unit** | Vitest + RTL | 70-90% | Every commit |
| **Integration** | Vitest + MSW | 60-70% | PR / CI |
| **E2E** | Playwright | Critical paths | PR / CI / Nightly |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*