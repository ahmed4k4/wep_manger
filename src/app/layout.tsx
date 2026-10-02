/**
 * Root Layout
 * Redirects to locale-specific layout
 */

import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/shared/lib/i18n/config';

export default function RootLayout() {
  redirect(`/${DEFAULT_LOCALE}`);
}