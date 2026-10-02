import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LOCALES } from './shared/lib/i18n/config';

export default getRequestConfig(async ({ locale }) => {
  if (!locale || !LOCALES.includes(locale as (typeof LOCALES)[number])) notFound();
  return { messages: (await import(`./messages/${locale}.json`)).default };
});
