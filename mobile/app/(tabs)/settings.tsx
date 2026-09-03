import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  FlatList,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { useLock } from '@/context/LockContext';
import { useTheme } from '@/context/ThemeContext';
import { setStoredLanguage } from '@/i18n';
import { type AppLanguage, normalizeLanguage } from '@/lib/language';
import { filterLanguages, getDefaultCurrencyForLanguage, getLanguage, getLanguageBadge } from '@/constants/languages';
import { RTLRow } from '@/components/RTLRow';
import {
  encodePattern,
  getLockMethod,
  getStoredPinLength,
  hasLockSecret,
  isBiometricEnabled,
  isLockEnabled,
  MAX_PIN_LENGTH,
  MIN_PIN_LENGTH,
  savePatternLock,
  savePin,
  setBiometricEnabled,
  setLockEnabled,
  type LockMethod,
} from '@/lib/lock';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { PinBoxes } from '@/components/PinBoxes';
import { PatternLock } from '@/components/PatternLock';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { TextField } from '@/components/TextField';
import { SettingsMenuRow } from '@/components/SettingsMenuRow';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { CURRENCIES, getCurrency } from '@/constants/currencies';
import { UserAvatar } from '@/components/UserAvatar';
import { pickProfileFromCamera, pickProfileFromLibrary } from '@/lib/profileImage';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { DriveBackupSection } from '@/components/DriveBackupSection';

function Section({ title, children, colors }: { title: string; children: ReactNode; colors: (typeof Colors)['light'] }) {
  return (
    <View style={styles.section}>
      <AppText variant="bodySemibold" color={colors.muted} style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={[styles.card, Shadow.card, { backgroundColor: colors.card }]}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateCurrency, updateProfile, deleteAccount } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const displayName = useUserDisplayName();
  const { refreshLockSettings, biometricAvailable } = useLock();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const [lockOn, setLockOn] = useState(false);
  const [lockMethod, setLockMethod] = useState<LockMethod>('pin');
  const [bioOn, setBioOn] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [setupMethod, setSetupMethod] = useState<LockMethod>('pin');
  const [patternStage, setPatternStage] = useState<'draw' | 'confirm'>('draw');
  const [patternFirst, setPatternFirst] = useState<number[] | null>(null);
  const [patternReady, setPatternReady] = useState(false);
  const [patternStatus, setPatternStatus] = useState<'idle' | 'error'>('idle');
  const [patternKey, setPatternKey] = useState(0);
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
  const [pinLength, setPinLength] = useState<4 | 6>(4);

  const loadSecurity = useCallback(async () => {
    setLockOn(await isLockEnabled());
    setLockMethod(await getLockMethod());
    setBioOn(await isBiometricEnabled());
  }, []);
  useFocusEffect(useCallback(() => { loadSecurity(); }, [loadSecurity]));

  const currentLang = normalizeLanguage(i18n.language);
  const currentLanguage = getLanguage(currentLang);
  const filteredLanguages = useMemo(() => filterLanguages(languageSearch), [languageSearch]);
  const currentCurrency = getCurrency(user?.currency);

  const filteredCurrencies = useMemo(() => {
    const q = currencySearch.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.nameUr.includes(q) || c.symbol.includes(q)
    );
  }, [currencySearch]);

  const changeLanguage = async (lang: AppLanguage) => {
    if (normalizeLanguage(i18n.language) === lang) { setLanguageModal(false); return; }
    setSavingLanguage(true);
    try {
      const currency = getDefaultCurrencyForLanguage(lang);
      await setStoredLanguage(lang);
      if (user) await updateProfile({ language: lang, currency });
      setLanguageModal(false); setLanguageSearch('');
      showAlert({ title: t('settings.languageUpdated'), tone: 'success' });
    } catch {
      showAlert({ title: t('settings.languageUpdateFailed'), tone: 'error' });
    } finally { setSavingLanguage(false); }
  };

  const resetLockForm = (method: LockMethod) => {
    setSetupMethod(method);
    setPatternStage('draw');
    setPatternFirst(null);
    setPatternReady(false);
    setPatternStatus('idle');
    setPatternKey((k) => k + 1);
    setNewPin('');
    setConfirmPin('');
  };

  const openPinModal = async () => {
    const stored = await getStoredPinLength();
    const next = stored === MAX_PIN_LENGTH ? MAX_PIN_LENGTH : MIN_PIN_LENGTH;
    setPinLength(next);
    const method = await getLockMethod();
    resetLockForm(method);
    setPinModal(true);
  };

  const toggleLock = async (value: boolean) => {
    if (value) {
      if (!(await hasLockSecret())) { await openPinModal(); return; }
      await setLockEnabled(true); setLockOn(true); await refreshLockSettings();
    } else {
      await setLockEnabled(false); setLockOn(false); setBioOn(false); await refreshLockSettings();
    }
  };

  const closeLockModal = () => {
    setPinModal(false);
    resetLockForm('pin');
  };

  const saveNewPin = async () => {
    if (newPin.length !== pinLength || confirmPin.length !== pinLength) {
      showAlert({ title: t('lock.pinTooShort'), tone: 'error' });
      return;
    }
    if (newPin !== confirmPin) {
      showAlert({ title: t('lock.pinMismatch'), tone: 'error' });
      return;
    }
    if (setupMethod === 'pattern') {
      if (!patternReady || !patternFirst) {
        showAlert({ title: t('lock.patternTooShort'), tone: 'error' });
        return;
      }
      await savePatternLock(encodePattern(patternFirst), newPin);
    } else {
      await savePin(newPin);
    }
    closeLockModal();
    setLockOn(true);
    await loadSecurity();
    await refreshLockSettings();
    showAlert({ title: setupMethod === 'pattern' ? t('lock.patternSet') : t('lock.pinSet'), tone: 'success' });
  };

  const onSetupPattern = (nodes: number[]) => {
    if (patternStage === 'draw') {
      setPatternFirst(nodes);
      setPatternStage('confirm');
      setPatternKey((k) => k + 1);
      return;
    }
    if (patternFirst && encodePattern(patternFirst) === encodePattern(nodes)) {
      setPatternReady(true);
      setPatternStatus('idle');
      return;
    }
    setPatternStatus('error');
    showAlert({ title: t('lock.patternMismatch'), tone: 'error' });
    setTimeout(() => {
      setPatternStage('draw');
      setPatternFirst(null);
      setPatternStatus('idle');
      setPatternKey((k) => k + 1);
    }, 450);
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const bio = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!bio || !enrolled) {
        showAlert({ title: t('lock.bioUnavailable'), tone: 'warning' });
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: t('lock.enableBiometric') });
      if (!result.success) return;
    }
    await setBiometricEnabled(value); setBioOn(value);
  };

  const selectCurrency = async (code: string) => {
    if (code === user?.currency) { setCurrencyModal(false); return; }
    setSavingCurrency(true);
    try {
      await updateCurrency(code);
      setCurrencyModal(false);
      setCurrencySearch('');
      showAlert({ title: t('settings.currencyUpdated'), tone: 'success' });
    } catch {
      showAlert({ title: t('settings.currencyUpdateFailed'), tone: 'error' });
    } finally { setSavingCurrency(false); }
  };

  const saveAvatar = async (base64: string) => {
    setSavingPhoto(true);
    try {
      await updateProfile({ avatar: base64 });
      setPhotoModal(false);
      showAlert({ title: t('settings.photoUpdated'), tone: 'success' });
    } catch {
      showAlert({ title: t('settings.photoUpdateFailed'), tone: 'error' });
    } finally { setSavingPhoto(false); }
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    const picked = source === 'camera' ? await pickProfileFromCamera() : await pickProfileFromLibrary();
    if (!picked) {
      showAlert({
        title: t('settings.changePhoto'),
        message: t('settings.photoPermission'),
        tone: 'warning',
      });
      return;
    }
    if (!picked.base64) {
      showAlert({ title: t('settings.photoUpdateFailed'), tone: 'error' });
      return;
    }
    await saveAvatar(picked.base64);
  };

  const removePhoto = async () => {
    setSavingPhoto(true);
    try {
      await updateProfile({ avatar: '' });
      setPhotoModal(false);
      showAlert({ title: t('settings.photoUpdated'), tone: 'success' });
    } catch {
      showAlert({ title: t('settings.photoUpdateFailed'), tone: 'error' });
    } finally { setSavingPhoto(false); }
  };

  const handleDeleteAccount = () => {
    showConfirm({
      title: t('settings.deleteAccountTitle'),
      message: t('settings.deleteAccountMsg'),
      confirmLabel: t('settings.deleteAccountConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      tone: 'warning',
      onConfirm: async () => {
        try {
          await deleteAccount();
        } catch {
          showAlert({ title: t('settings.deleteAccountFailed'), tone: 'error' });
        }
      },
    });
  };

  const darkModeOn = themeMode === 'dark' || (themeMode === 'system' && scheme === 'dark');
  const toggleDarkMode = (value: boolean) => setThemeMode(value ? 'dark' : 'light');
  const switchTrack = { false: scheme === 'dark' ? '#334155' : '#CBD5E1', true: Brand.primary };
  const rowTheme = {
    textColor: colors.text,
    mutedColor: colors.muted ?? '#94A3B8',
    borderColor: colors.border,
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      <View style={styles.profile}>
        <UserAvatar
          name={displayName}
          avatar={user?.avatar}
          size={96}
          circular
          editable
          onPress={() => setPhotoModal(true)}
        />
        <AppText variant="h2" color={colors.text} align="center" style={styles.name}>
          {displayName}
        </AppText>
        <AppText variant="bodySmall" color={colors.muted} align="center">
          {user?.email}
        </AppText>
      </View>

      <Section title={t('settings.personalInfo')} colors={colors}>
        <SettingsMenuRow
          icon="language-outline"
          label={t('settings.language')}
          value={currentLanguage.nativeName}
          onPress={() => setLanguageModal(true)}
          {...rowTheme}
        />
        <SettingsMenuRow
          icon="cash-outline"
          label={t('settings.currency')}
          value={currentCurrency.code}
          onPress={() => setCurrencyModal(true)}
          {...rowTheme}
        />
        <SettingsMenuRow
          icon="mail-outline"
          label={t('settings.email')}
          value={user?.email || '—'}
          last
          {...rowTheme}
        />
      </Section>

      <Section title={t('settings.accountSettings')} colors={colors}>
        <SettingsMenuRow
          icon="moon-outline"
          label={t('settings.darkMode')}
          {...rowTheme}
          right={<Switch value={darkModeOn} onValueChange={toggleDarkMode} trackColor={switchTrack} thumbColor="#fff" />}
        />
        <SettingsMenuRow
          icon="lock-closed-outline"
          label={t('lock.enablePin')}
          {...rowTheme}
          right={<Switch value={lockOn} onValueChange={toggleLock} trackColor={switchTrack} thumbColor="#fff" />}
        />
        {lockOn ? (
          <SettingsMenuRow
            icon="key-outline"
            label={t('lock.changeLock')}
            value={lockMethod === 'pattern' ? t('lock.methodPattern') : t('lock.methodPin')}
            actionLabel={t('common.change')}
            onPress={() => { void openPinModal(); }}
            {...rowTheme}
          />
        ) : null}
        {lockOn && biometricAvailable ? (
          <SettingsMenuRow
            icon="finger-print-outline"
            label={t('lock.enableBiometric')}
            {...rowTheme}
            right={<Switch value={bioOn} onValueChange={toggleBiometric} trackColor={switchTrack} thumbColor="#fff" />}
          />
        ) : null}
        <DriveBackupSection rowTheme={rowTheme} />
        <SettingsMenuRow
          icon="log-out-outline"
          label={t('settings.logout')}
          onPress={logout}
          last
          {...rowTheme}
        />
      </Section>

      <Pressable onPress={handleDeleteAccount} style={({ pressed }) => [styles.deleteLink, pressed && styles.pressed]}>
        <AppText variant="bodySemibold" color={colors.muted} align="center">
          {t('settings.deleteAccount')}
        </AppText>
      </Pressable>

      <View style={styles.legalRow}>
        {[
          { icon: 'shield-checkmark-outline' as const, label: t('settings.privacyPolicy'), onPress: () => Linking.openURL('https://bachatcoach.com/privacy') },
          { icon: 'document-text-outline' as const, label: t('settings.termsOfService'), onPress: () => Linking.openURL('https://bachatcoach.com/terms') },
          { icon: 'mail-outline' as const, label: t('settings.contactSupport'), onPress: () => Linking.openURL('mailto:qjcoder@gmail.com') },
        ].map((item, index) => (
          <View key={item.label} style={styles.legalItem}>
            {index > 0 ? <View style={[styles.legalDivider, { backgroundColor: colors.border }]} /> : null}
            <Pressable
              onPress={item.onPress}
              accessibilityLabel={item.label}
              hitSlop={8}
              style={({ pressed }) => [styles.legalBtn, { borderColor: Brand.primary, backgroundColor: colors.card }, pressed && styles.pressed]}>
              <Ionicons name={item.icon} size={20} color={Brand.primary} />
            </Pressable>
          </View>
        ))}
      </View>

      <AppText variant="caption" color={colors.muted} style={styles.version}>
        BachatCoach v1.0
      </AppText>

      <BottomSheet visible={photoModal} title={t('settings.changePhoto')} onClose={() => !savingPhoto && setPhotoModal(false)}>
        {[
          { icon: 'camera-outline' as const, label: t('settings.takePhoto'), onPress: () => pickPhoto('camera'), color: Brand.primary },
          { icon: 'images-outline' as const, label: t('settings.choosePhoto'), onPress: () => pickPhoto('library'), color: Brand.primary },
          ...(user?.avatar ? [{ icon: 'trash-outline' as const, label: t('settings.removePhoto'), onPress: removePhoto, color: Brand.danger }] : []),
        ].map(({ icon, label, onPress, color }, index, list) => (
          <Pressable
            key={label}
            onPress={onPress}
            disabled={savingPhoto}
            style={({ pressed }) => [
              styles.sheetItem,
              index < list.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              pressed && styles.pressed,
            ]}>
            <RTLRow gap={12}>
              <Ionicons name={icon} size={22} color={color} />
              <AppText variant="body" color={color}>{label}</AppText>
            </RTLRow>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={pinModal} title={t('lock.setLock')} onClose={closeLockModal}>
          <AppText variant="bodySmall" color={colors.muted} style={styles.pinHint}>
            {t('lock.lockMethod')}
          </AppText>
          <SegmentedTabs
            tabs={[
              { key: 'pin', label: t('lock.methodPin') },
              { key: 'pattern', label: t('lock.methodPattern') },
            ]}
            active={setupMethod}
            onChange={(key) => resetLockForm(key)}
          />

          {setupMethod === 'pattern' && !patternReady ? (
            <>
              <AppText variant="bodySmall" color={colors.muted} style={styles.pinFieldLabel}>
                {patternStage === 'draw' ? t('lock.drawPattern') : t('lock.redrawPattern')}
              </AppText>
              <PatternLock key={patternKey} onComplete={onSetupPattern} status={patternStatus} />
              <AppText variant="caption" color={colors.muted} style={styles.pinHint}>
                {t('lock.patternTooShort')}
              </AppText>
            </>
          ) : null}

          {setupMethod === 'pattern' && patternReady ? (
            <AppText variant="bodySmall" color={Brand.primary} style={styles.pinFieldLabel}>
              {t('lock.backupPinHint')}
            </AppText>
          ) : null}

          {setupMethod === 'pin' || patternReady ? (
            <>
              <AppText variant="bodySmall" color={colors.muted} style={styles.pinHint}>
                {setupMethod === 'pattern' ? t('lock.backupPin') : t('lock.chooseLength')}
              </AppText>
              <SegmentedTabs
                tabs={[
                  { key: String(MIN_PIN_LENGTH), label: t('lock.digits', { count: MIN_PIN_LENGTH }) },
                  { key: String(MAX_PIN_LENGTH), label: t('lock.digits', { count: MAX_PIN_LENGTH }) },
                ]}
                active={String(pinLength)}
                onChange={(key) => {
                  setPinLength(Number(key) as 4 | 6);
                  setNewPin('');
                  setConfirmPin('');
                }}
              />
              <AppText variant="bodySmall" color={colors.muted} style={styles.pinFieldLabel}>
                {setupMethod === 'pattern' ? t('lock.backupPin') : t('lock.newPin')}
              </AppText>
              <PinBoxes value={newPin} onChange={setNewPin} length={pinLength} />
              <AppText variant="bodySmall" color={colors.muted} style={styles.pinFieldLabel}>
                {t('lock.confirmPin')}
              </AppText>
              <PinBoxes value={confirmPin} onChange={setConfirmPin} length={pinLength} autoFocus={false} />
            </>
          ) : null}

          <RTLRow style={{ marginTop: 12 }} gap={10}>
            <Button title={t('common.cancel')} onPress={closeLockModal} variant="outline" style={{ flex: 1 }} />
            {setupMethod === 'pin' || patternReady ? (
              <Button title={t('common.save')} onPress={saveNewPin} style={{ flex: 1 }} />
            ) : null}
          </RTLRow>
      </BottomSheet>

      <BottomSheet visible={currencyModal} title={t('settings.selectCurrency')} onClose={() => { setCurrencyModal(false); setCurrencySearch(''); }}>
        <TextField label={t('settings.searchCurrency')} icon="search-outline" value={currencySearch} onChangeText={setCurrencySearch} autoCapitalize="characters" />
        <FlatList
          data={filteredCurrencies} keyExtractor={(item) => item.code} style={styles.listSheet} keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = item.code === user?.currency;
            const name = currentLang === 'ur' ? item.nameUr : item.name;
            return (
          <Pressable
            onPress={() => selectCurrency(item.code)}
            disabled={savingCurrency}
            style={[
              styles.pickerRow,
              { borderBottomColor: colors.border },
              selected && styles.pickerRowSelected,
            ]}>
                <RTLRow gap={12}>
                  <View style={styles.pickerBadge}><AppText variant="bodySemibold" color={Brand.primary}>{item.symbol}</AppText></View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodySemibold" color={colors.text}>{item.code}</AppText>
                    <AppText variant="caption" color={colors.muted}>{name}</AppText>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={Brand.primary} />}
                </RTLRow>
              </Pressable>
            );
          }}
        />
      </BottomSheet>

      <BottomSheet visible={languageModal} title={t('settings.selectLanguage')} onClose={() => { setLanguageModal(false); setLanguageSearch(''); }}>
        <TextField label={t('settings.searchLanguage')} icon="search-outline" value={languageSearch} onChangeText={setLanguageSearch} />
        <FlatList
          data={filteredLanguages} keyExtractor={(item) => item.code} style={styles.listSheet} keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = item.code === currentLang;
            return (
          <Pressable
            onPress={() => changeLanguage(item.code as AppLanguage)}
            disabled={savingLanguage}
            style={[
              styles.pickerRow,
              { borderBottomColor: colors.border },
              selected && styles.pickerRowSelected,
            ]}>
                <RTLRow gap={12}>
                  <View style={styles.pickerBadge}>
                    <AppText variant="captionBold" color={Brand.primary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ textAlign: 'center', paddingHorizontal: 2 }}>
                      {getLanguageBadge(item)}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodySemibold" color={colors.text}>{item.nativeName}</AppText>
                    <AppText variant="caption" color={colors.muted}>{item.name} · {item.currency}</AppText>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={Brand.primary} />}
                </RTLRow>
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  profile: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: Spacing.md,
  },
  name: { marginTop: 14, marginBottom: 4 },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: 18,
  },
  sectionTitle: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  pinHint: { marginBottom: 8 },
  pinFieldLabel: { marginTop: 14, marginBottom: 8 },
  deleteLink: {
    alignSelf: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legalDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    marginHorizontal: 14,
  },
  legalBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  version: { textAlign: 'center', marginTop: 18 },
  sheetItem: { paddingVertical: 16 },
  listSheet: { maxHeight: 440, marginTop: 8 },
  pickerRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
  },
  pickerRowSelected: { backgroundColor: `${Brand.primary}10` },
  pickerBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Brand.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
