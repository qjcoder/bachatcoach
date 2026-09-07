import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';

const BACHAT_GREEN = '#A3E635';

type BrandWordmarkProps = {
  /** Font size for the wordmark */
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/** Two-tone BACHAT (green) + COACH (white) lockup */
export function BrandWordmark({ fontSize = 28, style, textStyle }: BrandWordmarkProps) {
  // Extra lineHeight + padding prevents bold uppercase glyphs clipping at the top on iOS.
  const lineHeight = Math.ceil(fontSize * 1.35);
  const textPad = {
    fontSize,
    lineHeight,
    paddingTop: Math.ceil(fontSize * 0.12),
    paddingBottom: Math.ceil(fontSize * 0.06),
  };

  return (
    <View style={[styles.row, style]} accessibilityRole="header" accessibilityLabel="BachatCoach">
      <AppText
        allowFontScaling={false}
        style={[styles.base, textPad, { color: BACHAT_GREEN }, textStyle]}>
        BACHAT
      </AppText>
      <AppText
        allowFontScaling={false}
        style={[styles.base, textPad, { color: '#FFFFFF' }, textStyle]}>
        COACH
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  base: {
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
