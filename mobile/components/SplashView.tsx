import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { BrandLogo } from '@/components/BrandLogo';

const SPLASH_QUOTES = [
  'splash.quote1',
  'splash.quote2',
  'splash.quote3',
  'splash.quote4',
  'splash.quote5',
];

type SplashViewProps = {
  onFinish: () => void;
};

export function SplashView({ onFinish }: SplashViewProps) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const quoteIndex = new Date().getDate() % SPLASH_QUOTES.length;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() =>
        onFinish()
      );
    }, 2800);

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim, onFinish]);

  return (
    <LinearGradient
      colors={['#10B981', '#059669', '#047857', '#065F46']}
      locations={[0, 0.3, 0.65, 1]}
      style={styles.container}>
      <View style={styles.pattern}>
        <View style={[styles.circle, styles.circleA]} />
        <View style={[styles.circle, styles.circleB]} />
      </View>

      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <BrandLogo size={96} variant="light" />
        <AppText variant="display" color="#FFFFFF" align="center" style={styles.appName}>
          {t('common.appName')}
        </AppText>
        <AppText variant="bodyMedium" color="rgba(255,255,255,0.85)" align="center" style={styles.tagline}>
          {t('common.tagline')}
        </AppText>

        <View style={styles.quoteBox}>
          <AppText variant="h1" color="rgba(255,255,255,0.5)" style={styles.quoteMark}>
            "
          </AppText>
          <AppText variant="body" color="rgba(255,255,255,0.95)" align="center" style={styles.quote}>
            {t(SPLASH_QUOTES[quoteIndex])}
          </AppText>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pattern: { ...StyleSheet.absoluteFillObject },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleA: { width: 260, height: 260, top: -80, right: -60 },
  circleB: { width: 200, height: 200, bottom: 60, left: -70 },
  content: { alignItems: 'center', paddingHorizontal: 36 },
  appName: { marginTop: 20 },
  tagline: { marginTop: 6 },
  quoteBox: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: 320,
  },
  quoteMark: { lineHeight: 20, marginBottom: 4 },
  quote: { fontStyle: 'italic' },
});
