import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, ActivityIndicator } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTranslation } from 'react-i18next';
import { Radius } from '@/constants/theme';
import { useDialog } from '@/context/DialogContext';
import { useAuth } from '@/context/AuthContext';
import { isAppleAuthAvailable, signInWithApple } from '@/lib/appleAuth';

type Props = {
  onSuccess?: () => void;
};

/**
 * Sign in with Apple — iOS only (Guideline 4.8 when Google is offered).
 * Renders nothing on Android / when Apple auth is unavailable.
 */
export function AppleSignInButton({ onSuccess }: Props) {
  const { t } = useTranslation();
  const { loginWithApple } = useAuth();
  const { showAlert } = useDialog();
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isAppleAuthAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  const handlePress = async () => {
    setLoading(true);
    try {
      const result = await signInWithApple();
      await loginWithApple(result.identityToken, result.fullName);
      onSuccess?.();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') return;
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : t('auth.appleFailed'));
      showAlert({ title: t('common.error'), message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={Radius.lg}
          style={styles.button}
          onPress={handlePress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: 12,
  },
  button: {
    width: '100%',
    height: 52,
  },
  loadingBox: {
    width: '100%',
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
