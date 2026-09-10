import { useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  I18nManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/AppText';
import { BrandLogo } from '@/components/BrandLogo';
import { RTLRow } from '@/components/RTLRow';
import { Brand, Radius, Spacing, TxnKind } from '@/constants/theme';

export const ONBOARDING_DONE_KEY = 'bachatcoach_onboarding_done';

type OnboardingViewProps = {
  onFinish: () => void;
};

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'cashflow',
    icon: 'wallet-outline' as const,
    color: TxnKind.expense,
    titleKey: 'onboarding.cashflowTitle',
    bodyKey: 'onboarding.cashflowBody',
  },
  {
    key: 'loans',
    icon: 'people-outline' as const,
    color: TxnKind.income,
    titleKey: 'onboarding.loansTitle',
    bodyKey: 'onboarding.loansBody',
  },
  {
    key: 'safe',
    icon: 'shield-checkmark-outline' as const,
    color: TxnKind.savings,
    titleKey: 'onboarding.safeTitle',
    bodyKey: 'onboarding.safeBody',
  },
] as const;

export async function isOnboardingDone() {
  const v = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
  return v === '1' || v === 'true';
}

export async function markOnboardingDone() {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1');
}

export function OnboardingView({ onFinish }: OnboardingViewProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const finishing = useRef(false);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;
  const rtl = I18nManager.isRTL;

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    await markOnboardingDone();
    onFinish();
  }, [onFinish]);

  const next = () => {
    if (last) {
      void finish();
      return;
    }
    setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="dark" />
      <RTLRow style={styles.top} gap={12}>
        <BrandLogo size={36} />
        <Pressable onPress={() => void finish()} hitSlop={10} accessibilityRole="button">
          <AppText variant="captionBold" color={Brand.primary}>
            {t('onboarding.skip')}
          </AppText>
        </Pressable>
      </RTLRow>

      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: `${slide.color}18` }]}>
          <Ionicons name={slide.icon} size={42} color={slide.color} />
        </View>
        <AppText variant="h2" color="#0F172A" align="center" style={styles.title}>
          {t(slide.titleKey)}
        </AppText>
        <AppText variant="body" color="#64748B" align="center" style={styles.body}>
          {t(slide.bodyKey)}
        </AppText>
      </View>

      <View style={styles.footer}>
        <RTLRow gap={6} style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[styles.dot, i === index && { backgroundColor: slide.color, width: 18 }]}
            />
          ))}
        </RTLRow>

        <Pressable onPress={next} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
          <LinearGradient
            colors={[slide.color, Brand.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}>
            <AppText variant="button" color="#FFFFFF">
              {last ? t('onboarding.getStarted') : t('common.next')}
            </AppText>
            <Ionicons
              name={rtl ? 'arrow-back' : 'arrow-forward'}
              size={18}
              color="#FFFFFF"
            />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9990,
    elevation: 9990,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: Spacing.lg,
  },
  top: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    maxWidth: Math.min(SCREEN_W, 420),
    alignSelf: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: { marginBottom: 10 },
  body: { lineHeight: 22, paddingHorizontal: 8 },
  footer: { gap: 16, paddingBottom: 8 },
  dots: { justifyContent: 'center', alignItems: 'center' },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  cta: {
    minHeight: 52,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
});
