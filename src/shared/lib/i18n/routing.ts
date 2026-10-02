/**
 * i18n Routing Configuration
 * Defines locale-aware pathnames for next-intl v3
 */

import { createLocalizedPathnamesNavigation } from 'next-intl/navigation';
import { LOCALES, DEFAULT_LOCALE } from './config';

export const routing = {
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always' as const,
  pathnames: {
    '/': '/',
    '/login': '/login',
    '/register': '/register',
    '/dashboard': '/dashboard',
    '/projects/[projectId]': '/projects/[projectId]',
    '/projects/[projectId]/overview': '/projects/[projectId]/overview',
    '/projects/[projectId]/tasks': '/projects/[projectId]/tasks',
    '/projects/[projectId]/tasks/[taskId]': '/projects/[projectId]/tasks/[taskId]',
    '/projects/[projectId]/members': '/projects/[projectId]/members',
    '/projects/[projectId]/files': '/projects/[projectId]/files',
    '/projects/[projectId]/activity': '/projects/[projectId]/activity',
    '/projects/[projectId]/settings': '/projects/[projectId]/settings',
    '/notifications': '/notifications',
    '/profile': '/profile',
    '/settings': '/settings',
  },
} as const;

export const { Link, redirect, usePathname, useRouter, getPathname } = 
  createLocalizedPathnamesNavigation(routing);

export type Pathnames = typeof routing.pathnames;
export type LocalePrefix = typeof routing.localePrefix;