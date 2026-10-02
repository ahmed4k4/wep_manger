/**
 * i18n Formatters
 * Locale-aware formatting for dates, numbers, and relative time
 */

import { LOCALE_DIR, DATE_FORMATS, NUMBER_FORMATS, TIME_FORMATS } from './config';

export function formatDate(
  date: Date | string,
  locale: 'en' | 'ar',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { ...DATE_FORMATS[locale], ...options }).format(d);
}

export function formatTime(
  date: Date | string,
  locale: 'en' | 'ar',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, { ...TIME_FORMATS[locale], ...options }).format(d);
}

export function formatDateTime(
  date: Date | string,
  locale: 'en' | 'ar',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(d);
}

export function formatNumber(
  num: number,
  locale: 'en' | 'ar',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, { ...NUMBER_FORMATS[locale], ...options }).format(num);
}

export function formatCurrency(
  amount: number,
  locale: 'en' | 'ar',
  currency: 'USD' | 'EUR' | 'SAR' = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

export function formatRelativeTime(
  date: Date | string,
  locale: 'en' | 'ar'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMs = d.getTime() - Date.now();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  
  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  return rtf.format(diffDays, 'day');
}

export function getDirection(locale: 'en' | 'ar'): 'ltr' | 'rtl' {
  return LOCALE_DIR[locale];
}

export function formatPercent(
  value: number,
  locale: 'en' | 'ar',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  }).format(value / 100);
}

export function formatFileSize(bytes: number, locale: 'en' | 'ar'): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}