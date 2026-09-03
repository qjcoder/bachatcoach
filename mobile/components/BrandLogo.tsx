import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';

const logoIcon = require('@/assets/images/logo-icon.png');
const logoFull = require('@/assets/images/logo-full.png');
const logoAuth = require('@/assets/images/logo-auth.png');

type BrandLogoProps = {
  size?: number;
  /** `icon` — app mark; `full` — splash mark with slogan; `auth` — login/signup mark */
  mode?: 'icon' | 'full' | 'auth';
  showTagline?: boolean;
  taglineColor?: string;
  /** @deprecated Use `mode` instead */
  variant?: 'light' | 'dark';
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function BrandLogo({
  size = 72,
  mode = 'icon',
  showTagline = false,
  taglineColor = 'rgba(255,255,255,0.85)',
  style,
  containerStyle,
}: BrandLogoProps) {
  const { t } = useTranslation();

  if (mode === 'full' || mode === 'auth') {
    // full: ~828×646 with “Save Smart. Grow Better.”
    // auth: ~490×336 wordmark only (login/signup)
    const ratio = mode === 'full' ? 646 / 828 : 336 / 490;
    const width = size * (mode === 'full' ? 2.7 : 2.2);
    const height = width * ratio;
    return (
      <View style={[styles.fullWrap, containerStyle]}>
        <Image
          source={mode === 'full' ? logoFull : logoAuth}
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
  },
  full: {},
  tagline: {
    marginTop: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
