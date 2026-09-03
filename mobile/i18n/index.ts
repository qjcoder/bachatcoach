import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureNativeDirection } from '@/lib/rtl';
import { type AppLanguage, normalizeLanguage } from '@/lib/language';
import { APP_LANGUAGE_CODES } from '@/constants/languages';
import { localeTranslations } from './locales';

const LANGUAGE_KEY = 'bachatcoach_language';

export const APP_LANGUAGES = APP_LANGUAGE_CODES;

const resources = Object.fromEntries(
  Object.entries(localeTranslations).map(([code, translation]) => [
    code,
    { translation },
  ])
);

export const getStoredLanguage = async (): Promise<AppLanguage> => {
  const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (stored && APP_LANGUAGES.includes(stored as AppLanguage)) {
    return stored as AppLanguage;
  }
  return 'en';
};

export const setStoredLanguage = async (lang: AppLanguage) => {
  const next = normalizeLanguage(lang);
  if (normalizeLanguage(i18n.language) === next) return;
  // Persist in background; update UI immediately without remounting the tree.
  void AsyncStorage.setItem(LANGUAGE_KEY, next);
  configureNativeDirection(next);
  await i18n.changeLanguage(next);
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function currentAppLanguage(): AppLanguage {
  return normalizeLanguage(i18n.language);
}

export default i18n;
