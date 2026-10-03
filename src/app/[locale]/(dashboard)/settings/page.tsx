/**
 * Settings Page
 * Server Component - displays settings with tabs
 */

import { getUserSettingsAction } from '@/app/actions/settings';
import { SettingsContent } from '@/components/settings/SettingsContent';
import { redirect } from 'next/navigation';

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const { data: userSettings, error } = await getUserSettingsAction();

  if (error || !userSettings) {
    redirect(`/${locale}/login?next=/${locale}/settings`);
  }

  return (
    <SettingsContent
      initialSettings={userSettings}
    />
  );
}