import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureNativeDirection } from '@/lib/rtl';

import en from './en.json';
import ur from './ur.json';

const LANGUAGE_KEY = 'bachatcoach_language';

export const getStoredLanguage = async (): Promise<'en' | 'ur'> => {
  const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (stored === 'en' || stored === 'ur') return stored;
  const deviceLang = Localization.getLocales()[0]?.languageCode;
  return deviceLang === 'ur' ? 'ur' : 'en';
};

export const setStoredLanguage = async (lang: 'en' | 'ur') => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  configureNativeDirection(lang);
  await i18n.changeLanguage(lang);
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
