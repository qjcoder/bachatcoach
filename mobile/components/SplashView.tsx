import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { BrandLogo } from '@/components/BrandLogo';
import { getDailyQuote } from '@/lib/dailyQuotes';
import { scriptLanguage } from '@/lib/language';

type SplashViewProps = {
  onFinish: () => void;
};

export function SplashView({ onFinish }: SplashViewProps) {
  const { i18n } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const dailyQuote = getDailyQuote(scriptLanguage(i18n.language));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start(() =>
        onFinish()
      );
    }, 2600);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onFinish]);

  return (
    <LinearGradient
      colors={['#1E3A8A', '#0F172A', '#0B1020', '#000000']}
      locations={[0, 0.35, 0.7, 1]}
      style={styles.container}>
      <View style={styles.pattern}>
        <View style={[styles.circle, styles.circleA]} />
        <View style={[styles.circle, styles.circleB]} />
        <View style={[styles.circle, styles.circleC]} />
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}>
        <BrandLogo mode="full" size={120} />
        <View style={styles.quoteBox}>
          <AppText variant="body" color="rgba(255,255,255,0.95)" align="center" style={styles.quote}>
            "{dailyQuote.text}"
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.7)" align="center" style={styles.source}>
            — {dailyQuote.source}
          </AppText>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 10000,
    elevation: 10000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pattern: { ...StyleSheet.absoluteFill },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleA: { width: 280, height: 280, top: -90, right: -70 },
  circleB: { width: 200, height: 200, bottom: 80, left: -80 },
  circleC: { width: 120, height: 120, bottom: 40, right: 30 },
  content: { alignItems: 'center', paddingHorizontal: 40, width: '100%' },
  quoteBox: {
    marginTop: 28,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    maxWidth: 340,
    width: '100%',
  },
  quote: { lineHeight: 24, fontStyle: 'italic' },
  source: { marginTop: 10, lineHeight: 18 },
});
