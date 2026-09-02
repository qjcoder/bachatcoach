import { Linking, Alert } from 'react-native';

import { formatMoney } from '@/lib/format';

function normalizePakPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  if (digits.length === 10) return `92${digits}`;
  return digits;
}

export function buildLoanReminderMessage(
  name: string,
  amount: number,
  lang: 'en' | 'ur',
  currencyCode = 'PKR'
): string {
  const formatted = formatMoney(amount, currencyCode, lang);
  if (lang === 'ur') {
    return `السلام علیکم ${name}،\n\nیہ BachatCoach سے ایک دوستانہ یاد دہانی ہے۔ براہ کرم بقایا رقم ${formatted} واپس کرنے میں مدد کریں۔\n\nشکریہ!`;
  }
  return `Hi ${name},\n\nThis is a friendly reminder from BachatCoach. Please return the outstanding amount of ${formatted} when convenient.\n\nThank you!`;
}

export async function sendWhatsAppReminder(
  phone: string,
  message: string
): Promise<void> {
  const normalized = normalizePakPhone(phone);
  if (normalized.length < 12) {
    Alert.alert('Invalid number', 'Please add a valid Pakistan phone number (e.g. 03001234567)');
    return;
  }

  const encoded = encodeURIComponent(message);
  const appUrl = `whatsapp://send?phone=${normalized}&text=${encoded}`;
  const webUrl = `https://wa.me/${normalized}?text=${encoded}`;

  const canOpen = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpen ? appUrl : webUrl);
}
