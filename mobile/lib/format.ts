import { useTranslation } from 'react-i18next';

export function formatPKR(amount: number, locale?: string) {
  const isUrdu = locale === 'ur';
  const formatted = Math.abs(amount).toLocaleString('en-PK');
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}₨ ${formatted}`;
}

export function formatPercent(value: number) {
  return `${value}%`;
}

export function useFormatPKR() {
  const { i18n } = useTranslation();
  return (amount: number) => formatPKR(amount, i18n.language);
}
