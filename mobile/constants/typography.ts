import { type TextStyle } from 'react-native';
import { type AppLanguage, usesLatinFont } from '@/lib/language';

export type FontWeight = 400 | 500 | 600 | 700 | 800;

export type { AppLanguage };

const INTER_FONTS: Record<FontWeight, string> = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
};

const URDU_FONTS: Record<FontWeight, string> = {
  400: 'NotoNaskhArabic_400Regular',
  500: 'NotoNaskhArabic_500Medium',
  600: 'NotoNaskhArabic_600SemiBold',
  700: 'NotoNaskhArabic_700Bold',
  800: 'NotoNaskhArabic_700Bold',
};

export function getFontFamily(lang: AppLanguage, weight: FontWeight = 400): string {
  const map = usesLatinFont(lang) ? INTER_FONTS : URDU_FONTS;
  return map[weight] ?? map[400];
}

type TypeVariant = {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  letterSpacing: number;
  textTransform?: TextStyle['textTransform'];
};

export const Type = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: 800, letterSpacing: -0.8 },
  h1: { fontSize: 26, lineHeight: 34, fontWeight: 800, letterSpacing: -0.5 },
  h2: { fontSize: 20, lineHeight: 28, fontWeight: 700, letterSpacing: -0.3 },
  h3: { fontSize: 17, lineHeight: 24, fontWeight: 700, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: 400, letterSpacing: 0 },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: 500, letterSpacing: 0 },
  bodySemibold: { fontSize: 16, lineHeight: 24, fontWeight: 600, letterSpacing: 0 },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: 400, letterSpacing: 0 },
  bodySmallMedium: { fontSize: 14, lineHeight: 20, fontWeight: 500, letterSpacing: 0 },
  bodySmallBold: { fontSize: 14, lineHeight: 20, fontWeight: 700, letterSpacing: 0 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: 600, letterSpacing: 0.15 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 500, letterSpacing: 0.1 },
  captionBold: { fontSize: 12, lineHeight: 16, fontWeight: 700, letterSpacing: 0.1 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' },
  amount: { fontSize: 32, lineHeight: 40, fontWeight: 800, letterSpacing: -0.6 },
  amountMd: { fontSize: 18, lineHeight: 24, fontWeight: 800, letterSpacing: -0.2 },
  amountSm: { fontSize: 15, lineHeight: 20, fontWeight: 700, letterSpacing: -0.1 },
  button: { fontSize: 16, lineHeight: 22, fontWeight: 600, letterSpacing: 0.1 },
  tab: { fontSize: 11, lineHeight: 14, fontWeight: 600, letterSpacing: 0.2 },
} as const satisfies Record<string, TypeVariant>;

export type TypeVariantName = keyof typeof Type;

export function typeStyle(lang: AppLanguage, variant: TypeVariantName, scale = 1): TextStyle {
  const v = Type[variant] as TypeVariant;
  const useTransform = v.textTransform && lang !== 'ur';
  const urduBoost = lang === 'ur' ? 2 : 0;
  const rtl = lang === 'ur';
  const fontSize = Math.max(10, Math.round(v.fontSize * scale));
  const lineHeight = Math.max(fontSize + 2, Math.round((v.lineHeight + urduBoost) * scale));
  return {
    fontFamily: getFontFamily(lang, v.fontWeight),
    fontSize,
    lineHeight,
    letterSpacing: rtl ? 0 : v.letterSpacing,
    writingDirection: rtl ? 'rtl' : 'ltr',
    ...(useTransform ? { textTransform: v.textTransform } : {}),
  };
}

/** Vertical rhythm helpers */
export const TextSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;
