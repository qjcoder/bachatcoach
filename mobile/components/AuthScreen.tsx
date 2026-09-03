import { type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { BrandLogo } from '@/components/BrandLogo';
import { useTheme } from '@/context/ThemeContext';
import { setStoredLanguage } from '@/i18n';
import { type AppLanguage, normalizeLanguage } from '@/lib/language';
import { Brand } from '@/constants/theme';

const { width } = Dimensions.get('window');

const LANGS: { code: AppLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'اردو' },
  { code: 'roman', label: 'Roman' },
];

type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';
  const currentLang = normalizeLanguage(i18n.language);

  const gradientColors = isDark
    ? (['#020617', '#052e1f', '#064E3B', '#047857'] as const)
    : (['#064E3B', '#065F46', '#047857', '#059669', '#10B981'] as const);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={[...gradientColors]}
        locations={isDark ? [0, 0.3, 0.65, 1] : [0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.blob, styles.blobTL]} />
      <View style={[styles.blob, styles.blobBR]} />
      <View style={[styles.blob, styles.blobM]} />

      <Pressable
        onPress={toggle}
        hitSlop={10}
        accessibilityLabel="Toggle theme"
        style={[styles.themeBtn, { top: insets.top + 8 }]}>
        <Ionicons
          name={isDark ? 'sunny-outline' : 'moon-outline'}
          size={22}
          color="#FFFFFF"
        />
      </Pressable>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>

        <View style={styles.hero}>
          <View style={styles.logoRing}>
            <BrandLogo size={60} />
          </View>
          <View style={styles.titleSlot}>
            <AppText
              variant="h1"
              color="#FFFFFF"
              align="center"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={styles.title}>
              {title}
            </AppText>
          </View>
          <View style={styles.subtitleSlot}>
            <AppText
              variant="bodySmall"
              color="rgba(255,255,255,0.75)"
              align="center"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={styles.subtitle}>
              {subtitle}
            </AppText>
          </View>
        </View>

        <View style={[styles.glass, isDark && styles.glassDark]}>
          {children}
        </View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}

        <View style={styles.langTrack}>
          {LANGS.map((lang) => {
            const selected = currentLang === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => setStoredLanguage(lang.code)}
                style={[styles.langChip, selected && styles.langChipOn]}>
                <AppText
                  variant="captionBold"
                  color={selected ? Brand.primary : 'rgba(255,255,255,0.8)'}
                  align="center">
                  {lang.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20 },

  themeBtn: {
    position: 'absolute',
    right: 18,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  blobTL: { width: 280, height: 280, top: -100, left: -80 },
  blobBR: { width: 220, height: 220, bottom: 40, right: -60 },
  blobM: { width: 160, height: 160, top: '40%', left: -50, backgroundColor: 'rgba(255,255,255,0.04)' },

  hero: { alignItems: 'center', marginBottom: 28, width: '100%' },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titleSlot: {
    width: '100%',
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.3,
    fontSize: 24,
    lineHeight: 32,
    width: '100%',
  },
  subtitleSlot: {
    width: '100%',
    height: 22,
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    width: '100%',
  },

  glass: {
    width: '100%',
    maxWidth: width - 40,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  glassDark: {
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderColor: 'rgba(148,163,184,0.25)',
  },

  footer: { marginTop: 24, alignItems: 'center' },

  langTrack: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    padding: 3,
    width: '100%',
    maxWidth: 320,
    // Keep English → Urdu → Roman order in both LTR and RTL
    direction: 'ltr',
  },
  langChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
  },
  langChipOn: { backgroundColor: '#FFFFFF' },
});
