import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
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
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, (loading || !request) && styles.disabled]}>
        {loading ? (
          <ActivityIndicator color={Brand.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <AppText variant="bodySemibold" color={Brand.text} style={styles.label}>
              {t('auth.continueWithGoogle')}
            </AppText>
          </>
        )}
      </Pressable>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <AppText variant="caption" color={Brand.textMuted} style={styles.or}>
          {t('auth.orEmail')}
        </AppText>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  btn: {
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  label: { marginLeft: 4 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 10,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Brand.border },
  or: { textTransform: 'uppercase' },
});
