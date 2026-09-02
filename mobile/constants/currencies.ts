import { normalizeLanguage } from '@/lib/language';

export type CurrencyOption = {
  code: string;
  symbol: string;
  name: string;
  nameUr: string;
};

export const CURRENCIES: CurrencyOption[] = [
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', nameUr: 'پاکستانی روپیہ' },
  { code: 'USD', symbol: '$', name: 'US Dollar', nameUr: 'امریکی ڈالر' },
  { code: 'EUR', symbol: '€', name: 'Euro', nameUr: 'یورو' },
  { code: 'GBP', symbol: '£', name: 'British Pound', nameUr: 'برطانوی پاؤنڈ' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', nameUr: 'بھارتی روپیہ' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', nameUr: 'اماراتی درہم' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', nameUr: 'سعودی ریال' },
  { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal', nameUr: 'قطری ریال' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', nameUr: 'کویتی دینار' },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar', nameUr: 'بحرینی دینار' },
  { code: 'OMR', symbol: '﷼', name: 'Omani Rial', nameUr: 'عمانی ریال' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', nameUr: 'چینی یوآن' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', nameUr: 'جاپانی ین' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', nameUr: 'جنوبی کوریائی وون' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', nameUr: 'آسٹریلین ڈالر' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', nameUr: 'کینیڈین ڈالر' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', nameUr: 'سوئس فرانک' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', nameUr: 'سویڈش کرونا' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', nameUr: 'نارویجین کرون' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', nameUr: 'ڈینش کرون' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', nameUr: 'نیوزی لینڈ ڈالر' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', nameUr: 'سنگاپور ڈالر' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', nameUr: 'ہانگ کانگ ڈالر' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', nameUr: 'ملیشیائی رنگٹ' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', nameUr: 'تھائی بھات' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', nameUr: 'انڈونیشیائی روپیہ' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', nameUr: 'فلپائنی پیسو' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', nameUr: 'ویتنامی ڈانگ' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', nameUr: 'بنگلہ دیشی ٹکا' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', nameUr: 'سری لنکن روپیہ' },
  { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee', nameUr: 'نیپالی روپیہ' },
  { code: 'AFN', symbol: '؋', name: 'Afghan Afghani', nameUr: 'افغانی افغانی' },
  { code: 'IRR', symbol: '﷼', name: 'Iranian Rial', nameUr: 'ایرانی ریال' },
  { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar', nameUr: 'عراقی دینار' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', nameUr: 'ترکی لیرا' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', nameUr: 'روسی روبل' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', nameUr: 'یوکرینی ہریونیا' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', nameUr: 'پولش زلوٹی' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', nameUr: 'چیک کرونا' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', nameUr: 'ہنگریئن فورنٹ' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', nameUr: 'رومانیائی لیو' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', nameUr: 'بلغاریائی لیو' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', nameUr: 'کروشین کونا' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', nameUr: 'جنوبی افریقی رانڈ' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', nameUr: 'نائجیریائی نائرا' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', nameUr: 'مصری پاؤنڈ' },
  { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham', nameUr: 'مراکشی درہم' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', nameUr: 'کینیا شلنگ' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', nameUr: 'گھانا سیڈی' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', nameUr: 'ایتھوپیا بر' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', nameUr: 'تنزانیائی شلنگ' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', nameUr: 'برازیلی ریئل' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', nameUr: 'میکسیکن پیسو' },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', nameUr: 'ارجنٹائن پیسو' },
  { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso', nameUr: 'چلین پیسو' },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', nameUr: 'کولمبیا پیسو' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', nameUr: 'پیرو سول' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', nameUr: 'اسرائیلی شیکل' },
  { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar', nameUr: 'اردنی دینار' },
  { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound', nameUr: 'لبنانی پاؤنڈ' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar', nameUr: 'تائیوان ڈالر' },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona', nameUr: 'آئس لینڈ کرونا' },
  { code: 'ALL', symbol: 'L', name: 'Albanian Lek', nameUr: 'البانی لیک' },
  { code: 'AMD', symbol: '֏', name: 'Armenian Dram', nameUr: 'آرمینیائی ڈرام' },
  { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', nameUr: 'آذربائیجانی منات' },
  { code: 'GEL', symbol: '₾', name: 'Georgian Lari', nameUr: 'جارجیائی لاری' },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', nameUr: 'قزاخستانی ٹینگے' },
  { code: 'UZS', symbol: 'soʻm', name: 'Uzbekistani Som', nameUr: 'ازبکستانی سوم' },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', nameUr: 'میانمار کیات' },
  { code: 'KHR', symbol: '៛', name: 'Cambodian Riel', nameUr: 'کمبوڈیائی ریئل' },
  { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee', nameUr: 'ماریشس روپیہ' },
  { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar', nameUr: 'تیونسی دینار' },
  { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar', nameUr: 'الجیریائی دینار' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', nameUr: 'مغربی افریقی فرانک' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', nameUr: 'وسطی افریقی فرانک' },
];

const currencyMap = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code?: string): CurrencyOption {
  return currencyMap.get(code || 'PKR') ?? currencyMap.get('PKR')!;
}

export function getCurrencyLabel(code: string, lang?: string) {
  const c = getCurrency(code);
  const name = normalizeLanguage(lang) === 'ur' ? c.nameUr : c.name;
  return `${c.code} (${c.symbol}) — ${name}`;
}
