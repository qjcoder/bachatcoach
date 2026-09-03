import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  FlatList,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '@/context/AuthContext';
import { useLock } from '@/context/LockContext';
import { setStoredLanguage } from '@/i18n';
import { type AppLanguage, normalizeLanguage } from '@/lib/language';
import { filterLanguages, getDefaultCurrencyForLanguage, getLanguage, getLanguageBadge } from '@/constants/languages';
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
import { CURRENCIES, getCurrency } from '@/constants/currencies';
import { UserAvatar } from '@/components/UserAvatar';
import { pickProfileFromCamera, pickProfileFromLibrary } from '@/lib/profileImage';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { DriveBackupSection } from '@/components/DriveBackupSection';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateCurrency, updateProfile } = useAuth();
  const displayName = useUserDisplayName();
  const { refreshLockSettings, biometricAvailable } = useLock();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { textBlock, headingBlock } = useDirection();

  const [lockOn, setLockOn] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [currencyModal, setCurrencyModal] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const loadSecurity = useCallback(async () => {
    setLockOn(await isLockEnabled());
    setBioOn(await isBiometricEnabled());
  }, []);

  useFocusEffect(useCallback(() => { loadSecurity(); }, [loadSecurity]));

  const currentLang = normalizeLanguage(i18n.language);

  const changeLanguage = async (lang: AppLanguage) => {
    if (normalizeLanguage(i18n.language) === lang) {
      setLanguageModal(false);
      return;
    }
    setSavingLanguage(true);
    try {
      const currency = getDefaultCurrencyForLanguage(lang);
      await setStoredLanguage(lang);
      if (user) {
        await updateProfile({ language: lang, currency });
      }
      setLanguageModal(false);
      setLanguageSearch('');
      Alert.alert(t('settings.languageUpdated'));
    } catch {
      Alert.alert(t('settings.languageUpdateFailed'));
    } finally {
      setSavingLanguage(false);
    }
  };

  const currentLanguage = getLanguage(currentLang);
  const filteredLanguages = useMemo(() => filterLanguages(languageSearch), [languageSearch]);

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

  const currentCurrency = getCurrency(user?.currency);

  const filteredCurrencies = useMemo(() => {
    const q = currencySearch.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.nameUr.includes(q) ||
        c.symbol.includes(q)
    );
  }, [currencySearch]);

  const selectCurrency = async (code: string) => {
    if (code === user?.currency) {
      setCurrencyModal(false);
      return;
    }
    setSavingCurrency(true);
    try {
      await updateCurrency(code);
      setCurrencyModal(false);
      setCurrencySearch('');
      Alert.alert(t('settings.currencyUpdated'));
    } catch {
      Alert.alert(t('settings.currencyUpdateFailed'));
    } finally {
      setSavingCurrency(false);
    }
  };

  const saveAvatar = async (base64: string) => {
    setSavingPhoto(true);
    try {
      await updateProfile({ avatar: base64 });
      setPhotoModal(false);
      Alert.alert(t('settings.photoUpdated'));
    } catch {
      Alert.alert(t('settings.photoUpdateFailed'));
    } finally {
      setSavingPhoto(false);
    }
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    const picked = source === 'camera' ? await pickProfileFromCamera() : await pickProfileFromLibrary();
    if (!picked) {
      Alert.alert(t('settings.changePhoto'), t('settings.photoPermission'));
      return;
    }
    if (!picked.base64) {
      Alert.alert(t('settings.photoUpdateFailed'));
      return;
    }
    await saveAvatar(picked.base64);
  };

  const removePhoto = async () => {
    setSavingPhoto(true);
    try {
      await updateProfile({ avatar: '' });
      setPhotoModal(false);
      Alert.alert(t('settings.photoUpdated'));
    } catch {
      Alert.alert(t('settings.photoUpdateFailed'));
    } finally {
      setSavingPhoto(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card variant="elevated" style={styles.profileCard}>
        <RTLRow style={styles.profileRow} gap={14}>
          <UserAvatar
            name={displayName}
            avatar={user?.avatar}
            size={56}
            editable
            onPress={() => setPhotoModal(true)}
          />
          <Pressable style={styles.profileInfo} onPress={() => setPhotoModal(true)}>
            <AppText variant="h3" color={colors.text} style={textBlock}>{displayName}</AppText>
            <AppText variant="bodySmall" color={colors.muted} style={[styles.email, textBlock]}>{user?.email}</AppText>
            <AppText variant="captionBold" color={Brand.primary} style={[styles.changePhoto, textBlock]}>
              {t('settings.changePhoto')}
            </AppText>
          </Pressable>
        </RTLRow>
      </Card>

      <AppText variant="overline" color={colors.muted} style={[styles.groupLabel, headingBlock]}>
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

      <AppText variant="overline" color={colors.muted} style={[styles.groupLabel, headingBlock]}>
        {t('settings.language')}
      </AppText>
      <Card variant="elevated">
        <Pressable onPress={() => setLanguageModal(true)}>
          <SettingRow
            icon="language-outline"
            label={currentLanguage.nativeName}
            colors={colors}
            subtitle={currentLanguage.name}
            right={<Ionicons name="chevron-forward" size={20} color={colors.muted} />}
          />
        </Pressable>
      </Card>

      <AppText variant="overline" color={colors.muted} style={[styles.groupLabel, headingBlock]}>
        {t('settings.currency')}
      </AppText>
      <Card variant="elevated">
        <Pressable onPress={() => setCurrencyModal(true)}>
          <SettingRow
            icon="cash-outline"
            label={`${currentCurrency.code} (${currentCurrency.symbol})`}
            colors={colors}
            subtitle={currentLang === 'ur' ? currentCurrency.nameUr : currentCurrency.name}
            right={<Ionicons name="chevron-forward" size={20} color={colors.muted} />}
          />
        </Pressable>
      </Card>

      <DriveBackupSection />

      <Button title={t('settings.logout')} onPress={logout} variant="outline" style={styles.logout} />

      <BottomSheet
        visible={photoModal}
        title={t('settings.changePhoto')}
        onClose={() => !savingPhoto && setPhotoModal(false)}>
        <Pressable
          style={[styles.photoOption, { borderColor: colors.border }]}
          onPress={() => pickPhoto('camera')}
          disabled={savingPhoto}>
          <RTLRow gap={12}>
            <Ionicons name="camera-outline" size={22} color={Brand.primary} />
            <AppText variant="bodySemibold" color={colors.text}>{t('settings.takePhoto')}</AppText>
          </RTLRow>
        </Pressable>
        <Pressable
          style={[styles.photoOption, { borderColor: colors.border }]}
          onPress={() => pickPhoto('library')}
          disabled={savingPhoto}>
          <RTLRow gap={12}>
            <Ionicons name="images-outline" size={22} color={Brand.primary} />
            <AppText variant="bodySemibold" color={colors.text}>{t('settings.choosePhoto')}</AppText>
          </RTLRow>
        </Pressable>
        {user?.avatar ? (
          <Pressable
            style={[styles.photoOption, { borderColor: colors.border }]}
            onPress={removePhoto}
            disabled={savingPhoto}>
            <RTLRow gap={12}>
              <Ionicons name="trash-outline" size={22} color={Brand.danger} />
              <AppText variant="bodySemibold" color={Brand.danger}>{t('settings.removePhoto')}</AppText>
            </RTLRow>
          </Pressable>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={pinModal} title={t('lock.setPin')} onClose={() => setPinModal(false)}>
        <TextField label={t('lock.newPin')} icon="key-outline" value={newPin} onChangeText={setNewPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <TextField label={t('lock.confirmPin')} icon="key-outline" value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <RTLRow style={styles.modalActions} gap={10}>
          <Button title={t('common.cancel')} onPress={() => setPinModal(false)} variant="outline" style={{ flex: 1 }} />
          <Button title={t('common.save')} onPress={saveNewPin} style={{ flex: 1 }} />
        </RTLRow>
      </BottomSheet>

      <BottomSheet
        visible={currencyModal}
        title={t('settings.selectCurrency')}
        onClose={() => { setCurrencyModal(false); setCurrencySearch(''); }}>
        <TextField
          label={t('settings.searchCurrency')}
          icon="search-outline"
          value={currencySearch}
          onChangeText={setCurrencySearch}
          autoCapitalize="characters"
        />
        <FlatList
          data={filteredCurrencies}
          keyExtractor={(item) => item.code}
          style={styles.currencyList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = item.code === user?.currency;
            const name = currentLang === 'ur' ? item.nameUr : item.name;
            return (
              <Pressable
                onPress={() => selectCurrency(item.code)}
                disabled={savingCurrency}
                style={[styles.currencyRow, selected && styles.currencyRowSelected]}>
                <RTLRow gap={12}>
                  <View style={styles.currencySymbol}>
                    <AppText variant="bodySemibold" color={Brand.primary}>{item.symbol}</AppText>
                  </View>
                  <View style={styles.currencyInfo}>
                    <AppText variant="bodySemibold" color={colors.text}>{item.code}</AppText>
                    <AppText variant="caption" color={colors.muted}>{name}</AppText>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={Brand.primary} /> : null}
                </RTLRow>
              </Pressable>
            );
          }}
        />
      </BottomSheet>

      <BottomSheet
        visible={languageModal}
        title={t('settings.selectLanguage')}
        onClose={() => { setLanguageModal(false); setLanguageSearch(''); }}>
        <TextField
          label={t('settings.searchLanguage')}
          icon="search-outline"
          value={languageSearch}
          onChangeText={setLanguageSearch}
        />
        <FlatList
          data={filteredLanguages}
          keyExtractor={(item) => item.code}
          style={styles.languageList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = item.code === currentLang;
            return (
              <Pressable
                onPress={() => changeLanguage(item.code as AppLanguage)}
                disabled={savingLanguage}
                style={[styles.currencyRow, selected && styles.currencyRowSelected]}>
                <RTLRow gap={12}>
                  <View style={styles.languageBadge}>
                    <AppText
                      variant="captionBold"
                      color={Brand.primary}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                      style={styles.languageBadgeText}>
                      {getLanguageBadge(item)}
                    </AppText>
                  </View>
                  <View style={styles.currencyInfo}>
                    <AppText variant="bodySemibold" color={colors.text}>{item.nativeName}</AppText>
                    <AppText variant="caption" color={colors.muted}>
                      {item.name} · {item.currency}
                    </AppText>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={Brand.primary} /> : null}
                </RTLRow>
              </Pressable>
            );
          }}
        />
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
  const { textBlock, headingBlock } = useDirection();

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
  changePhoto: { marginTop: 6 },
  email: { marginTop: 2 },
  groupLabel: { marginBottom: 8, marginTop: 4 },
  settingRow: { alignItems: 'center', paddingVertical: 12 },
  settingBody: { flex: 1, minWidth: 0 },
  linkRow: { paddingVertical: 10, paddingStart: 32 },
  logout: { marginTop: Spacing.lg },
  modalActions: { marginTop: 8 },
  photoOption: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  currencyList: { maxHeight: 420, marginTop: 8 },
  languageList: { maxHeight: 480, marginTop: 8 },
  currencyRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  currencyRowSelected: { backgroundColor: `${Brand.primary}10`, borderRadius: Radius.sm },
  currencySymbol: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Brand.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Brand.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  languageBadgeText: { textAlign: 'center', width: '100%' },
  currencyInfo: { flex: 1, minWidth: 0 },
});
