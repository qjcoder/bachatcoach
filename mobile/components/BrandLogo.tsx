import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { BrandWordmark } from '@/components/BrandWordmark';

const logoIcon = require('@/assets/images/logo-icon.png');
const logoMark = require('@/assets/images/logo-mark-v4.png');
const logoAuth = require('@/assets/images/logo-auth.png');
const logoSplash = require('@/assets/images/splash-logo.png');

type BrandLogoProps = {
  size?: number;
  /** Cap width for full/auth marks (preferred for splash — avoids edge crop) */
  maxWidth?: number;
  /**
   * `icon` — square app icon (may clip round)
   * `mark` — B mark on black (splash lockup)
   * `lockup` — mark + BACHATCOACH wordmark (matches splash reference)
   * `full` — splash PNG with tagline
   * `auth` — login/signup mark
   */
  mode?: 'icon' | 'mark' | 'lockup' | 'full' | 'auth';
  showTagline?: boolean;
  taglineColor?: string;
  /** @deprecated Use `mode` instead */
  variant?: 'light' | 'dark';
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

function logoAspect(source: number) {
  const resolve =
    typeof Image.resolveAssetSource === 'function' ? Image.resolveAssetSource : undefined;
  const resolved = resolve?.(source);
  return resolved?.width && resolved?.height ? resolved.width / resolved.height : 1;
}

export function BrandLogo({
  size = 72,
  maxWidth,
  mode = 'icon',
  showTagline = false,
  taglineColor = 'rgba(255,255,255,0.85)',
  style,
  containerStyle,
}: BrandLogoProps) {
  const { t } = useTranslation();

  if (mode === 'mark' || mode === 'lockup') {
    const markSize = maxWidth != null ? maxWidth : size;
    return (
      <View style={[styles.lockupWrap, containerStyle]}>
        <Image
          source={logoMark}
          style={[styles.mark, { width: markSize, height: markSize }, style]}
          resizeMode="contain"
          accessibilityLabel="BachatCoach"
        />
        {mode === 'lockup' ? (
          <BrandWordmark fontSize={Math.max(18, Math.round(markSize * 0.16))} style={styles.wordmark} />
        ) : null}
      </View>
    );
  }

  if (mode === 'full' || mode === 'auth') {
    const source = mode === 'full' ? logoSplash : logoAuth;
    const aspectRatio = logoAspect(source);
    const fallbackWidth = size * (mode === 'full' ? 2.4 : 2.1);
    const width = maxWidth != null ? maxWidth : fallbackWidth;
    const height = Math.round(width / aspectRatio);
    return (
      <View style={[styles.fullWrap, containerStyle, { width }]}>
        <Image
          source={source}
          style={[styles.full, { width, height }, style]}
          resizeMode="contain"
          accessibilityLabel="BachatCoach"
        />
        {showTagline ? (
          <AppText
            variant="captionBold"
            color={taglineColor}
            align="center"
            style={[styles.tagline, { maxWidth: width }]}>
            {t('common.tagline')}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconWrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FFFFFF',
        },
        containerStyle,
      ]}>
      <Image
        source={logoMark}
        style={[{ width: size * 0.92, height: size * 0.92 }, style]}
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
    overflow: 'hidden',
  },
  lockupWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'visible',
  },
  mark: {},
  wordmark: {
    marginTop: 14,
    overflow: 'visible',
  },
  fullWrap: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  full: {},
  tagline: {
    marginTop: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
