import { useState } from 'react';
import { StyleSheet, Alert, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { AuthScreen } from '@/components/AuthScreen';
import { TextField } from '@/components/TextField';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Brand } from '@/constants/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Login failed');
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title={t('auth.welcome')}
      subtitle={t('auth.subtitle')}
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
        onPress={handleLogin}
        disabled={loading}
        style={styles.button}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  footerLink: {
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.6)',
  },
});
