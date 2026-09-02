import {
  type AppLanguage,
  APP_LANGUAGE_CODES,
  getLanguage,
  isSupportedLanguage,
} from '@/constants/languages';

export type { AppLanguage };

export function normalizeLanguage(lang?: string): AppLanguage {
  const code = lang?.split('-')[0];
  if (code && isSupportedLanguage(code)) return code;
  return 'en';
}

export function isRTLLanguage(lang?: string): boolean {
  return !!getLanguage(normalizeLanguage(lang)).rtl;
}

export function usesLatinFont(lang?: string): boolean {
  const option = getLanguage(normalizeLanguage(lang));
  if (option.latinFont !== undefined) return option.latinFont;
  return !option.rtl;
}

/** PDF / WhatsApp templates that only support en vs ur script. */
export function scriptLanguage(lang?: string): 'en' | 'ur' {
  return normalizeLanguage(lang) === 'ur' ? 'ur' : 'en';
}

export function localeForLanguage(lang?: string): string {
  return getLanguage(normalizeLanguage(lang)).locale ?? 'en-US';
}

export { APP_LANGUAGE_CODES as VALID_LANGUAGES };
