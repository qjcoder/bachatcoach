import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

/** Support / feedback inbox (same as privacy & legal pages). */
export const SUPPORT_EMAIL = 'qjcoder@gmail.com';

/** Android applicationId / iOS bundle id */
export const STORE_PACKAGE_ID = 'com.bachatcoach.app';

/**
 * App Store numeric ID — set after the first iOS listing is live.
 * Until then iOS falls back to an App Store search for BachatCoach.
 */
export const IOS_APP_STORE_ID = '';

function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.1.0';
}

function encodeMailto(subject: string, body?: string): string {
  const q = [`subject=${encodeURIComponent(subject)}`];
  if (body) q.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${SUPPORT_EMAIL}?${q.join('&')}`;
}

async function openUrl(url: string): Promise<boolean> {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can && !url.startsWith('mailto:') && !url.startsWith('https:')) {
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/** Opens the mail app to contact support. */
export async function openSupportEmail(): Promise<void> {
  const body = [
    '',
    '—',
    `App: BachatCoach ${appVersion()}`,
    `Platform: ${Platform.OS} ${Platform.Version}`,
  ].join('\n');
  await openUrl(encodeMailto('BachatCoach Support', body));
}

/** Opens the mail app for product feedback. */
export async function openFeedbackEmail(): Promise<void> {
  const body = [
    'What went well / what to improve:',
    '',
    '',
    '—',
    `App: BachatCoach ${appVersion()}`,
    `Platform: ${Platform.OS} ${Platform.Version}`,
  ].join('\n');
  await openUrl(encodeMailto('BachatCoach Feedback', body));
}

/** Opens Play Store or App Store listing for ratings. */
export async function openRateApp(): Promise<void> {
  if (Platform.OS === 'android') {
    const market = `market://details?id=${STORE_PACKAGE_ID}`;
    const web = `https://play.google.com/store/apps/details?id=${STORE_PACKAGE_ID}`;
    if (await openUrl(market)) return;
    await openUrl(web);
    return;
  }

  if (Platform.OS === 'ios') {
    if (IOS_APP_STORE_ID) {
      const review = `itms-apps://apps.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`;
      const web = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;
      if (await openUrl(review)) return;
      await openUrl(web);
      return;
    }
    await openUrl('https://apps.apple.com/search?term=BachatCoach');
    return;
  }

  await openUrl(`https://play.google.com/store/apps/details?id=${STORE_PACKAGE_ID}`);
}
