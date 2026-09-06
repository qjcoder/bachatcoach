import { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  I18nManager,
  Dimensions,
  ScrollView,
} from 'react-native';
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

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
/** Large splash mark — fills width without edge crop */
const LOGO_MAX_W = Math.min(SCREEN_W - 48, 360);

export function SplashView({ onFinish }: SplashViewProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
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
      <View style={styles.pattern} pointerEvents="none">
        <View style={[styles.circle, styles.circleA]} />
        <View style={[styles.circle, styles.circleB]} />
        <View style={[styles.circle, styles.circleC]} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 96,
            opacity: fadeAnim,
          },
        ]}>
        <View style={styles.logoBlock}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
            <BrandLogo mode="full" maxWidth={LOGO_MAX_W} />
          </Animated.View>
        </View>

        <View style={styles.quoteBlock}>
          <ScrollView
            style={styles.quoteScroll}
            contentContainerStyle={styles.quoteScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.quoteBox}>
              <AppText
                variant="body"
                color="rgba(255,255,255,0.95)"
                align="center"
                style={styles.quote}
                numberOfLines={5}>
                "{dailyQuote.text}"
              </AppText>
              {dailyQuote.source ? (
                <AppText
                  variant="caption"
                  color="rgba(255,255,255,0.65)"
                  align="center"
                  style={styles.source}
                  numberOfLines={1}>
                  — {dailyQuote.source}
                </AppText>
              ) : null}
            </View>
          </ScrollView>
        </View>
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
    overflow: 'hidden',
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
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoBlock: {
    flex: 1,
    width: '100%',
    maxWidth: LOGO_MAX_W + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteBlock: {
    width: '100%',
    maxWidth: Math.min(SCREEN_W - 48, 360),
    alignItems: 'center',
    marginBottom: Math.min(24, SCREEN_H * 0.02),
  },
  quoteScroll: {
    width: '100%',
    maxHeight: SCREEN_H * 0.22,
  },
  quoteScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  quoteBox: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    width: '100%',
    alignSelf: 'center',
  },
  quote: { lineHeight: 22, fontStyle: 'italic' },
  source: { marginTop: 8, lineHeight: 16 },
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
