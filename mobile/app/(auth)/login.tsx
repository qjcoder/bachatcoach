import { useEffect, useState } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { AuthScreen } from '@/components/AuthScreen';
import { TextField } from '@/components/TextField';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Brand } from '@/constants/theme';

const DEMO_EMAIL = 'demo@bachatcoach.app';
const DEMO_PASSWORD = 'demo123';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { showAlert } = useDialog();
  const [email, setEmail] = useState(__DEV__ ? DEMO_EMAIL : '');
  const [password, setPassword] = useState(__DEV__ ? DEMO_PASSWORD : '');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (overrideEmail?: string, overridePassword?: string) => {
    const nextEmail = (overrideEmail ?? email).trim().toLowerCase();
    const nextPassword = overridePassword ?? password;
    if (!nextEmail || !nextPassword) {
      showAlert({
        title: t('common.error'),
        message: 'Please enter email and password',
        tone: 'error',
      });
      return;
    }
    setLoading(true);
    try {
      await login(nextEmail, nextPassword);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Login failed');
      showAlert({ title: t('common.error'), message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!__DEV__) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await login(DEMO_EMAIL, DEMO_PASSWORD);
      } catch {
        if (!cancelled) {
          /* keep fields filled so user can tap Login / Demo */
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthScreen
      footer={
        <View style={styles.footerRow}>
          <AppText variant="body" color="rgba(255,255,255,0.75)">{t('auth.noAccount')} </AppText>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <AppText variant="bodySemibold" color="#FFFFFF" style={styles.footerLink}>{t('auth.register')}</AppText>
            </Pressable>
          </Link>
        </View>
      }>

      <GoogleSignInButton />

      <Link href="/(auth)/otp?purpose=login" asChild>
        <Pressable style={styles.otpLink}>
          <AppText variant="bodySemibold" color={Brand.primary} style={styles.otpLinkText}>
            {t('auth.signInWithEmailCode')}
          </AppText>
        </Pressable>
      </Link>

      <TextField
        label={t('auth.email')}
        icon="mail-outline"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label={t('auth.password')}
        icon="lock-closed-outline"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      <Button
        title={loading ? t('common.loading') : t('auth.login')}
        onPress={() => handleLogin()}
        disabled={loading}
        style={styles.button}
      />
      {__DEV__ ? (
        <Button
          title="Demo account (Ahmed Khan)"
          onPress={() => {
            setEmail(DEMO_EMAIL);
            setPassword(DEMO_PASSWORD);
            void handleLogin(DEMO_EMAIL, DEMO_PASSWORD);
          }}
          disabled={loading}
          variant="outline"
          style={styles.demoButton}
        />
      ) : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  otpLink: {
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  otpLinkText: {
    textDecorationLine: 'underline',
  },
  button: {
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  demoButton: {
    marginBottom: 8,
    borderRadius: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  footerLink: {
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.6)',
  },
});
