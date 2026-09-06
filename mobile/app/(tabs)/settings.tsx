import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  FlatList,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from 'expo-router';
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
import { HeaderTitle } from '@/components/HeaderTitle';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CURRENCIES, getCurrency } from '@/constants/currencies';
import { UserAvatar } from '@/components/UserAvatar';
import { pickProfileFromCamera, pickProfileFromLibrary } from '@/lib/profileImage';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { DriveBackupSection } from '@/components/DriveBackupSection';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import { SignOutDialog } from '@/components/SignOutDialog';
import type { ThemeMode } from '@/context/ThemeContext';

const PUSH_NOTIFICATIONS_KEY = 'bachatcoach_push_notifications';

type ThemeColors = (typeof Colors)['light'] | (typeof Colors)['dark'];

function Section({ title, children, colors }: { title: string; children: ReactNode; colors: ThemeColors }) {
  return (
    <View style={styles.section}>
      <AppText variant="bodySemibold" color={colors.muted} style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={[styles.card, Shadow.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user, logout, updateCurrency, updateProfile, deleteAccount } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const displayName = useUserDisplayName();
  const { refreshLockSettings, biometricAvailable } = useLock();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();

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
  const [profileModal, setProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNameUr, setEditNameUr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [signOutModal, setSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [pushNotifications, setPushNotifications] = useState(true);

  const loadSecurity = useCallback(async () => {
    setLockOn(await isLockEnabled());
    setLockMethod(await getLockMethod());
    setBioOn(await isBiometricEnabled());
  }, []);
  useFocusEffect(useCallback(() => { loadSecurity(); }, [loadSecurity]));

  useEffect(() => {
    void AsyncStorage.getItem(PUSH_NOTIFICATIONS_KEY).then((v) => {
      if (v === null) return;
      setPushNotifications(v !== '0' && v !== 'false');
    });
  }, []);

  const togglePushNotifications = async (value: boolean) => {
    setPushNotifications(value);
    await AsyncStorage.setItem(PUSH_NOTIFICATIONS_KEY, value ? '1' : '0');
  };

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

  const applyLanguage = async (lang: AppLanguage, alsoChangeCurrency: boolean) => {
    setSavingLanguage(true);
    try {
      const suggested = getDefaultCurrencyForLanguage(lang);
      await setStoredLanguage(lang);
      if (user) {
        await updateProfile(
          alsoChangeCurrency
            ? { language: lang, currency: suggested }
            : { language: lang }
        );
      }
      setLanguageModal(false);
      setLanguageSearch('');
      showAlert({
        title: t('settings.allSetTitle'),
        message: alsoChangeCurrency
          ? t('settings.languageAndCurrencyUpdatedMsg', { currency: suggested })
          : t('settings.languageOnlyUpdatedMsg'),
        confirmLabel: t('common.done'),
        tone: 'success',
      });
    } catch {
      showAlert({ title: t('settings.languageUpdateFailed'), tone: 'error' });
    } finally {
      setSavingLanguage(false);
    }
  };

  const changeLanguage = (lang: AppLanguage) => {
    if (normalizeLanguage(i18n.language) === lang) {
      setLanguageModal(false);
      return;
    }

    const suggested = getDefaultCurrencyForLanguage(lang);
    const currentCurrency = (user?.currency || 'PKR').toUpperCase();
    const currencyDiffers = suggested.toUpperCase() !== currentCurrency;

    if (!currencyDiffers) {
      void applyLanguage(lang, false);
      return;
    }

    const languageName = getLanguage(lang).nativeName;
    setLanguageModal(false);
    setLanguageSearch('');
    showConfirm({
      title: t('settings.alsoChangeCurrencyTitle'),
      message: t('settings.alsoChangeCurrencyMsg', {
        language: languageName,
        currency: suggested,
        current: currentCurrency,
      }),
      // safePrimary: Keep currency is the solid CTA; Switch is outline.
      confirmLabel: t('settings.alsoChangeCurrencyYes', { currency: suggested }),
      cancelLabel: t('settings.alsoChangeCurrencyNo', { currency: currentCurrency }),
      tone: 'info',
      safePrimary: true,
      onConfirm: () => {
        void applyLanguage(lang, true);
      },
      onCancel: () => {
        void applyLanguage(lang, false);
      },
    });
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
      showAlert({
        title: t('settings.allSetTitle'),
        message: t('settings.currencyUpdatedMsg'),
        confirmLabel: t('common.done'),
        tone: 'success',
      });
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

  const openProfileEditor = () => {
    setEditName(user?.name || '');
    setEditNameUr(user?.nameUr || '');
    setProfileModal(true);
  };

  const saveProfileName = async () => {
    const name = editName.trim();
    if (!name) {
      showAlert({ title: t('settings.nameRequired'), tone: 'warning' });
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ name, nameUr: editNameUr.trim() });
      setProfileModal(false);
      showAlert({ title: t('settings.nameUpdated'), tone: 'success' });
    } catch {
      showAlert({ title: t('settings.nameUpdateFailed'), tone: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = useCallback(() => {
    setSignOutModal(true);
  }, []);

  const confirmSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      setSigningOut(false);
      showAlert({ title: t('common.error'), tone: 'error' });
    }
  }, [logout, showAlert, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      // Fully custom header so title is true screen-center (nav buttons can't shift it).
      header: () => (
        <View style={{ backgroundColor: colors.card, paddingTop: insets.top }}>
          <View style={styles.customHeader}>
            <View style={styles.customHeaderTitle} pointerEvents="none">
              <HeaderTitle title={t('settings.title')} subtitle={t('settings.subtitle')} />
            </View>
            <Pressable
              onPress={handleLogout}
              accessibilityLabel={t('settings.logout')}
              hitSlop={10}
              style={({ pressed }) => [styles.headerLogout, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={22} color={Brand.danger} />
            </Pressable>
          </View>
        </View>
      ),
    });
  }, [colors.card, handleLogout, insets.top, navigation, t]);

  const handleDeleteAccount = () => setDeleteModal(true);

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
    } catch {
      setDeletingAccount(false);
      showAlert({ title: t('settings.deleteAccountFailed'), tone: 'error' });
    }
  };

  const showComingSoon = () => {
    showAlert({ title: t('settings.advancedSoon'), tone: 'info' });
  };

  const switchTrack = { false: scheme === 'dark' ? '#334155' : '#CBD5E1', true: Brand.primary };
  const rowTheme = {
    textColor: colors.text,
    mutedColor: colors.muted ?? '#94A3B8',
    borderColor: colors.border,
  };

  const themeOptions: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'light', label: t('settings.themeLight'), icon: 'sunny' },
    { key: 'dark', label: t('settings.themeDark'), icon: 'moon' },
    { key: 'system', label: t('settings.themeSystem'), icon: 'desktop-outline' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* Profile card */}
      <View style={[styles.profileCard, Shadow.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <UserAvatar
          name={displayName}
          avatar={user?.avatar}
          size={88}
          circular
          editable
          onPress={() => setPhotoModal(true)}
        />
        <AppText variant="h2" color={colors.text} align="center" style={styles.name}>
          {displayName}
        </AppText>
        <AppText variant="bodySmall" color={colors.muted} align="center" style={styles.email}>
          {user?.email}
        </AppText>
        <Pressable
          onPress={openProfileEditor}
          style={({ pressed }) => [
            styles.editProfileRow,
            { borderTopColor: colors.border },
            pressed && styles.pressed,
          ]}>
          <RTLRow gap={10} style={styles.editProfileInner}>
            <View style={[styles.editProfileIcon, { backgroundColor: `${Brand.primary}14` }]}>
              <Ionicons name="person-outline" size={18} color={Brand.primary} />
            </View>
            <AppText variant="body" color={colors.text} style={styles.editProfileLabel}>
              {t('settings.editProfile')}
            </AppText>
            <Ionicons name="create-outline" size={18} color={Brand.primary} />
          </RTLRow>
        </Pressable>
      </View>

      <Section title={t('settings.account')} colors={colors}>
        <SettingsMenuRow
          icon="person-outline"
          label={t('settings.personalInformation')}
          subtitle={displayName || '—'}
          onPress={openProfileEditor}
          right={<Ionicons name="create-outline" size={18} color={Brand.primary} />}
          {...rowTheme}
        />
        <SettingsMenuRow
          icon="language-outline"
          label={t('settings.language')}
          subtitle={currentLanguage.nativeName}
          onPress={() => setLanguageModal(true)}
          {...rowTheme}
        />
        <SettingsMenuRow
          icon="cash-outline"
          label={t('settings.currency')}
          subtitle={currentCurrency.code}
          onPress={() => setCurrencyModal(true)}
          last
          {...rowTheme}
        />
      </Section>

      <Section title={t('settings.appearance')} colors={colors}>
        <View style={styles.themePad}>
          <RTLRow gap={8} style={styles.themePills}>
            {themeOptions.map((opt) => {
              const selected = themeMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setThemeMode(opt.key)}
                  style={({ pressed }) => [
                    styles.themePill,
                    selected
                      ? { backgroundColor: Brand.primary }
                      : { backgroundColor: colors.field, borderColor: colors.border, borderWidth: 1 },
                    pressed && styles.pressed,
                  ]}>
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={selected ? '#fff' : colors.muted}
                  />
                  <AppText
                    variant="captionBold"
                    color={selected ? '#fff' : colors.text}
                    numberOfLines={1}>
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </RTLRow>
        </View>
      </Section>

      <Section title={t('settings.security')} colors={colors}>
        <SettingsMenuRow
          icon="lock-closed-outline"
          label={t('lock.enablePin')}
          subtitle={t('settings.appLockSubtitle')}
          {...rowTheme}
          last={!lockOn}
          right={<Switch value={lockOn} onValueChange={toggleLock} trackColor={switchTrack} thumbColor="#fff" />}
        />
        {lockOn ? (
          <SettingsMenuRow
            icon="key-outline"
            label={t('lock.changeLock')}
            subtitle={lockMethod === 'pattern' ? t('lock.methodPattern') : t('lock.methodPin')}
            actionLabel={t('common.change')}
            onPress={() => { void openPinModal(); }}
            last={!biometricAvailable}
            {...rowTheme}
          />
        ) : null}
        {lockOn && biometricAvailable ? (
          <SettingsMenuRow
            icon="finger-print-outline"
            label={t('lock.enableBiometric')}
            last
            {...rowTheme}
            right={<Switch value={bioOn} onValueChange={toggleBiometric} trackColor={switchTrack} thumbColor="#fff" />}
          />
        ) : null}
      </Section>

      <Section title={t('settings.backup')} colors={colors}>
        <DriveBackupSection rowTheme={rowTheme} />
      </Section>

      <Section title={t('settings.notifications')} colors={colors}>
        <SettingsMenuRow
          icon="notifications-outline"
          label={t('settings.pushNotifications')}
          {...rowTheme}
          right={
            <Switch
              value={pushNotifications}
              onValueChange={togglePushNotifications}
              trackColor={switchTrack}
              thumbColor="#fff"
            />
          }
        />
        <SettingsMenuRow
          icon="mail-outline"
          label={t('settings.emailNotifications')}
          subtitle={t('settings.emailNotificationsSubtitle')}
          onPress={() => Linking.openURL('mailto:qjcoder@gmail.com')}
          last
          {...rowTheme}
        />
      </Section>

      <Section title={t('settings.preferences')} colors={colors}>
        <SettingsMenuRow
          icon="home-outline"
          label={t('settings.defaultView')}
          subtitle={t('settings.defaultViewSubtitle')}
          onPress={showComingSoon}
          {...rowTheme}
        />
        <SettingsMenuRow
          icon="options-outline"
          label={t('settings.dataPreferences')}
          subtitle={t('settings.dataPreferencesSubtitle')}
          onPress={() => setCurrencyModal(true)}
          {...rowTheme}
        />
        <SettingsMenuRow
          icon="construct-outline"
          label={t('settings.advancedSettings')}
          onPress={showComingSoon}
          last
          {...rowTheme}
        />
      </Section>

      <Section title={t('settings.legal')} colors={colors}>
        <SettingsMenuRow
          icon="shield-checkmark-outline"
          label={t('settings.privacyPolicy')}
          onPress={() => Linking.openURL('https://bachatcoach.com/privacy')}
          {...rowTheme}
        />
        <SettingsMenuRow
          icon="document-text-outline"
          label={t('settings.termsOfService')}
          onPress={() => Linking.openURL('https://bachatcoach.com/terms')}
          {...rowTheme}
        />
        <SettingsMenuRow
          icon="help-circle-outline"
          label={t('settings.contactSupport')}
          onPress={() => Linking.openURL('mailto:qjcoder@gmail.com')}
          {...rowTheme}
        />
        <SettingsMenuRow
          icon="chatbubble-ellipses-outline"
          label={t('settings.sendFeedback')}
          onPress={() => Linking.openURL('mailto:qjcoder@gmail.com?subject=BachatCoach%20Feedback')}
          {...rowTheme}
        />
        <SettingsMenuRow
          icon="star-outline"
          label={t('settings.rateApp')}
          onPress={() => Linking.openURL('https://bachatcoach.com')}
          last
          {...rowTheme}
        />
      </Section>

      <Section title={t('settings.about')} colors={colors}>
        <SettingsMenuRow
          icon="information-circle-outline"
          label={t('settings.appVersion')}
          subtitle={t('settings.appVersionValue')}
          last
          {...rowTheme}
        />
      </Section>

      {/* Delete account */}
      <Pressable
        onPress={handleDeleteAccount}
        style={({ pressed }) => [
          styles.deleteCard,
          {
            borderColor: Brand.danger,
            backgroundColor: `${Brand.danger}12`,
          },
          pressed && styles.pressed,
        ]}>
        <RTLRow gap={12} style={styles.deleteInner}>
          <View style={[styles.deleteIcon, { backgroundColor: `${Brand.danger}18` }]}>
            <Ionicons name="trash-outline" size={18} color={Brand.danger} />
          </View>
          <View style={styles.deleteCopy}>
            <AppText variant="body" color={Brand.danger} style={styles.deleteTitle}>
              {t('settings.deleteAccount')}
            </AppText>
            <AppText variant="caption" color={colors.muted} numberOfLines={2}>
              {t('settings.deleteAccountSubtitle')}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Brand.danger} />
        </RTLRow>
      </Pressable>

      {/* Footer */}
      <View style={styles.footer}>
        <Ionicons name="leaf" size={22} color={Brand.primary} />
        <AppText variant="caption" color={colors.muted} align="center" style={styles.footerTagline}>
          {t('settings.footerTagline')}
        </AppText>
        <AppText variant="bodySmallBold" color={colors.text} align="center">
          BachatCoach
        </AppText>
      </View>

      <DeleteAccountDialog
        visible={deleteModal}
        busy={deletingAccount}
        onClose={() => !deletingAccount && setDeleteModal(false)}
        onConfirm={confirmDeleteAccount}
      />

      <SignOutDialog
        visible={signOutModal}
        busy={signingOut}
        onClose={() => !signingOut && setSignOutModal(false)}
        onConfirm={confirmSignOut}
      />

      <BottomSheet
        visible={profileModal}
        title={t('settings.editProfile')}
        onClose={() => !savingProfile && setProfileModal(false)}>
        <TextField
          label={t('auth.name')}
          icon="person-outline"
          value={editName}
          onChangeText={setEditName}
          autoCapitalize="words"
        />
        <TextField
          label={t('auth.nameUr')}
          icon="text-outline"
          value={editNameUr}
          onChangeText={setEditNameUr}
          autoCapitalize="words"
        />
        <RTLRow style={{ marginTop: 8 }} gap={10}>
          <Button
            title={t('common.cancel')}
            onPress={() => setProfileModal(false)}
            variant="outline"
            style={{ flex: 1 }}
            disabled={savingProfile}
          />
          <Button
            title={t('common.save')}
            onPress={saveProfileName}
            style={{ flex: 1 }}
            disabled={savingProfile}
          />
        </RTLRow>
      </BottomSheet>

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

      <BottomSheet
        visible={currencyModal}
        title={t('settings.selectCurrency')}
        scrollable={false}
        onClose={() => { setCurrencyModal(false); setCurrencySearch(''); }}>
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

      <BottomSheet
        visible={languageModal}
        title={t('settings.selectLanguage')}
        scrollable={false}
        onClose={() => { setLanguageModal(false); setLanguageSearch(''); }}>
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
  content: { paddingTop: Spacing.sm, paddingBottom: 48 },
  customHeader: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.25)',
  },
  customHeaderTitle: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 56,
  },
  headerLogout: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  profileCard: {
    marginHorizontal: Spacing.md,
    marginBottom: 14,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingTop: 22,
    overflow: 'hidden',
  },
  name: { marginTop: 12, marginBottom: 2, paddingHorizontal: Spacing.md },
  email: { marginTop: 4, marginBottom: 16, paddingHorizontal: Spacing.md },
  editProfileRow: {
    alignSelf: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  editProfileInner: { alignItems: 'center' },
  editProfileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileLabel: { flex: 1, fontWeight: '600' },
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
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  themePad: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  themePills: {
    flex: 1,
    alignItems: 'center',
  },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
  },
  pinHint: { marginBottom: 8 },
  pinFieldLabel: { marginTop: 14, marginBottom: 8 },
  deleteCard: {
    marginHorizontal: Spacing.md,
    marginTop: 4,
    marginBottom: 24,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deleteInner: { alignItems: 'center' },
  deleteIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCopy: { flex: 1, minWidth: 0, gap: 2 },
  deleteTitle: { fontWeight: '600' },
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  footerTagline: { marginTop: 2 },
  pressed: { opacity: 0.6 },
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
