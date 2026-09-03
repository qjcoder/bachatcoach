import { useState } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { normalizeLanguage } from '@/lib/language';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { AuthScreen } from '@/components/AuthScreen';
import { TextField } from '@/components/TextField';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Brand } from '@/constants/theme';

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const { showAlert } = useDialog();
  const [name, setName] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      showAlert({
        title: t('common.error'),
        message: 'Please fill all required fields',
        tone: 'error',
      });
      return;
    }
    if (password.length < 6) {
      showAlert({
        title: t('common.error'),
        message: 'Password must be at least 6 characters',
        tone: 'error',
      });
      return;
    }
    setLoading(true);
    try {
      await register(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        normalizeLanguage(i18n.language),
        nameUr.trim() || undefined
      );
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed';
      showAlert({ title: t('common.error'), message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title={t('auth.register')}
      footer={
        <View style={styles.footerRow}>
          <AppText variant="body" color="rgba(255,255,255,0.75)">{t('auth.hasAccount')} </AppText>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <AppText variant="bodySemibold" color="#FFFFFF" style={styles.footerLink}>{t('auth.login')}</AppText>
            </Pressable>
          </Link>
        </View>
      }>

      <GoogleSignInButton />

      <Link href="/(auth)/otp?purpose=register" asChild>
        <Pressable style={styles.otpLink}>
          <AppText variant="bodySemibold" color={Brand.primary} style={styles.otpLinkText}>
            {t('auth.createWithEmailCode')}
          </AppText>
        </Pressable>
      </Link>

      <TextField
        label={t('auth.name')}
        icon="person-outline"
        placeholder="Ahmed Khan"
        value={name}
        onChangeText={setName}
        autoComplete="name"
      />
      <TextField
        label={`${t('auth.nameUr')} (optional)`}
        icon="language-outline"
        placeholder="احمد خان"
        value={nameUr}
        onChangeText={setNameUr}
      />
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
        placeholder="Min. 6 characters"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <Button
        title={loading ? t('common.loading') : t('auth.register')}
        onPress={handleRegister}
        disabled={loading}
        style={styles.button}
      />
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
