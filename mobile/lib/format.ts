import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { getCurrency } from '@/constants/currencies';
import { localeForLanguage, normalizeLanguage } from '@/lib/language';

export function formatMoney(amount: number, currencyCode = 'PKR', locale?: string) {
  const lang = normalizeLanguage(locale);
  const intlLocale = lang === 'ur' ? 'ur-PK' : 'en-US';
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    const { symbol } = getCurrency(currencyCode);
    const formatted = Math.abs(amount).toLocaleString(intlLocale);
    const prefix = amount < 0 ? '-' : '';
    return `${prefix}${symbol} ${formatted}`;
  }
}

/** @deprecated Use formatMoney */
export function formatPKR(amount: number, locale?: string) {
  return formatMoney(amount, 'PKR', locale);
}

export function formatPercent(value: number) {
  return `${value}%`;
}

export function useFormatMoney() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const code = user?.currency || 'PKR';
  return (amount: number) => formatMoney(amount, code, i18n.language);
}

/** Kept for compatibility — uses the user's selected currency */
export const useFormatPKR = useFormatMoney;

export function formatTransactionDate(date: Date | string, locale?: string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(localeForLanguage(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTransactionTime(date: Date | string, locale?: string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(localeForLanguage(locale), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function combineDateAndTime(datePart: Date, timePart: Date) {
  const combined = new Date(datePart);
  combined.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
  return combined;
}
