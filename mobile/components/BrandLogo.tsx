import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';

const logoIcon = require('@/assets/images/logo-icon.png');
const logoAuth = require('@/assets/images/logo-auth.png');
const logoSplash = require('@/assets/images/splash-logo.png');

type BrandLogoProps = {
  size?: number;
  /** Cap width for full/auth marks (preferred for splash — avoids edge crop) */
  maxWidth?: number;
  /** `icon` — app mark; `full` — splash mark; `auth` — login/signup mark */
  mode?: 'icon' | 'full' | 'auth';
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
  return resolved?.width && resolved?.height ? resolved.width / resolved.height : 1.28;
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

  if (mode === 'full' || mode === 'auth') {
    const source = mode === 'full' ? logoSplash : logoAuth;
    const aspectRatio = logoAspect(source);
    const fallbackWidth = size * (mode === 'full' ? 2.4 : 2.1);
    const width = maxWidth != null ? maxWidth : fallbackWidth;
    return (
      <View style={[styles.fullWrap, containerStyle, { width, maxWidth: '100%' as const }]}>
        <Image
          source={source}
          style={[styles.full, { width: '100%', aspectRatio }, style]}
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
    <View style={[styles.iconWrap, { width: size, height: size }, containerStyle]}>
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
  fullWrap: {
    alignItems: 'center',
    alignSelf: 'center',
  },
  full: {
    // width + aspectRatio only — never force a mismatched height (causes stretch)
  },
  tagline: {
    marginTop: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
