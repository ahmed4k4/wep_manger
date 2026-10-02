import { unstable_setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/shared/lib/i18n/config';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import ProjectsPage from './(dashboard)/projects/page';

/** Render the existing projects workspace as the localized home page. */
export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/projects`);
  unstable_setRequestLocale(locale);
  return <ProjectsPage />;
}
