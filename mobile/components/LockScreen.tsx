import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { useAppType } from '@/components/AppText';
import { useLock } from '@/context/LockContext';
import { isBiometricEnabled } from '@/lib/lock';
import { Brand } from '@/constants/theme';

export default function LockScreen() {
  const { t } = useTranslation();
  const { unlockWithPin, unlockWithBiometric, biometricAvailable } = useLock();
  const { type } = useAppType();
  const [pin, setPin] = useState('');
  const [showBio, setShowBio] = useState(false);

  useEffect(() => {
    (async () => {
      const bioOn = await isBiometricEnabled();
      setShowBio(bioOn && biometricAvailable);
      if (bioOn && biometricAvailable) {
        await unlockWithBiometric();
      }
    })();
  }, [biometricAvailable, unlockWithBiometric]);

  const submit = async () => {
    if (pin.length < 4) return;
    const ok = await unlockWithPin(pin);
    if (!ok) {
      Alert.alert(t('lock.wrongPin'));
      setPin('');
    }
  };

  return (
    <View style={styles.container}>
      <AppText style={styles.emoji}>🔒</AppText>
      <AppText variant="h1" color={Brand.text}>{t('common.appName')}</AppText>
      <AppText variant="body" color={Brand.textMuted} style={styles.subtitle}>
        {t('lock.enterPin')}
      </AppText>

      <TextInput
        style={[styles.input, type('amountMd')]}
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        placeholder="••••"
        placeholderTextColor="#94A3B8"
        onSubmitEditing={submit}
        autoFocus
      />

      <Pressable style={styles.btn} onPress={submit}>
        <AppText variant="button" color="#FFFFFF">{t('lock.unlock')}</AppText>
      </Pressable>

      {showBio && (
        <Pressable style={styles.bioBtn} onPress={unlockWithBiometric}>
          <AppText variant="bodyMedium" color={Brand.primary}>{t('lock.useBiometric')}</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: { fontSize: 48, marginBottom: 8 },
  subtitle: { marginBottom: 24, marginTop: 6 },
  input: {
    width: '80%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    padding: 16,
    textAlign: 'center',
    letterSpacing: 8,
    color: Brand.text,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bioBtn: { marginTop: 20 },
});
