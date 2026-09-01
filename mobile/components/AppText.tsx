import { Text, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '@/hooks/useIsRTL';
import { type AppLanguage, type TypeVariantName, typeStyle } from '@/constants/typography';

type AppTextProps = TextProps & {
  variant?: TypeVariantName;
  color?: string;
  align?: TextStyle['textAlign'];
  muted?: boolean;
};

export function AppText({
  variant = 'body',
  color,
  align,
  muted,
  style,
  children,
  ...props
}: AppTextProps) {
  const { i18n } = useTranslation();
  const isRTL = useIsRTL();
  const lang: AppLanguage = i18n.language === 'ur' ? 'ur' : 'en';
  const textAlign = align ?? (isRTL ? 'right' : 'left');

  return (
    <Text
      style={[
        typeStyle(lang, variant),
        { textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' },
        isRTL && align !== 'center' ? styles.rtlStretch : null,
        color ? { color } : muted ? styles.muted : null,
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
  const lang: AppLanguage = i18n.language === 'ur' ? 'ur' : 'en';
  return {
    lang,
    isRTL,
    type: (variant: TypeVariantName) => typeStyle(lang, variant),
  };
}

const styles = StyleSheet.create({
  muted: { opacity: 0.72 },
  rtlStretch: { alignSelf: 'stretch', textAlign: 'right' },
});
