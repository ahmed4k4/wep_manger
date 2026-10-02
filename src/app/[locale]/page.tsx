import { unstable_setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/shared/lib/i18n/config';
import ProjectsPage from './(dashboard)/projects/page';

/** Render the existing projects workspace as the localized home page. */
export default function LocaleHomePage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  unstable_setRequestLocale(locale);
  return <ProjectsPage />;
}
