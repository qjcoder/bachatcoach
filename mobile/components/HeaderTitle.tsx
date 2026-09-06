import { Text, View, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '@/hooks/useIsRTL';
import { normalizeLanguage } from '@/lib/language';
import { getFontFamily, Type } from '@/constants/typography';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type HeaderTitleProps = {
  title: string;
  subtitle?: string;
  light?: boolean;
};

export function HeaderTitle({ title, subtitle, light }: HeaderTitleProps) {
  const { i18n } = useTranslation();
  const isRTL = useIsRTL();
  const colors = Colors[useColorScheme() ?? 'light'];
  const lang = normalizeLanguage(i18n.language);
  const fontSize = lang === 'ur' ? 16 : Type.h3.fontSize;
  const muted = light ? 'rgba(255,255,255,0.7)' : colors.muted;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text
        style={[
          styles.title,
          {
            fontFamily: getFontFamily(lang, Type.h3.fontWeight),
            fontSize,
            lineHeight: fontSize + 4,
            color: light ? '#FFFFFF' : colors.text,
            writingDirection: isRTL ? 'rtl' : 'ltr',
          },
        ]}
        numberOfLines={subtitle ? 1 : 2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              fontFamily: getFontFamily(lang, Type.caption.fontWeight),
              color: muted,
              writingDirection: isRTL ? 'rtl' : 'ltr',
            },
          ]}
          numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Centers custom header titles in LTR and RTL (React Navigation quirk). */
export const headerTitleContainerStyle = {
  position: 'absolute' as const,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  ...(Platform.OS === 'android' ? { elevation: 0 } : {}),
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    textAlign: 'center',
    width: '100%',
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
    opacity: 0.9,
  },
});
