# Internationalization (i18n) & RTL/LTR Support

## Overview

This document defines the internationalization architecture supporting **Arabic (RTL)** and **English (LTR)** with full locale-aware routing, formatting, and UI adaptation.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Routing** | `next-intl` (App Router compatible) |
| **Translations** | JSON files per locale |
| **Formatting** | `Intl` API (dates, numbers, currencies) |
| **RTL Support** | Tailwind CSS `rtl` variant + logical properties |
| **Locale Detection** | Middleware (cookie + header + path) |

---

## Locale Configuration

### Supported Locales
```typescript
// shared/lib/i18n/config.ts
export const LOCALES = ['en', 'ar'] as const;
export type Locale = typeof LOCALES[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
};

export const LOCALE_DIR: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
};

export const DATE_FORMATS: Record<Locale, Intl.DateTimeFormatOptions> = {
  en: { dateStyle: 'medium' },
  ar: { dateStyle: 'medium', calendar: 'gregory' },
};

export const NUMBER_FORMATS: Record<Locale, Intl.NumberFormatOptions> = {
  en: { notation: 'compact' },
  ar: { notation: 'compact' },
};
```

### Routing Configuration
```typescript
// shared/lib/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';
import { LOCALES, DEFAULT_LOCALE } from './config';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always', // /en/dashboard, /ar/dashboard
  pathnames: {
    '/': '/',
    '/login': '/login',
    '/register': '/register',
    '/dashboard': '/dashboard',
    '/projects/[projectId]': '/projects/[projectId]',
    '/admin': '/admin',
    '/profile': '/profile',
    '/settings': '/settings',
  },
});
```

---

## Middleware Integration

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { updateSession } from '@/shared/lib/supabase/middleware';
import { routing } from '@/shared/lib/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. Run i18n middleware first (locale detection, redirects)
  const intlResponse = intlMiddleware(request);
  
  // 2. Run Supabase auth middleware
  const authResponse = await updateSession(request);
  
  // Combine headers (cookies from both)
  const response = NextResponse.next({ request });
  
  // Copy cookies from both responses
  intlResponse.cookies.getAll().forEach(c => response.cookies.set(c));
  authResponse.cookies.getAll().forEach(c => response.cookies.set(c));
  
  // Copy headers
  intlResponse.headers.forEach((v, k) => response.headers.set(k, v));
  authResponse.headers.forEach((v, k) => response.headers.set(k, v));
  
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
```

---

## Translation Files Structure

```
messages/
├── en.json
└── ar.json
```

### English (`en.json`)
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "search": "Search",
    "filter": "Filter",
    "loading": "Loading...",
    "empty": "No data available",
    "error": "An error occurred",
    "confirm": "Confirm",
    "yes": "Yes",
    "no": "No"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "projects": "Projects",
    "tasks": "Tasks",
    "members": "Members",
    "files": "Files",
    "notes": "Notes",
    "activity": "Activity",
    "settings": "Settings",
    "profile": "Profile",
    "notifications": "Notifications",
    "admin": "Admin"
  },
  "auth": {
    "login": "Sign In",
    "register": "Create Account",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "fullName": "Full Name",
    "forgotPassword": "Forgot Password?",
    "resetPassword": "Reset Password",
    "magicLink": "Send Magic Link",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "signUp": "Sign Up",
    "signIn": "Sign In"
  },
  "projects": {
    "title": "Projects",
    "createProject": "Create Project",
    "projectKey": "Project Key",
    "projectName": "Project Name",
    "description": "Description",
    "status": "Status",
    "active": "Active",
    "archived": "Archived",
    "onHold": "On Hold",
    "owner": "Owner",
    "members": "Members",
    "tasks": "Tasks",
    "noProjects": "No projects yet",
    "createFirst": "Create your first project"
  },
  "tasks": {
    "title": "Tasks",
    "createTask": "Create Task",
    "taskTitle": "Task Title",
    "description": "Description",
    "status": "Status",
    "priority": "Priority",
    "assignee": "Assignee",
    "dueDate": "Due Date",
    "todo": "To Do",
    "inProgress": "In Progress",
    "inReview": "In Review",
    "done": "Done",
    "low": "Low",
    "medium": "Medium",
    "high": "High",
    "urgent": "Urgent",
    "noTasks": "No tasks yet",
    "dragToReorder": "Drag to reorder"
  },
  "members": {
    "title": "Members",
    "inviteMember": "Invite Member",
    "email": "Email",
    "role": "Role",
    "owner": "Owner",
    "admin": "Admin",
    "member": "Member",
    "viewer": "Viewer",
    "remove": "Remove",
    "changeRole": "Change Role",
    "you": "(You)"
  },
  "files": {
    "title": "Files",
    "uploadFile": "Upload File",
    "dragDrop": "Drag and drop files here",
    "orClick": "or click to browse",
    "maxSize": "Max 50MB",
    "allowedTypes": "Images, PDF, Documents, Archives",
    "name": "Name",
    "size": "Size",
    "uploadedBy": "Uploaded By",
    "date": "Date"
  },
  "notes": {
    "title": "Notes",
    "createNote": "Create Note",
    "noteTitle": "Note Title",
    "content": "Content",
    "private": "Private Note",
    "privateDescription": "Only visible to you and project admins",
    "noNotes": "No notes yet"
  },
  "activity": {
    "title": "Activity Log",
    "noActivity": "No activity yet",
    "justNow": "Just now",
    "minutesAgo": "{{count}} minutes ago",
    "hoursAgo": "{{count}} hours ago",
    "daysAgo": "{{count}} days ago"
  },
  "notifications": {
    "title": "Notifications",
    "markAllRead": "Mark All Read",
    "markRead": "Mark Read",
    "noNotifications": "No notifications",
    "unreadCount": "{{count}} unread"
  },
  "settings": {
    "title": "Settings",
    "profile": "Profile",
    "appearance": "Appearance",
    "language": "Language",
    "theme": "Theme",
    "notifications": "Notifications",
    "languageLabel": "Language",
    "themeLabel": "Theme",
    "light": "Light",
    "dark": "Dark",
    "system": "System"
  },
  "errors": {
    "unauthorized": "Unauthorized",
    "forbidden": "You don't have permission",
    "notFound": "Not found",
    "validationFailed": "Validation failed",
    "serverError": "Server error",
    "networkError": "Network error"
  }
}
```

### Arabic (`ar.json`)
```json
{
  "common": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "create": "إنشاء",
    "search": "بحث",
    "filter": "تصفية",
    "loading": "جاري التحميل...",
    "empty": "لا توجد بيانات",
    "error": "حدث خطأ",
    "confirm": "تأكيد",
    "yes": "نعم",
    "no": "لا"
  },
  "navigation": {
    "dashboard": "لوحة التحكم",
    "projects": "المشاريع",
    "tasks": "المهام",
    "members": "الأعضاء",
    "files": "الملفات",
    "notes": "الملاحظات",
    "activity": "سجل النشاط",
    "settings": "الإعدادات",
    "profile": "الملف الشخصي",
    "notifications": "الإشعارات",
    "admin": "الإدارة"
  },
  "auth": {
    "login": "تسجيل الدخول",
    "register": "إنشاء حساب",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "confirmPassword": "تأكيد كلمة المرور",
    "fullName": "الاسم الكامل",
    "forgotPassword": "نسيت كلمة المرور؟",
    "resetPassword": "إعادة تعيين كلمة المرور",
    "magicLink": "إرسال رابط سحري",
    "noAccount": "ليس لديك حساب؟",
    "hasAccount": "لديك حساب بالفعل؟",
    "signUp": "تسجيل",
    "signIn": "دخول"
  },
  "projects": {
    "title": "المشاريع",
    "createProject": "إنشاء مشروع",
    "projectKey": "مفتاح المشروع",
    "projectName": "اسم المشروع",
    "description": "الوصف",
    "status": "الحالة",
    "active": "نشط",
    "archived": "مؤرشف",
    "onHold": "معلق",
    "owner": "المالك",
    "members": "الأعضاء",
    "tasks": "المهام",
    "noProjects": "لا توجد مشاريع بعد",
    "createFirst": "إنشاء أول مشروع لك"
  },
  "tasks": {
    "title": "المهام",
    "createTask": "إنشاء مهمة",
    "taskTitle": "عنوان المهمة",
    "description": "الوصف",
    "status": "الحالة",
    "priority": "الأولوية",
    "assignee": "المُكلف",
    "dueDate": "تاريخ الاستحقاق",
    "todo": "قيد الانتظار",
    "inProgress": "قيد التنفيذ",
    "inReview": "قيد المراجعة",
    "done": "مكتمل",
    "low": "منخفضة",
    "medium": "متوسطة",
    "high": "عالية",
    "urgent": "عاجلة",
    "noTasks": "لا توجد مهام بعد",
    "dragToReorder": "اسحب لإعادة الترتيب"
  },
  "members": {
    "title": "الأعضاء",
    "inviteMember": "دعوة عضو",
    "email": "البريد الإلكتروني",
    "role": "الدور",
    "owner": "المالك",
    "admin": "مدير",
    "member": "عضو",
    "viewer": "مشاهد",
    "remove": "إزالة",
    "changeRole": "تغيير الدور",
    "you": "(أنت)"
  },
  "files": {
    "title": "الملفات",
    "uploadFile": "رفع ملف",
    "dragDrop": "اسحب الملفات وأفلتها هنا",
    "orClick": "أو انقر للتصفح",
    "maxSize": "الحد الأقصى 50 ميجابايت",
    "allowedTypes": "صور، PDF، مستندات، أرشيفات",
    "name": "الاسم",
    "size": "الحجم",
    "uploadedBy": "تم الرفع بواسطة",
    "date": "التاريخ"
  },
  "notes": {
    "title": "الملاحظات",
    "createNote": "إنشاء ملاحظة",
    "noteTitle": "عنوان الملاحظة",
    "content": "المحتوى",
    "private": "ملاحظة خاصة",
    "privateDescription": "مرئية لك وللمديرين فقط",
    "noNotes": "لا توجد ملاحظات بعد"
  },
  "activity": {
    "title": "سجل النشاط",
    "noActivity": "لا يوجد نشاط بعد",
    "justNow": "الآن",
    "minutesAgo": "منذ {{count}} دقيقة",
    "hoursAgo": "منذ {{count}} ساعة",
    "daysAgo": "منذ {{count}} يوم"
  },
  "notifications": {
    "title": "الإشعارات",
    "markAllRead": "تمييز الكل كمقروء",
    "markRead": "تمييز كمقروء",
    "noNotifications": "لا توجد إشعارات",
    "unreadCount": "{{count}} غير مقروء"
  },
  "settings": {
    "title": "الإعدادات",
    "profile": "الملف الشخصي",
    "appearance": "المظهر",
    "language": "اللغة",
    "theme": "السمة",
    "notifications": "الإشعارات",
    "languageLabel": "اللغة",
    "themeLabel": "السمة",
    "light": "فاتح",
    "dark": "داكن",
    "system": "النظام"
  },
  "errors": {
    "unauthorized": "غير مصرح",
    "forbidden": "ليس لديك صلاحية",
    "notFound": "غير موجود",
    "validationFailed": "فشل التحقق",
    "serverError": "خطأ في الخادم",
    "networkError": "خطأ في الشبكة"
  }
}
```

---

## RTL Support

### Tailwind Configuration
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // RTL-aware spacing using logical properties
      margin: {
        'start': 'margin-inline-start',
        'end': 'margin-inline-end',
      },
      padding: {
        'start': 'padding-inline-start',
        'end': 'padding-inline-end',
      },
      borderRadius: {
        'start': 'border-start-start-radius border-end-start-radius',
        'end': 'border-start-end-radius border-end-end-radius',
      },
    },
  },
  plugins: [],
};

export default config;
```

### Global CSS with RTL Support
```css
/* styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --direction: ltr;
  }
  
  [dir="rtl"] {
    --direction: rtl;
  }
  
  /* Logical properties for RTL support */
  .ms-auto { margin-inline-start: auto; }
  .me-auto { margin-inline-end: auto; }
  .ps-4 { padding-inline-start: 1rem; }
  .pe-4 { padding-inline-end: 1rem; }
  .rounded-s { border-start-start-radius: 0.5rem; border-end-start-radius: 0.5rem; }
  .rounded-e { border-start-end-radius: 0.5rem; border-end-end-radius: 0.5rem; }
  .text-start { text-align: start; }
  .text-end { text-align: end; }
  .float-start { float: inline-start; }
  .float-end { float: inline-end; }
}

/* RTL-specific adjustments */
[dir="rtl"] {
  /* Ensure flexbox/grid respect RTL */
  .flex-row { flex-direction: row-reverse; }
  .flex-row-reverse { flex-direction: row; }
  
  /* Icon flipping for directional icons */
  .rtl-flip { transform: scaleX(-1); }
  
  /* Scrollbar positioning */
  .scrollbar-start { direction: rtl; }
}
```

### HTML Direction Setup
```typescript
// app/[locale]/layout.tsx
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LOCALES, LOCALE_DIR, DEFAULT_LOCALE } from '@/shared/lib/i18n/config';
import { ThemeProvider } from '@/shared/lib/theme/provider';

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: resolvedLocale } = await params;
  
  if (!LOCALES.includes(resolvedLocale as any)) notFound();
  
  const messages = await getMessages();
  const dir = LOCALE_DIR[resolvedLocale as 'en' | 'ar'];
  
  return (
    <html lang={resolvedLocale} dir={dir} className={dir === 'rtl' ? 'rtl' : ''}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## Using Translations

### Server Components
```typescript
// app/[locale]/dashboard/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations('navigation');
  const common = await getTranslations('common');
  
  return (
    <h1>{t('dashboard')}</h1>
  );
}
```

### Client Components
```typescript
// features/projects/components/ProjectHeader.tsx
'use client';

import { useTranslations } from 'next-intl';

export function ProjectHeader({ project }: { project: Project }) {
  const t = useTranslations('projects');
  const common = useTranslations('common');
  
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">{project.name}</h1>
      <span className="badge">{t(project.status.toLowerCase())}</span>
    </div>
  );
}
```

### Formatting Helpers
```typescript
// shared/lib/i18n/formatters.ts
import { LOCALE_DIR, DATE_FORMATS, NUMBER_FORMATS } from './config';

export function formatDate(
  date: Date | string,
  locale: 'en' | 'ar',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { ...DATE_FORMATS[locale], ...options }).format(d);
}

export function formatNumber(
  num: number,
  locale: 'en' | 'ar',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, { ...NUMBER_FORMATS[locale], ...options }).format(num);
}

export function formatRelativeTime(
  date: Date | string,
  locale: 'en' | 'ar'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMs = d.getTime() - Date.now();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  
  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  return rtf.format(diffDays, 'day');
}

export function getDirection(locale: 'en' | 'ar'): 'ltr' | 'rtl' {
  return LOCALE_DIR[locale];
}
```

### Currency Formatting
```typescript
// shared/lib/i18n/currency.ts
export function formatCurrency(
  amount: number,
  locale: 'en' | 'ar',
  currency: 'USD' | 'EUR' | 'SAR' = 'USD'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
```

---

## Language Switcher Component

```typescript
// shared/components/ui/LanguageSwitcher.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LOCALES, LOCALE_NAMES, DEFAULT_LOCALE } from '@/shared/lib/i18n/config';
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('settings');
  
  const currentLocale = pathname.split('/')[1] as 'en' | 'ar' || DEFAULT_LOCALE;
  
  const changeLocale = (locale: 'en' | 'ar') => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${locale}`);
    router.push(newPath);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 text-sm">
          <span className="uppercase">{currentLocale}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LOCALES.map(locale => (
          <DropdownMenuItem
            key={locale}
            onClick={() => changeLocale(locale)}
            className={locale === currentLocale ? 'bg-muted' : ''}
          >
            <div className="flex items-center justify-between">
              <span>{LOCALE_NAMES[locale]}</span>
              {locale === currentLocale && (
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Date/Number Input Handling

### Date Picker Locale
```typescript
// shared/components/forms/DatePicker.tsx
'use client';

import { useTranslations } from 'next-intl';
import { formatDate } from '@/shared/lib/i18n/formatters';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  locale: 'en' | 'ar';
}

export function DatePicker({ value, onChange, locale }: DatePickerProps) {
  const t = useTranslations('common');
  
  // Use native input with locale-aware formatting
  const formattedValue = value ? formatDate(value, locale, { 
    year: 'numeric', month: '2-digit', day: '2-digit' 
  }).replace(/\//g, '-') : '';
  
  return (
    <input
      type="date"
      value={formattedValue}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : undefined)}
      className="input"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
    />
  );
}
```

---

## Pluralization

### ICU Message Format (next-intl supports ICU)
```json
// messages/en.json
{
  "tasks": {
    "count": "{count, plural, =0 {No tasks} =1 {One task} other {{count} tasks}}",
    "assigned": "{count, plural, =0 {No tasks assigned} =1 {One task assigned} other {{count} tasks assigned}}"
  }
}

// messages/ar.json
{
  "tasks": {
    "count": "{count, plural, =0 {لا توجد مهام} =1 {مهمة واحدة} =2 {مهمتان} =3 {مهام} =4 {مهام} =5 {مهام} =6 {مهام} =7 {مهام} =8 {مهام} =9 {مهام} =10 {مهام} other {{count} مهمة}}",
    "assigned": "{count, plural, =0 {لا توجد مهام مُكلف بها} =1 {مهمة واحدة مُكلف بها} =2 {مهمتان مُكلف بهما} other {{count} مهام مُكلف بها}}"
  }
}
```

### Usage
```typescript
const t = useTranslations('tasks');
return <span>{t('count', { count: 5 })}</span>; // "5 tasks" or "5 مهام"
```

---

## Testing i18n

### Unit Tests
```typescript
// shared/lib/i18n/__tests__/formatters.test.ts
import { formatDate, formatNumber, formatRelativeTime } from '../formatters';

describe('i18n formatters', () => {
  describe('formatDate', () => {
    it('formats date in English', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'en')).toBe('Jan 15, 2024');
    });
    
    it('formats date in Arabic', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'ar')).toBe('١٥ يناير ٢٠٢٤');
    });
  });
  
  describe('formatRelativeTime', () => {
    it('shows "just now" for recent dates', () => {
      const now = new Date();
      expect(formatRelativeTime(now, 'en')).toBe('just now');
      expect(formatRelativeTime(now, 'ar')).toBe('الآن');
    });
  });
});
```

### E2E Tests
```typescript
// tests/i18n.spec.ts
import { test, expect } from '@playwright/test';

test.describe('i18n', () => {
  test('switches language', async ({ page }) => {
    await page.goto('/en/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    await page.click('[data-testid="language-switcher"]');
    await page.click('text=العربية');
    
    await expect(page).toHaveURL('/ar/dashboard');
    await expect(page.locator('h1')).toContainText('لوحة التحكم');
  });
  
  test('RTL layout', async ({ page }) => {
    await page.goto('/ar/dashboard');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });
});
```

---

## Adding New Locales

1. Add locale to `LOCALES` array in `config.ts`
2. Add locale name to `LOCALE_NAMES`
3. Add direction to `LOCALE_DIR`
4. Create translation file `messages/{locale}.json`
5. Update `routing.ts` if pathnames differ
6. Test RTL/LTR layout
7. Add to language switcher

---

## Summary

| Feature | Implementation |
|---------|----------------|
| **Routing** | `next-intl` with locale prefix (`/en/`, `/ar/`) |
| **Translations** | JSON files in `messages/` |
| **Formatting** | `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat` |
| **RTL** | Logical CSS properties + `[dir="rtl"]` selectors |
| **Locale Detection** | Middleware (path → cookie → header) |
| **Pluralization** | ICU Message Format |
| **Currency** | `Intl.NumberFormat` with currency option |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*