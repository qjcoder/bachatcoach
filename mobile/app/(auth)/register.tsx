import { useState } from 'react';
import { StyleSheet, Alert, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { AuthScreen } from '@/components/AuthScreen';
import { TextField } from '@/components/TextField';
import { Brand } from '@/constants/theme';

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password, i18n.language as 'en' | 'ur');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title={t('auth.register')}
      subtitle={t('common.tagline')}
      footer={
        <View style={styles.footerRow}>
          <AppText variant="body" color={Brand.textMuted}>{t('auth.hasAccount')} </AppText>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <AppText variant="bodySemibold" color={Brand.primary}>{t('auth.login')}</AppText>
            </Pressable>
          </Link>
        </View>
      }>
      <TextField
        label={t('auth.name')}
        icon="person-outline"
        placeholder="Ahmed Khan"
        value={name}
        onChangeText={setName}
        autoComplete="name"
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
  button: {
    marginTop: 8,
    marginBottom: 12,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
});
