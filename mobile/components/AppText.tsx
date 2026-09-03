import { Text, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '@/hooks/useIsRTL';
import { normalizeLanguage } from '@/lib/language';
import { type AppLanguage, type TypeVariantName, typeStyle } from '@/constants/typography';
import { useLayoutScale } from '@/lib/layout';
import { useColors } from '@/components/useColorScheme';

const RTL_FULL_WIDTH_VARIANTS = new Set<TypeVariantName>([
  'display',
  'h1',
  'h2',
  'h3',
  'overline',
  'label',
  'bodySemibold',
  'bodySmallBold',
  'amountSm',
  'amountMd',
]);

type AppTextProps = TextProps & {
  variant?: TypeVariantName;
  color?: string;
  align?: TextStyle['textAlign'];
  muted?: boolean;
  /** Use inside flex rows — avoids width:100% that breaks Android RTL layout */
  shrink?: boolean;
};

export function AppText({
  variant = 'body',
  color,
  align,
  muted,
  shrink,
  style,
  children,
  ...props
}: AppTextProps) {
  const { i18n } = useTranslation();
  const isRTL = useIsRTL();
  const { factor } = useLayoutScale();
  const colors = useColors();
  const lang: AppLanguage = normalizeLanguage(i18n.language);
  // `textAlign: 'left'` is logical start — with writingDirection rtl it aligns to the right.
  const textAlign = align ?? 'left';
  const rtlFullWidth =
    isRTL && align !== 'center' && !shrink && RTL_FULL_WIDTH_VARIANTS.has(variant);

  return (
    <Text
      style={[
        typeStyle(lang, variant, factor),
        { textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' },
        rtlFullWidth ? styles.rtlFullWidth : isRTL && align !== 'center' ? styles.rtlStretch : null,
        color ? { color } : muted ? { color: colors.muted } : { color: colors.text },
        style,
      ]}
      {...props}>
      {children}
    </Text>
  );
}

export function useAppType() {
  const { i18n } = useTranslation();
  const isRTL = useIsRTL();
  const { factor } = useLayoutScale();
  const lang: AppLanguage = normalizeLanguage(i18n.language);
  return {
    lang,
    isRTL,
    type: (variant: TypeVariantName) => typeStyle(lang, variant, factor),
  };
}

const styles = StyleSheet.create({
  rtlStretch: { alignSelf: 'stretch', textAlign: 'left' },
  rtlFullWidth: { alignSelf: 'stretch', width: '100%', textAlign: 'left' },
});
