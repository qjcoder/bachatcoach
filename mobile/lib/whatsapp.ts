import { Linking } from 'react-native';

import { showAppAlert } from '@/context/DialogContext';
import { formatMoney } from '@/lib/format';

function normalizePakPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  if (digits.length === 10) return `92${digits}`;
  return digits;
}

function formatDueLabel(dueDate?: string | null, lang: 'en' | 'ur' = 'en'): string {
  if (!dueDate) return '';
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function buildLoanReminderMessage(
  name: string,
  amount: number,
  lang: 'en' | 'ur',
  currencyCode = 'PKR',
  dueDate?: string | null
): string {
  const formatted = formatMoney(amount, currencyCode, lang);
  const dueLabel = formatDueLabel(dueDate, lang);
  if (lang === 'ur') {
    const dueLine = dueLabel ? `\nمقررہ تاریخ: ${dueLabel}` : '';
    return `السلام علیکم ${name}،\n\nیہ BachatCoach سے ایک دوستانہ یاد دہانی ہے۔ براہ کرم بقایا رقم ${formatted} واپس کرنے میں مدد کریں۔${dueLine}\n\nشکریہ!`;
  }
  const dueLine = dueLabel ? `\nDue date: ${dueLabel}` : '';
  return `Hi ${name},\n\nThis is a friendly reminder from BachatCoach. Please return the outstanding amount of ${formatted} when convenient.${dueLine}\n\nThank you!`;
}

export async function sendWhatsAppReminder(
  phone: string,
  message: string
): Promise<void> {
  const normalized = normalizePakPhone(phone);
  if (normalized.length < 12) {
    showAppAlert(
      'Invalid number',
      'Please add a valid Pakistan phone number (e.g. 03001234567)',
      'error'
    );
    return;
  }

  const encoded = encodeURIComponent(message);
  const appUrl = `whatsapp://send?phone=${normalized}&text=${encoded}`;
  const webUrl = `https://wa.me/${normalized}?text=${encoded}`;

  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
}
