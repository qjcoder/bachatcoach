import { I18nManager, Platform } from 'react-native';

export type AppLang = 'en' | 'ur';

export function isRTLLanguage(lang?: string): boolean {
  if (!lang) return false;
  return lang.split('-')[0] === 'ur';
}

/** Enable RTL support without forceRTL (reload crashes Expo Go). Layout uses RTLRow/AppText. */
export function configureNativeDirection(_lang: AppLang): void {
  if (Platform.OS === 'web') return;

  try {
    I18nManager.allowRTL(true);
    // Do not call I18nManager.forceRTL — it requires a native reload that breaks Expo Go.
  } catch {
    // In-app RTL still works via useIsRTL + RTLRow.
  }
}
