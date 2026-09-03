import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView, Pressable, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { BrandLogo } from '@/components/BrandLogo';
import { getDailyQuote } from '@/lib/dailyQuotes';
import { scriptLanguage } from '@/lib/language';

type SplashViewProps = {
  onFinish: () => void;
};

export function SplashView({ onFinish }: SplashViewProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const nudgeAnim = useRef(new Animated.Value(0)).current;
  const finishing = useRef(false);
  const dailyQuote = getDailyQuote(scriptLanguage(i18n.language));
  const rtl = I18nManager.isRTL;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudgeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(nudgeAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fadeAnim, scaleAnim, nudgeAnim]);

  const handleContinue = () => {
    if (finishing.current) return;
    finishing.current = true;
    Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() =>
      onFinish()
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.pattern}>
        <View style={[styles.circle, styles.circleA]} />
        <View style={[styles.circle, styles.circleB]} />
        <View style={[styles.circle, styles.circleC]} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 88,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
        <BrandLogo mode="full" size={132} />
        <ScrollView
          style={styles.quoteScroll}
          contentContainerStyle={styles.quoteScrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.quoteBox}>
            <AppText variant="body" color="rgba(255,255,255,0.95)" align="center" style={styles.quote}>
              "{dailyQuote.text}"
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.7)" align="center" style={styles.source}>
              — {dailyQuote.source}
            </AppText>
          </View>
        </ScrollView>
      </Animated.View>

      <Animated.View
        style={[
          styles.nextWrap,
          {
            bottom: insets.bottom + 22,
            [rtl ? 'left' : 'right']: 22,
            opacity: fadeAnim,
            transform: [
              {
                translateX: nudgeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, rtl ? -6 : 6],
                }),
              },
            ],
          },
        ]}>
        <Pressable
          onPress={handleContinue}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('splash.continue')}
          style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}>
          <Ionicons name={rtl ? 'arrow-back' : 'arrow-forward'} size={22} color="#F8FAFC" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 10000,
    elevation: 10000,
    backgroundColor: '#000000',
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    width: '100%',
  },
  quoteScroll: {
    width: '100%',
    maxWidth: 340,
    flexGrow: 0,
    flexShrink: 1,
    marginTop: 28,
  },
  quoteScrollContent: { flexGrow: 1, justifyContent: 'center' },
  quoteBox: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    width: '100%',
  },
  quote: { lineHeight: 24, fontStyle: 'italic' },
  source: { marginTop: 10, lineHeight: 18 },
  nextWrap: {
    position: 'absolute',
  },
  nextBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(253,184,19,0.55)',
  },
  nextBtnPressed: {
    opacity: 0.75,
    backgroundColor: 'rgba(253,184,19,0.18)',
  },
});
