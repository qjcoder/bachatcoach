import { type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BrandLogo } from '@/components/BrandLogo';
import { Brand } from '@/constants/theme';

type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <LinearGradient
          colors={['#10B981', '#059669', '#047857', '#065F46']}
          locations={[0, 0.35, 0.7, 1]}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <View style={styles.heroPattern}>
            <View style={[styles.circle, styles.circleA]} />
            <View style={[styles.circle, styles.circleB]} />
          </View>
          <BrandLogo size={72} variant="light" />
          <AppText variant="h1" color="#FFFFFF" align="center" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="bodySmall" color="rgba(255,255,255,0.88)" align="center" style={styles.subtitle}>
            {subtitle}
          </AppText>
        </LinearGradient>

        <View style={styles.cardWrap}>
          <View style={styles.card}>{children}</View>
        </View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  scroll: {
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circleA: {
    width: 180,
    height: 180,
    top: -50,
    right: -30,
  },
  circleB: {
    width: 140,
    height: 140,
    bottom: 10,
    left: -40,
  },
  title: {
    marginTop: 16,
    maxWidth: 300,
  },
  subtitle: {
    marginTop: 6,
    maxWidth: 280,
  },
  cardWrap: {
    marginTop: -20,
    marginHorizontal: 20,
    zIndex: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
