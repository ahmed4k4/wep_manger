/**
 * Locale-aware Root Layout
 * Provides locale context, RTL support, and theme provider
 */

import { getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { LOCALES, type Locale } from '@/shared/lib/i18n/config';
import { getDirection } from '@/shared/lib/i18n/formatters';
import DashboardLayout from '@/app/[locale]/(dashboard)/layout';
import { ThemeProvider } from '@/components/theme-provider';
import '@/app/globals.css';

export const generateStaticParams = async () => LOCALES.map((locale) => ({ locale }));

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  if (!LOCALES.includes(locale)) notFound();

  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  const direction = getDirection(locale);

  return (
    <html lang={locale} dir={direction} className={`${direction === 'rtl' ? 'rtl' : ''} no-transitions`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  var resolvedTheme = theme === 'system' ? systemTheme : theme;
                  if (resolvedTheme === 'dark') {
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
      <body className={`font-${locale === 'ar' ? 'ibm-plex-sans-arabic' : 'inter'} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <DashboardLayout>{children}</DashboardLayout>
          </ThemeProvider>
        </NextIntlClientProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.remove('no-transitions');
                } catch (e) {}
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
