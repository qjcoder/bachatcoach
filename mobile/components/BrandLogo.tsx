import { View, Text, StyleSheet } from 'react-native';
import { getFontFamily } from '@/constants/typography';

type BrandLogoProps = {
  size?: number;
  variant?: 'light' | 'dark';
};

export function BrandLogo({ size = 72, variant = 'light' }: BrandLogoProps) {
  const isLight = variant === 'light';

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
        },
        isLight ? styles.outerLight : styles.outerDark,
      ]}>
      <View
        style={[
          styles.inner,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size * 0.22,
          },
          isLight ? styles.innerLight : styles.innerDark,
        ]}>
        <Text
          style={[
            styles.mark,
            {
              fontSize: size * 0.28,
              fontFamily: getFontFamily('en', 800),
            },
            isLight ? styles.markLight : styles.markDark,
          ]}>
          BC
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  outerLight: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  outerDark: {
    backgroundColor: 'rgba(5,150,105,0.08)',
    borderColor: 'rgba(5,150,105,0.2)',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerLight: {
    backgroundColor: '#FFFFFF',
  },
  innerDark: {
    backgroundColor: '#059669',
  },
  mark: {
    letterSpacing: -1,
  },
  markLight: {
    color: '#059669',
  },
  markDark: {
    color: '#FFFFFF',
  },
});
