'use client';

/**
 * Theme Switcher Component
 * Allows users to switch between Light, Dark, and System themes
 */

import * as React from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isArabic = useLocale() === 'ar';

  const themes = [
    { value: 'light', label: isArabic ? 'فاتح' : 'Light', icon: Sun },
    { value: 'dark', label: isArabic ? 'داكن' : 'Dark', icon: Moon },
    { value: 'system', label: isArabic ? 'حسب النظام' : 'System', icon: Monitor },
  ] as const;

  const currentTheme = theme === 'system' ? resolvedTheme : theme;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-md">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{isArabic ? 'تغيير المظهر' : 'Toggle theme'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
            className="flex items-center gap-2"
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {theme === t.value && <Check className="ms-auto h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
