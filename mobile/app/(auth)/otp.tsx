import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { normalizeLanguage } from '@/lib/language';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { AuthScreen } from '@/components/AuthScreen';
import { TextField } from '@/components/TextField';
import { Brand } from '@/constants/theme';
import { useColors } from '@/components/useColorScheme';

type Purpose = 'login' | 'register';

export default function EmailOtpScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ purpose?: string }>();
  const purpose: Purpose = params.purpose === 'register' ? 'register' : 'login';
  const { sendEmailOtp, loginWithEmailOtp } = useAuth();
  const { showAlert } = useDialog();
  const colors = useColors();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [name, setName] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setStep('email');
    setCode('');
    setCooldown(0);
  }, [purpose]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const apiError = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (err instanceof Error ? err.message : fallback);

  const handleSend = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      showAlert({ title: t('common.error'), message: t('auth.otpEmailRequired'), tone: 'error' });
      return;
    }
    if (purpose === 'register' && !name.trim()) {
      showAlert({ title: t('common.error'), message: t('auth.otpNameRequired'), tone: 'error' });
      return;
    }
    setLoading(true);
    try {
      const data = await sendEmailOtp(trimmed, purpose);
      setStep('code');
      setCooldown(60);
      if (data.devCode) {
        showAlert({
          title: t('auth.otpSentTitle'),
          message: `${t('auth.otpSentDev')}: ${data.devCode}`,
          tone: 'success',
        });
      } else {
        showAlert({
          title: t('auth.otpSentTitle'),
          message: t('auth.otpSentBody'),
          tone: 'success',
        });
      }
    } catch (err: unknown) {
      showAlert({
        title: t('common.error'),
        message: apiError(err, t('auth.otpSendFailed')),
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [email, name, purpose, sendEmailOtp, showAlert, t]);

  const handleVerify = useCallback(async () => {
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      showAlert({ title: t('common.error'), message: t('auth.otpCodeInvalid'), tone: 'error' });
      return;
    }
    setLoading(true);
    try {
      await loginWithEmailOtp({
        email: email.trim().toLowerCase(),
        code: trimmedCode,
        purpose,
        name: name.trim() || undefined,
        nameUr: nameUr.trim() || undefined,
        language: normalizeLanguage(i18n.language),
      });
    } catch (err: unknown) {
      showAlert({
        title: t('common.error'),
        message: apiError(err, t('auth.otpVerifyFailed')),
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [code, email, name, nameUr, purpose, loginWithEmailOtp, i18n.language, showAlert, t]);

  const title =
    purpose === 'register'
      ? step === 'email'
        ? t('auth.otpRegisterTitle')
        : t('auth.otpEnterCode')
      : step === 'email'
        ? t('auth.otpLoginTitle')
        : t('auth.otpEnterCode');

  return (
    <AuthScreen
      title={title}
      subtitle={
        step === 'code'
          ? t('auth.otpCodeHint', { email: email.trim().toLowerCase() })
          : t('auth.otpSubtitle')
      }
      footer={
        <View style={styles.footerRow}>
          <Pressable onPress={() => router.back()}>
            <AppText variant="bodySemibold" color="#FFFFFF" style={styles.footerLink}>
              {t('common.back')}
            </AppText>
          </Pressable>
          <AppText variant="body" color="rgba(255,255,255,0.5)">
            {' · '}
          </AppText>
          {purpose === 'login' ? (
            <Link href="/(auth)/otp?purpose=register" asChild>
              <Pressable>
                <AppText variant="bodySemibold" color="#FFFFFF" style={styles.footerLink}>
                  {t('auth.register')}
                </AppText>
              </Pressable>
            </Link>
          ) : (
            <Link href="/(auth)/otp?purpose=login" asChild>
              <Pressable>
                <AppText variant="bodySemibold" color="#FFFFFF" style={styles.footerLink}>
                  {t('auth.login')}
                </AppText>
              </Pressable>
            </Link>
          )}
        </View>
      }>
      {step === 'email' ? (
        <>
          {purpose === 'register' ? (
            <>
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
            </>
          ) : null}
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
          <Button
            title={loading ? t('common.loading') : t('auth.otpSendCode')}
            onPress={handleSend}
            disabled={loading}
            style={styles.button}
          />
        </>
      ) : (
        <>
          <TextField
            label={t('auth.otpCode')}
            icon="keypad-outline"
            placeholder="123456"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
          />
          <Button
            title={loading ? t('common.loading') : t('auth.otpVerify')}
            onPress={handleVerify}
            disabled={loading}
            style={styles.button}
          />
          <Pressable
            onPress={handleSend}
            disabled={loading || cooldown > 0}
            style={styles.resend}>
            <AppText variant="bodySemibold" color={cooldown > 0 ? colors.muted : Brand.primary}>
              {cooldown > 0 ? t('auth.otpResendIn', { sec: cooldown }) : t('auth.otpResend')}
            </AppText>
          </Pressable>
          <Pressable onPress={() => setStep('email')} style={styles.resend}>
            <AppText variant="caption" color={colors.muted}>
              {t('auth.otpChangeEmail')}
            </AppText>
          </Pressable>
        </>
      )}
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
  resend: {
    alignItems: 'center',
    paddingVertical: 10,
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
