import { CURRENCIES } from '@/constants/currencies';

export type LanguageOption = {
  code: string;
  /** Default currency for this language's primary region. */
  currency: string;
  /** Short label in the picker badge (defaults to first 2 chars of code). */
  badge?: string;
  nativeName: string;
  name: string;
  rtl?: boolean;
  latinFont?: boolean;
  locale?: string;
};

/**
 * Supported app languages — each has a full UI translation in mobile/i18n/locales/.
 * Regenerate: npm run generate-locales
 */
export const LANGUAGES = [
  // — South Asia —
  { code: 'en', currency: 'USD', badge: 'EN', nativeName: 'English', name: 'English', latinFont: true, locale: 'en-US' },
  { code: 'ur', currency: 'PKR', badge: 'UR', nativeName: 'اردو', name: 'Urdu', rtl: true, locale: 'ur-PK' },
  {
    code: 'roman',
    currency: 'PKR',
    badge: 'RN',
    nativeName: 'Urdu Roman',
    name: 'Urdu in Roman script',
    latinFont: true,
    locale: 'en-PK',
  },
  { code: 'hi', currency: 'INR', badge: 'HI', nativeName: 'हिन्दी', name: 'Hindi', locale: 'hi-IN' },
  { code: 'bn', currency: 'BDT', badge: 'BN', nativeName: 'বাংলা', name: 'Bengali', locale: 'bn-BD' },
  { code: 'pa', currency: 'INR', badge: 'PA', nativeName: 'ਪੰਜਾਬੀ', name: 'Punjabi', locale: 'pa-IN' },
  { code: 'sd', currency: 'PKR', badge: 'SD', nativeName: 'سنڌي', name: 'Sindhi', rtl: true, locale: 'sd-PK' },
  { code: 'ps', currency: 'AFN', badge: 'PS', nativeName: 'پښتو', name: 'Pashto', rtl: true, locale: 'ps-AF' },
  { code: 'ne', currency: 'NPR', badge: 'NE', nativeName: 'नेपाली', name: 'Nepali', locale: 'ne-NP' },
  { code: 'si', currency: 'LKR', badge: 'SI', nativeName: 'සිංහල', name: 'Sinhala', locale: 'si-LK' },
  { code: 'ta', currency: 'INR', badge: 'TA', nativeName: 'தமிழ்', name: 'Tamil', locale: 'ta-IN' },
  { code: 'te', currency: 'INR', badge: 'TE', nativeName: 'తెలుగు', name: 'Telugu', locale: 'te-IN' },
  { code: 'mr', currency: 'INR', badge: 'MR', nativeName: 'मराठी', name: 'Marathi', locale: 'mr-IN' },
  { code: 'gu', currency: 'INR', badge: 'GU', nativeName: 'ગુજરાતી', name: 'Gujarati', locale: 'gu-IN' },
  { code: 'kn', currency: 'INR', badge: 'KN', nativeName: 'ಕನ್ನಡ', name: 'Kannada', locale: 'kn-IN' },
  { code: 'ml', currency: 'INR', badge: 'ML', nativeName: 'മലയാളം', name: 'Malayalam', locale: 'ml-IN' },

  // — Middle East & Central Asia —
  { code: 'ar', currency: 'SAR', badge: 'AR', nativeName: 'العربية', name: 'Arabic', rtl: true, locale: 'ar-SA' },
  { code: 'fa', currency: 'IRR', badge: 'FA', nativeName: 'فارسی', name: 'Persian', rtl: true, locale: 'fa-IR' },
  { code: 'tr', currency: 'TRY', badge: 'TR', nativeName: 'Türkçe', name: 'Turkish', locale: 'tr-TR' },
  { code: 'he', currency: 'ILS', badge: 'HE', nativeName: 'עברית', name: 'Hebrew', rtl: true, locale: 'he-IL' },
  { code: 'ku', currency: 'TRY', badge: 'KU', nativeName: 'Kurdî', name: 'Kurdish', locale: 'ku-TR' },
  { code: 'az', currency: 'AZN', badge: 'AZ', nativeName: 'Azərbaycan', name: 'Azerbaijani', locale: 'az-AZ' },
  { code: 'uz', currency: 'UZS', badge: 'UZ', nativeName: 'Oʻzbek', name: 'Uzbek', locale: 'uz-UZ' },

  // — Europe —
  { code: 'es', currency: 'EUR', badge: 'ES', nativeName: 'Español', name: 'Spanish', locale: 'es-ES' },
  { code: 'fr', currency: 'EUR', badge: 'FR', nativeName: 'Français', name: 'French', locale: 'fr-FR' },
  { code: 'de', currency: 'EUR', badge: 'DE', nativeName: 'Deutsch', name: 'German', locale: 'de-DE' },
  { code: 'it', currency: 'EUR', badge: 'IT', nativeName: 'Italiano', name: 'Italian', locale: 'it-IT' },
  { code: 'pt', currency: 'EUR', badge: 'PT', nativeName: 'Português', name: 'Portuguese', locale: 'pt-PT' },
  { code: 'nl', currency: 'EUR', badge: 'NL', nativeName: 'Nederlands', name: 'Dutch', locale: 'nl-NL' },
  { code: 'pl', currency: 'PLN', badge: 'PL', nativeName: 'Polski', name: 'Polish', locale: 'pl-PL' },
  { code: 'ru', currency: 'RUB', badge: 'RU', nativeName: 'Русский', name: 'Russian', locale: 'ru-RU' },
  { code: 'uk', currency: 'UAH', badge: 'UK', nativeName: 'Українська', name: 'Ukrainian', locale: 'uk-UA' },
  { code: 'ro', currency: 'RON', badge: 'RO', nativeName: 'Română', name: 'Romanian', locale: 'ro-RO' },
  { code: 'el', currency: 'EUR', badge: 'EL', nativeName: 'Ελληνικά', name: 'Greek', locale: 'el-GR' },
  { code: 'sv', currency: 'SEK', badge: 'SV', nativeName: 'Svenska', name: 'Swedish', locale: 'sv-SE' },
  { code: 'no', currency: 'NOK', badge: 'NO', nativeName: 'Norsk', name: 'Norwegian', locale: 'nb-NO' },
  { code: 'da', currency: 'DKK', badge: 'DA', nativeName: 'Dansk', name: 'Danish', locale: 'da-DK' },
  { code: 'fi', currency: 'EUR', badge: 'FI', nativeName: 'Suomi', name: 'Finnish', locale: 'fi-FI' },
  { code: 'cs', currency: 'CZK', badge: 'CS', nativeName: 'Čeština', name: 'Czech', locale: 'cs-CZ' },
  { code: 'hu', currency: 'HUF', badge: 'HU', nativeName: 'Magyar', name: 'Hungarian', locale: 'hu-HU' },
  { code: 'sk', currency: 'EUR', badge: 'SK', nativeName: 'Slovenčina', name: 'Slovak', locale: 'sk-SK' },
  { code: 'bg', currency: 'BGN', badge: 'BG', nativeName: 'Български', name: 'Bulgarian', locale: 'bg-BG' },
  { code: 'sr', currency: 'EUR', badge: 'SR', nativeName: 'Српски', name: 'Serbian', locale: 'sr-RS' },
  { code: 'hr', currency: 'HRK', badge: 'HR', nativeName: 'Hrvatski', name: 'Croatian', locale: 'hr-HR' },
  { code: 'sq', currency: 'ALL', badge: 'SQ', nativeName: 'Shqip', name: 'Albanian', locale: 'sq-AL' },

  // — East & Southeast Asia —
  { code: 'zh', currency: 'CNY', badge: 'ZH', nativeName: '中文', name: 'Chinese', locale: 'zh-CN' },
  { code: 'ja', currency: 'JPY', badge: 'JA', nativeName: '日本語', name: 'Japanese', locale: 'ja-JP' },
  { code: 'ko', currency: 'KRW', badge: 'KO', nativeName: '한국어', name: 'Korean', locale: 'ko-KR' },
  { code: 'id', currency: 'IDR', badge: 'ID', nativeName: 'Bahasa Indonesia', name: 'Indonesian', locale: 'id-ID' },
  { code: 'ms', currency: 'MYR', badge: 'MS', nativeName: 'Bahasa Melayu', name: 'Malay', locale: 'ms-MY' },
  { code: 'th', currency: 'THB', badge: 'TH', nativeName: 'ไทย', name: 'Thai', locale: 'th-TH' },
  { code: 'vi', currency: 'VND', badge: 'VI', nativeName: 'Tiếng Việt', name: 'Vietnamese', locale: 'vi-VN' },
  { code: 'fil', currency: 'PHP', badge: 'TL', nativeName: 'Filipino', name: 'Filipino', locale: 'fil-PH' },
  { code: 'my', currency: 'MMK', badge: 'MY', nativeName: 'မြန်မာ', name: 'Burmese', locale: 'my-MM' },
  { code: 'km', currency: 'KHR', badge: 'KM', nativeName: 'ខ្មែរ', name: 'Khmer', locale: 'km-KH' },

  // — Africa —
  { code: 'sw', currency: 'KES', badge: 'SW', nativeName: 'Kiswahili', name: 'Swahili', locale: 'sw-KE' },
  { code: 'am', currency: 'ETB', badge: 'AM', nativeName: 'አማርኛ', name: 'Amharic', locale: 'am-ET' },
  { code: 'ha', currency: 'NGN', badge: 'HA', nativeName: 'Hausa', name: 'Hausa', locale: 'ha-NG' },
  { code: 'yo', currency: 'NGN', badge: 'YO', nativeName: 'Yorùbá', name: 'Yoruba', locale: 'yo-NG' },
  { code: 'zu', currency: 'ZAR', badge: 'ZU', nativeName: 'isiZulu', name: 'Zulu', locale: 'zu-ZA' },
  { code: 'af', currency: 'ZAR', badge: 'AF', nativeName: 'Afrikaans', name: 'Afrikaans', locale: 'af-ZA' },
  { code: 'so', currency: 'USD', badge: 'SO', nativeName: 'Soomaali', name: 'Somali', locale: 'so-SO' },
] as const satisfies readonly LanguageOption[];

export const TRANSLATED_LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

const languageMap = new Map<string, LanguageOption>(LANGUAGES.map((l) => [l.code, l]));

export type AppLanguage = (typeof LANGUAGES)[number]['code'];

export const APP_LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as AppLanguage[];

export function getLanguage(code?: string): LanguageOption {
  return languageMap.get(code || 'en') ?? languageMap.get('en')!;
}

const validCurrencyCodes = new Set(CURRENCIES.map((c) => c.code));

export function getDefaultCurrencyForLanguage(code?: string): string {
  const preferred = getLanguage(code).currency;
  return validCurrencyCodes.has(preferred) ? preferred : 'USD';
}

export function getLanguageBadge(option: LanguageOption): string {
  return option.badge ?? option.code.slice(0, 2).toUpperCase();
}

export function isSupportedLanguage(code?: string): code is AppLanguage {
  return !!code && languageMap.has(code);
}

function normalizeCode(code?: string): string {
  return code?.split('-')[0] ?? '';
}

export function filterLanguages(query: string): readonly LanguageOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return LANGUAGES;
  return LANGUAGES.filter(
    (l) =>
      l.code.toLowerCase().includes(q) ||
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      getLanguageBadge(l).toLowerCase().includes(q)
  );
}
