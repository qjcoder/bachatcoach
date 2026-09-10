import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import api from '@/lib/api';

export const REMINDERS_ENABLED_KEY = 'bachatcoach_push_notifications';

const SCHEDULED_IDS_KEY = 'bachatcoach_local_reminder_ids';

type NotificationsModule = typeof import('expo-notifications');

let notificationsMod: NotificationsModule | null = null;
let handlerReady = false;

function getNotifications(): NotificationsModule | null {
  if (notificationsMod) return notificationsMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsMod = require('expo-notifications') as NotificationsModule;
    return notificationsMod;
  } catch {
    return null;
  }
}

function ensureNotificationHandler() {
  if (handlerReady) return;
  const N = getNotifications();
  if (!N) return;
  handlerReady = true;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Native module not ready / missing in this binary.
  }
}

type ContactLite = {
  _id: string;
  name: string;
  nameUr?: string;
  direction: 'i_lent' | 'i_borrowed';
  balance: number;
  isSettled?: boolean;
  dueDate?: string | null;
  isOverdue?: boolean;
};

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function atLocalHour(base: Date, hour: number, minute = 0) {
  const x = new Date(base);
  x.setHours(hour, minute, 0, 0);
  return x;
}

export async function areRemindersEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(REMINDERS_ENABLED_KEY);
  if (v === null) return true;
  return v !== '0' && v !== 'false';
}

export async function setRemindersEnabled(value: boolean) {
  await AsyncStorage.setItem(REMINDERS_ENABLED_KEY, value ? '1' : '0');
  if (!value) await cancelScheduledReminders();
}

export async function ensureReminderPermissions(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  ensureNotificationHandler();
  try {
    const current = await N.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const asked = await N.requestPermissionsAsync();
      status = asked.status;
    }
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('bachatcoach-reminders', {
        name: 'Reminders',
        importance: N.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 150, 250],
      });
    }
    return status === 'granted';
  } catch {
    return false;
  }
}

async function cancelScheduledReminders() {
  const N = getNotifications();
  const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (N) {
    await Promise.all(ids.map((id) => N.cancelScheduledNotificationAsync(id).catch(() => {})));
    await N.cancelAllScheduledNotificationsAsync().catch(() => {});
  }
  await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
}

async function rememberIds(ids: string[]) {
  await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
}

/** Refresh local loan due + salary-day reminders from live data. */
export async function syncLocalReminders(opts?: {
  language?: string;
  salaryDay?: number;
  currencyLabel?: string;
}): Promise<void> {
  const enabled = await areRemindersEnabled();
  if (!enabled) {
    await cancelScheduledReminders();
    return;
  }

  const N = getNotifications();
  if (!N) return;

  const allowed = await ensureReminderPermissions();
  if (!allowed) return;

  await cancelScheduledReminders();

  const lang = opts?.language || 'en';
  const salaryDay = Math.min(31, Math.max(1, Number(opts?.salaryDay) || 1));
  const ids: string[] = [];
  const now = new Date();

  try {
    const { data } = await api.get<ContactLite[]>('/contacts', {
      params: { includeSettled: 0 },
    });
    const dueSoonOrOverdue = (data || []).filter((c) => {
      if (c.isSettled || !(c.balance > 0) || !c.dueDate) return false;
      const due = new Date(c.dueDate);
      if (Number.isNaN(due.getTime())) return false;
      const days = Math.ceil((startOfLocalDay(due).getTime() - startOfLocalDay(now).getTime()) / 86400000);
      return days <= 3; // overdue or due within 3 days
    });

    for (const c of dueSoonOrOverdue.slice(0, 12)) {
      const due = new Date(c.dueDate!);
      const fireAt = atLocalHour(due, 10, 0);
      // If due date morning already passed, nudge tomorrow 10:00.
      const when = fireAt.getTime() > now.getTime() + 60_000 ? fireAt : atLocalHour(new Date(now.getTime() + 86400000), 10, 0);
      const overdue = c.isOverdue || startOfLocalDay(due).getTime() < startOfLocalDay(now).getTime();
      const title =
        lang === 'ur'
          ? overdue
            ? 'واجب الادا قرض'
            : 'قرض کی یاددہانی'
          : overdue
            ? 'Overdue loan'
            : 'Loan due soon';
      const body =
        lang === 'ur'
          ? `${c.name} — بقایا رقم یاد رکھیں`
          : `${c.name} — outstanding balance needs a follow-up`;

      const id = await N.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'loan_due', contactId: c._id },
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: 'bachatcoach-reminders' } : {}),
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DATE,
          date: when,
        },
      });
      ids.push(id);
    }
  } catch {
    // Offline — keep going with salary reminder only.
  }

  // Next salary-day morning reminder (monthly).
  const year = now.getFullYear();
  const month = now.getMonth();
  let salaryDate = new Date(year, month, Math.min(salaryDay, daysInMonth(year, month)), 9, 0, 0, 0);
  if (salaryDate.getTime() <= now.getTime() + 60_000) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    salaryDate = new Date(
      nextYear,
      nextMonth,
      Math.min(salaryDay, daysInMonth(nextYear, nextMonth)),
      9,
      0,
      0,
      0
    );
  }

  const salaryId = await N.scheduleNotificationAsync({
    content: {
      title: lang === 'ur' ? 'تنخواہ کا دن' : 'Salary day',
      body:
        lang === 'ur'
          ? 'اگر تنخواہ موصول ہوئی ہے تو BachatCoach میں درج کریں'
          : 'If salary arrived, log it in BachatCoach',
      data: { type: 'salary_day' },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'bachatcoach-reminders' } : {}),
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DATE,
      date: salaryDate,
    },
  });
  ids.push(salaryId);

  await rememberIds(ids);
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
