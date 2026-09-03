import { type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BrandLogo } from '@/components/BrandLogo';

const { width } = Dimensions.get('window');

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
      <LinearGradient
        colors={['#064E3B', '#065F46', '#047857', '#059669', '#10B981']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blobs */}
      <View style={[styles.blob, styles.blobTL]} />
      <View style={[styles.blob, styles.blobBR]} />
      <View style={[styles.blob, styles.blobM]} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>

        {/* Logo + heading */}
        <View style={styles.hero}>
          <View style={styles.logoRing}>
            <BrandLogo size={60} />
          </View>
          <AppText variant="h1" color="#FFFFFF" align="center" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="bodySmall" color="rgba(255,255,255,0.75)" align="center" style={styles.subtitle}>
            {subtitle}
          </AppText>
        </View>

        {/* Glass card */}
        <View style={styles.glass}>
          {children}
        </View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20 },

  /* Blobs */
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  blobTL: { width: 280, height: 280, top: -100, left: -80 },
  blobBR: { width: 220, height: 220, bottom: 40, right: -60 },
  blobM:  { width: 160, height: 160, top: '40%', left: -50, backgroundColor: 'rgba(255,255,255,0.04)' },

  /* Hero */
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
  title: { fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { marginTop: 4, maxWidth: 260 },

  /* Glass card */
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
  },

  footer: { marginTop: 24, alignItems: 'center' },
});
