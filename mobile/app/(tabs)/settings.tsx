import { useCallback, useState, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '@/context/AuthContext';
import { useLock } from '@/context/LockContext';
import { setStoredLanguage } from '@/i18n';
import { RTLRow } from '@/components/RTLRow';
import { useDirection } from '@/hooks/useDirection';
import {
  hasPin,
  isBiometricEnabled,
  isLockEnabled,
  savePin,
  setBiometricEnabled,
  setLockEnabled,
} from '@/lib/lock';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { TextField } from '@/components/TextField';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { refreshLockSettings, biometricAvailable } = useLock();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { textBlock } = useDirection();

  const [lockOn, setLockOn] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const loadSecurity = useCallback(async () => {
    setLockOn(await isLockEnabled());
    setBioOn(await isBiometricEnabled());
  }, []);

  useFocusEffect(useCallback(() => { loadSecurity(); }, [loadSecurity]));

  const changeLanguage = async (lang: 'en' | 'ur') => {
    if (i18n.language === lang) return;
    await setStoredLanguage(lang);
  };

  const toggleLock = async (value: boolean) => {
    if (value) {
      if (!(await hasPin())) { setPinModal(true); return; }
      await setLockEnabled(true);
      setLockOn(true);
      await refreshLockSettings();
    } else {
      await setLockEnabled(false);
      setLockOn(false);
      setBioOn(false);
      await refreshLockSettings();
    }
  };

  const saveNewPin = async () => {
    if (newPin.length < 4) { Alert.alert(t('lock.pinTooShort')); return; }
    if (newPin !== confirmPin) { Alert.alert(t('lock.pinMismatch')); return; }
    await savePin(newPin);
    setPinModal(false);
    setNewPin('');
    setConfirmPin('');
    setLockOn(true);
    await refreshLockSettings();
    Alert.alert(t('lock.pinSet'));
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const bio = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!bio || !enrolled) { Alert.alert(t('lock.bioUnavailable')); return; }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: t('lock.enableBiometric') });
      if (!result.success) return;
    }
    await setBiometricEnabled(value);
    setBioOn(value);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card variant="elevated" style={styles.profileCard}>
        <RTLRow style={styles.profileRow} gap={14}>
          <View style={styles.avatar}>
            <AppText variant="h2" color={Brand.primary}>{user?.name?.charAt(0).toUpperCase()}</AppText>
          </View>
          <View style={styles.profileInfo}>
            <AppText variant="h3" color={colors.text} style={textBlock}>{user?.name}</AppText>
            <AppText variant="bodySmall" color={colors.muted} style={[styles.email, textBlock]}>{user?.email}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </RTLRow>
      </Card>

      <AppText variant="overline" color={colors.muted} style={styles.groupLabel}>
        {t('settings.security')}
      </AppText>
      <Card variant="elevated">
        <SettingRow
          icon="lock-closed-outline"
          label={t('lock.enablePin')}
          colors={colors}
          right={<Switch value={lockOn} onValueChange={toggleLock} trackColor={{ true: Brand.primary }} />}
        />
        {lockOn && (
          <Pressable onPress={() => { setNewPin(''); setConfirmPin(''); setPinModal(true); }} style={styles.linkRow}>
            <RTLRow gap={8}>
              <Ionicons name="key-outline" size={18} color={Brand.primary} />
              <AppText variant="bodySmallBold" color={Brand.primary}>{t('lock.changePin')}</AppText>
            </RTLRow>
          </Pressable>
        )}
        {lockOn && biometricAvailable && (
          <SettingRow
            icon="finger-print-outline"
            label={t('lock.enableBiometric')}
            colors={colors}
            right={<Switch value={bioOn} onValueChange={toggleBiometric} trackColor={{ true: Brand.primary }} />}
          />
        )}
      </Card>

      <AppText variant="overline" color={colors.muted} style={styles.groupLabel}>
        {t('settings.language')}
      </AppText>
      <Card variant="elevated">
        <RTLRow style={styles.langRow} gap={10}>
          {(['en', 'ur'] as const).map((lang) => (
            <Pressable
              key={lang}
              onPress={() => changeLanguage(lang)}
              style={[styles.langBtn, i18n.language === lang && styles.langBtnActive, { borderColor: colors.border }]}>
              <AppText
                variant="bodySmallBold"
                color={i18n.language === lang ? '#FFFFFF' : '#64748B'}>
                {lang === 'en' ? t('settings.english') : t('settings.urdu')}
              </AppText>
            </Pressable>
          ))}
        </RTLRow>
      </Card>

      <AppText variant="overline" color={colors.muted} style={styles.groupLabel}>
        {t('settings.currency')}
      </AppText>
      <Card variant="elevated">
        <SettingRow icon="cash-outline" label="PKR (₨)" colors={colors} subtitle={t('common.currency')} />
      </Card>

      <Button title={t('settings.logout')} onPress={logout} variant="outline" style={styles.logout} />

      <BottomSheet visible={pinModal} title={t('lock.setPin')} onClose={() => setPinModal(false)}>
        <TextField label={t('lock.newPin')} icon="key-outline" value={newPin} onChangeText={setNewPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <TextField label={t('lock.confirmPin')} icon="key-outline" value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <RTLRow style={styles.modalActions} gap={10}>
          <Button title={t('common.cancel')} onPress={() => setPinModal(false)} variant="outline" style={{ flex: 1 }} />
          <Button title={t('common.save')} onPress={saveNewPin} style={{ flex: 1 }} />
        </RTLRow>
      </BottomSheet>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  label,
  subtitle,
  colors,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  colors: (typeof Colors)['light'];
  right?: ReactNode;
}) {
  const { textBlock } = useDirection();

  return (
    <RTLRow style={styles.settingRow} gap={12}>
      <Ionicons name={icon} size={20} color={Brand.primary} />
      <View style={styles.settingBody}>
        <AppText variant="bodySemibold" color={colors.text} style={textBlock}>{label}</AppText>
        {subtitle ? <AppText variant="caption" color={colors.muted} style={textBlock}>{subtitle}</AppText> : null}
      </View>
      {right}
    </RTLRow>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  profileCard: { marginBottom: Spacing.md, borderWidth: 0 },
  profileRow: { alignItems: 'center' },
  profileInfo: { flex: 1, minWidth: 0 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: `${Brand.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${Brand.primary}30`,
  },
  email: { marginTop: 2 },
  groupLabel: { marginBottom: 8, marginTop: 4 },
  settingRow: { alignItems: 'center', paddingVertical: 12 },
  settingBody: { flex: 1, minWidth: 0 },
  linkRow: { paddingVertical: 10, paddingStart: 32 },
  langRow: {},
  langBtn: { flex: 1, padding: 14, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center' },
  langBtnActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  logout: { marginTop: Spacing.lg },
  modalActions: { marginTop: 8 },
});
