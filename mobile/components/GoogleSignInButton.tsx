import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { Brand, Radius } from '@/constants/theme';
import {
  isGoogleAuthConfigured,
  persistGoogleTokens,
  useGoogleAuthRequestWithDrive,
} from '@/lib/googleAuth';
import { useAuth } from '@/context/AuthContext';

type Props = {
  onSuccess?: () => void;
};

/** Google "G" logo rendered via text — no external image needed. */
function GoogleG() {
  return (
    <View style={gStyles.container}>
      <AppText style={gStyles.g}>G</AppText>
    </View>
  );
}

const gStyles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  g: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
    lineHeight: 22,
  },
});

export function GoogleSignInButton({ onSuccess }: Props) {
  const { t } = useTranslation();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [request, , promptAsync] = useGoogleAuthRequestWithDrive();
  const configured = isGoogleAuthConfigured();

  const handlePress = async () => {
    if (!configured) {
      Alert.alert(t('auth.googleNotConfiguredTitle'), t('auth.googleNotConfigured'));
      return;
    }
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        if (result.type === 'error') {
          Alert.alert('Error', result.error?.message || t('auth.googleFailed'));
        }
        return;
      }

      const idToken =
        result.authentication?.idToken ||
        (result.params?.id_token as string | undefined);
      const accessToken =
        result.authentication?.accessToken ||
        (result.params?.access_token as string | undefined);
      const refreshToken = result.authentication?.refreshToken;

      if (!idToken) {
        Alert.alert('Error', t('auth.googleNoIdToken'));
        return;
      }

      await persistGoogleTokens(accessToken, refreshToken);
      await loginWithGoogle(idToken);
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : t('auth.googleFailed'));
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={handlePress}
        disabled={loading || !request}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed, (loading || !request) && styles.disabled]}>
        <LinearGradient
          colors={['#4285F4', '#34A853', '#FBBC05', '#EA4335']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBorder}>
          <View style={styles.inner}>
            {loading ? (
              <ActivityIndicator color={Brand.text} size="small" />
            ) : (
              <>
                <GoogleG />
                <AppText variant="bodySemibold" color={Brand.text} style={styles.label}>
                  {t('auth.continueWithGoogle')}
                </AppText>
              </>
            )}
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <AppText variant="caption" color={Brand.textMuted} style={styles.orText}>
          {t('auth.orEmail')}
        </AppText>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },

  pressable: { borderRadius: Radius.lg },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.55 },

  gradientBorder: {
    borderRadius: Radius.lg,
    padding: 1.5,
  },
  inner: {
    minHeight: 52,
    borderRadius: Radius.lg - 1,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  label: { fontSize: 15, letterSpacing: 0.1 },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
    gap: 10,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#CBD5E1' },
  orText: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 11 },
});
