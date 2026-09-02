import { Text, View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsRTL } from '@/hooks/useIsRTL';
import { normalizeLanguage } from '@/lib/language';
import { getFontFamily, Type } from '@/constants/typography';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type HeaderTitleProps = {
  title: string;
  light?: boolean;
};

/** Horizontal inset so title stays visually centered beside nav buttons. */
const HEADER_SIDE_INSET = Platform.OS === 'android' ? 72 : 56;

export function HeaderTitle({ title, light }: HeaderTitleProps) {
  const { i18n } = useTranslation();
  const isRTL = useIsRTL();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { width } = useWindowDimensions();
  const lang = normalizeLanguage(i18n.language);
  const fontSize = lang === 'ur' ? 16 : Type.h3.fontSize;
  const titleWidth = width - HEADER_SIDE_INSET * 2;

  return (
    <View style={[styles.wrap, { width: titleWidth }]}>
      <Text
        style={[
          styles.title,
          {
            fontFamily: getFontFamily(lang, Type.h3.fontWeight),
            fontSize,
            lineHeight: fontSize + 8,
            color: light ? '#FFFFFF' : colors.text,
            writingDirection: isRTL ? 'rtl' : 'ltr',
          },
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}>
        {title}
      </Text>
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
  },
  title: {
    textAlign: 'center',
    width: '100%',
  },
});
