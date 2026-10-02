/**
 * i18n Configuration
 * Central configuration for supported locales, formatting, and locale metadata
 */

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

export const TIME_FORMATS: Record<Locale, Intl.DateTimeFormatOptions> = {
  en: { timeStyle: 'short' },
  ar: { timeStyle: 'short', hourCycle: 'h23' },
};