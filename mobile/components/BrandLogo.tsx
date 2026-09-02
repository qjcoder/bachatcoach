import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

const logoIcon = require('@/assets/images/logo-icon.png');
const logoFull = require('@/assets/images/logo-full.png');

type BrandLogoProps = {
  size?: number;
  /** `icon` — app mark only; `full` — icon + wordmark + tagline */
  mode?: 'icon' | 'full';
  /** @deprecated Use `mode` instead */
  variant?: 'light' | 'dark';
  style?: StyleProp<ImageStyle>;
};

export function BrandLogo({ size = 72, mode = 'icon', style }: BrandLogoProps) {
  if (mode === 'full') {
    const width = size * 2.4;
    const height = size * 1.85;
    return (
      <Image
        source={logoFull}
        style={[styles.full, { width, height }, style]}
        resizeMode="contain"
        accessibilityLabel="BachatCoach"
      />
    );
  }

  return (
    <View style={[styles.iconWrap, { width: size, height: size }]}>
      <Image
        source={logoIcon}
        style={[styles.icon, { width: size, height: size }, style]}
        resizeMode="contain"
        accessibilityLabel="BachatCoach"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    borderRadius: 999,
  },
  full: {},
});
