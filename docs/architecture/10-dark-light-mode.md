# Dark/Light Mode Strategy

## Overview

This document defines the theming architecture supporting **Light**, **Dark**, and **System** modes with seamless switching, persistence, and SSR-compatible implementation.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **CSS Variables** | CSS Custom Properties (CSS-in-CSS) |
| **State Management** | React Context + localStorage + Cookie |
| **SSR Sync** | `next-themes` compatible pattern |
| **Tailwind** | `darkMode: 'class'` strategy |

---

## Theme Configuration

### CSS Variables Definition
```css
/* styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light theme (default) */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    
    --radius: 0.5rem;
    
    /* Chart colors */
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
    
    /* Chart colors (dark) */
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

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
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Theme Provider

### Context & Provider
```typescript
// shared/lib/theme/provider.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Get initial theme from localStorage (client-side only)
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setThemeState(stored);
    }
  }, []);
  
  // Resolve system theme
  useEffect(() => {
    if (!mounted) return;
    
    const resolveTheme = (t: Theme): 'light' | 'dark' => {
      if (t === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return t;
    };
    
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [theme, mounted]);
  
  // Listen for system theme changes
  useEffect(() => {
    if (!mounted || theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);
  
  // Persist to localStorage and cookie
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Also set cookie for SSR
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
  };
  
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'system', resolvedTheme: 'light', setTheme: () => {} }}>
        {children}
      </ThemeContext.Provider>
    );
  }
  
  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

---

## Server-Side Theme Detection

### Middleware for Cookie Reading
```typescript
// middleware.ts (addition to existing middleware)
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // ... existing i18n and auth middleware ...
  
  const response = NextResponse.next({ request });
  
  // Read theme from cookie for SSR
  const themeCookie = request.cookies.get('theme')?.value;
  if (themeCookie && ['light', 'dark', 'system'].includes(themeCookie)) {
    // Pass theme to headers for server components
    response.headers.set('x-theme', themeCookie);
  }
  
  return response;
}
```

### Server Component Theme Access
```typescript
// shared/lib/theme/server.ts
import { headers } from 'next/headers';

export function getServerTheme(): 'light' | 'dark' | 'system' {
  const headersList = headers();
  const theme = headersList.get('x-theme');
  return (theme as 'light' | 'dark' | 'system') || 'system';
}

export function resolveServerTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  // Can't detect system preference on server, default to light
  // Client will hydrate correctly
  return 'light';
}
```

### Server Layout with Theme Class
```typescript
// app/[locale]/layout.tsx
import { getServerTheme, resolveServerTheme } from '@/shared/lib/theme/server';

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: resolvedLocale } = await params;
  const theme = getServerTheme();
  const resolvedTheme = resolveServerTheme(theme);
  const dir = LOCALE_DIR[resolvedLocale as 'en' | 'ar'];
  
  return (
    <html 
      lang={resolvedLocale} 
      dir={dir} 
      className={`${resolvedTheme} ${dir === 'rtl' ? 'rtl' : ''}`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && systemDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

---

## Theme Toggle Component

```typescript
// shared/components/ui/ThemeToggle.tsx
'use client';

import { useTheme } from '@/shared/lib/theme/provider';
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent } from '@/shared/ui/dropdown-menu';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const t = useTranslations('settings');
  
  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('light'), icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: t('dark'), icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: t('system'), icon: <Monitor className="w-4 h-4" /> },
  ];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
          aria-label={t('themeLabel')}
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map(({ value, label, icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center gap-2"
          >
            {icon}
            <span className="flex-1">{label}</span>
            {theme === value && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Theme-Aware Components

### Using Theme in Components
```typescript
// shared/components/ui/Card.tsx
import { cn } from '@/shared/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        className
      )}
      {...props}
    />
  );
}

// Usage automatically adapts to theme via CSS variables
```

### Conditional Styling Based on Theme
```typescript
// shared/components/ui/Chart.tsx
'use client';

import { useTheme } from '@/shared/lib/theme/provider';

export function Chart({ data }: { data: number[] }) {
  const { resolvedTheme } = useTheme();
  
  const chartColors = resolvedTheme === 'dark' 
    ? ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa']
    : ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'];
  
  return (
    <div className="chart-container">
      {/* Chart implementation using chartColors */}
    </div>
  );
}
```

---

## Theme Persistence Strategy

### Storage Layers
```typescript
// shared/lib/theme/storage.ts
export const THEME_STORAGE_KEY = 'theme';

export function getStoredTheme(): 'light' | 'dark' | 'system' | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as 'light' | 'dark' | 'system';
    }
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
  return null;
}

export function setStoredTheme(theme: 'light' | 'dark' | 'system'): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}
```

### Cookie Sync (for SSR)
```typescript
// shared/lib/theme/cookie.ts
export function getThemeCookie(): 'light' | 'dark' | 'system' | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const themeCookie = cookies.find(c => c.trim().startsWith('theme='));
  if (themeCookie) {
    const value = themeCookie.split('=')[1];
    if (['light', 'dark', 'system'].includes(value)) {
      return value as 'light' | 'dark' | 'system';
    }
  }
  return null;
}

export function setThemeCookie(theme: 'light' | 'dark' | 'system'): void {
  if (typeof document === 'undefined') return;
  
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax; Secure`;
}
```

---

## Preventing Flash of Wrong Theme

### Inline Script in `<head>`
```html
<!-- In app/[locale]/layout.tsx head -->
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        try {
          var theme = localStorage.getItem('theme');
          var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          
          if (theme === 'dark' || (!theme && systemDark)) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (e) {}
      })();
    `,
  }}
/>
```

### suppressHydrationWarning
```tsx
<html 
  className={`${resolvedTheme} ${dir === 'rtl' ? 'rtl' : ''}`}
  suppressHydrationWarning
>
```

---

## System Preference Detection

### Client-Side Only
```typescript
// shared/lib/theme/system.ts
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function subscribeToSystemTheme(
  callback: (theme: 'light' | 'dark') => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches ? 'dark' : 'light');
  
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
```

---

## Testing Themes

### Unit Tests
```typescript
// shared/lib/theme/__tests__/provider.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../provider';

function TestComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  it('defaults to system', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });
  
  it('persists theme to localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    fireEvent.click(screen.getByText('Dark'));
    
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
```

### E2E Tests
```typescript
// tests/theme.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Theme', () => {
  test('toggles theme', async ({ page }) => {
    await page.goto('/en/dashboard');
    
    // Check initial theme
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);
    
    // Toggle to dark
    await page.click('[data-testid="theme-toggle"]');
    await page.click('text=Dark');
    
    await expect(html).toHaveClass(/dark/);
    
    // Reload and verify persistence
    await page.reload();
    await expect(html).toHaveClass(/dark/);
  });
  
  test('system theme follows OS', async ({ page }) => {
    await page.goto('/en/dashboard');
    
    // Set to system
    await page.click('[data-testid="theme-toggle"]');
    await page.click('text=System');
    
    // Emulate dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });
});
```

---

## Accessibility

### Reduced Motion
```css
/* styles/globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast
```css
@media (prefers-contrast: high) {
  :root {
    --border: 0 0% 0%;
    --ring: 0 0% 0%;
  }
  
  .dark {
    --border: 0 0% 100%;
    --ring: 0 0% 100%;
  }
}
```

---

## Summary

| Feature | Implementation |
|---------|----------------|
| **CSS Variables** | HSL colors in `:root` and `.dark` |
| **Tailwind** | `darkMode: 'class'` with CSS variable mapping |
| **Provider** | React Context with localStorage + cookie sync |
| **SSR** | Middleware reads cookie, inline script prevents flash |
| **System Preference** | `matchMedia` listener |
| **Persistence** | localStorage + cookie (1 year) |
| **RTL Compatible** | Works with `[dir="rtl"]` |

---

*Last Updated: 2026-01-10*
*Version: 1.0.0*