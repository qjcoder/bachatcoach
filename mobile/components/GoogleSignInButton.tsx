import { useState } from 'react';
import { Pressable, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { Brand, Radius } from '@/constants/theme';
import { useDialog } from '@/context/DialogContext';
import {
  isGoogleAuthConfigured,
  persistGoogleTokens,
  exchangeCodeForTokens,
  useGoogleAuthRequestWithDrive,
} from '@/lib/googleAuth';
import { useAuth } from '@/context/AuthContext';

type Props = {
  onSuccess?: () => void;
};

/** Official-looking Google "G" — plain Text so RTL never clips/mirrors it. */
function GoogleG() {
  return (
    <View style={gStyles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={gStyles.ring}>
        <Text style={gStyles.letter}>G</Text>
      </View>
    </View>
  );
}

const gStyles = StyleSheet.create({
  badge: {
    width: 26,
    height: 26,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  letter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
    lineHeight: 18,
    includeFontPadding: false,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
});

export function GoogleSignInButton({ onSuccess }: Props) {
  const { t } = useTranslation();
  const { loginWithGoogle } = useAuth();
  const { showAlert } = useDialog();
  const [loading, setLoading] = useState(false);
  const [request, , promptAsync] = useGoogleAuthRequestWithDrive();
  const configured = isGoogleAuthConfigured();

  const handlePress = async () => {
    if (!configured) {
      showAlert({
        title: t('auth.googleNotConfiguredTitle'),
        message: t('auth.googleNotConfigured'),
        tone: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        if (result.type === 'error') {
          showAlert({
            title: t('common.error'),
            message: result.error?.message || t('auth.googleFailed'),
            tone: 'error',
          });
        }
        return;
      }

      let idToken: string | undefined =
        result.authentication?.idToken ||
        (result.params?.id_token as string | undefined);
      let accessToken: string | undefined =
        result.authentication?.accessToken ||
        (result.params?.access_token as string | undefined);
      let refreshToken: string | undefined =
        result.authentication?.refreshToken || undefined;

      if (!idToken) {
        const authCode = result.params?.code as string | undefined;
        if (authCode) {
          const tokens = await exchangeCodeForTokens(authCode, request?.codeVerifier);
          idToken = tokens.idToken;
          accessToken = tokens.accessToken ?? accessToken;
          refreshToken = tokens.refreshToken ?? refreshToken;
        }
      }

      if (!idToken) {
        showAlert({ title: t('common.error'), message: t('auth.googleNoIdToken'), tone: 'error' });
        return;
      }

      await persistGoogleTokens(accessToken, refreshToken);
      await loginWithGoogle(idToken);
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : t('auth.googleFailed'));
      showAlert({ title: t('common.error'), message, tone: 'error' });
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
              <View style={styles.content}>
                <GoogleG />
                <AppText
                  variant="bodySemibold"
                  color={Brand.text}
                  shrink
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={styles.label}>
                  {t('auth.continueWithGoogle')}
                </AppText>
              </View>
            )}
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <AppText variant="caption" color={Brand.textMuted} shrink style={styles.orText}>
          {t('auth.orEmail')}
        </AppText>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4, width: '100%' },

  pressable: { borderRadius: Radius.lg, width: '100%' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.55 },

  gradientBorder: {
    borderRadius: Radius.lg,
    padding: 1.5,
    width: '100%',
  },
  inner: {
    minHeight: 52,
    borderRadius: Radius.lg - 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    maxWidth: '100%',
    // Always LTR so icon stays left of label in EN / UR / Roman
    direction: 'ltr',
  },
  label: {
    fontSize: 15,
    letterSpacing: 0,
    flexShrink: 1,
    lineHeight: 22,
    includeFontPadding: false,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 4,
    gap: 10,
    direction: 'ltr',
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#CBD5E1' },
  orText: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 11 },
});
