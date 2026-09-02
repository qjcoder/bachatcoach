import { I18nManager, Platform } from 'react-native';
import { type AppLanguage, isRTLLanguage } from '@/lib/language';

export type { AppLanguage };

export { isRTLLanguage };

/** Enable RTL support without forceRTL (reload crashes Expo Go). Layout uses RTLRow/AppText. */
export function configureNativeDirection(_lang: AppLanguage): void {
  if (Platform.OS === 'web') return;

  try {
    I18nManager.allowRTL(true);
  } catch {
    // In-app RTL still works via useIsRTL + RTLRow.
  }
}
