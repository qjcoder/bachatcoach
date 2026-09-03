import { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, Alert, Switch, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { RTLRow } from '@/components/RTLRow';
import { Brand, Radius } from '@/constants/theme';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getGoogleAccessToken, isGoogleAuthConfigured } from '@/lib/googleAuth';
import {
  downloadBackupFromDrive,
  isBackupDue,
  uploadBackupToDrive,
  type BackupFrequency,
} from '@/lib/googleDriveBackup';

const FREQUENCIES: BackupFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

export function DriveBackupSection() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [busy, setBusy] = useState(false);
  const [autoRan, setAutoRan] = useState(false);

  const frequency = (user?.backupFrequency || 'off') as BackupFrequency;
  const enabled = Boolean(user?.backupEnabled) && frequency !== 'off';

  const runBackup = useCallback(
    async (silent = false) => {
      const token = await getGoogleAccessToken();
      if (!token) {
        if (!silent) Alert.alert(t('backup.title'), t('backup.needGoogle'));
        return false;
      }
      setBusy(true);
      try {
        const { data } = await api.get('/backup/export');
        await uploadBackupToDrive(data);
        await api.patch('/backup/settings', {
          lastBackupAt: new Date().toISOString(),
          backupEnabled: true,
          backupFrequency: frequency === 'off' ? 'weekly' : frequency,
        });
        await refreshUser();
        if (!silent) Alert.alert(t('backup.title'), t('backup.success'));
        return true;
      } catch (err: unknown) {
        if (!silent) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            (err instanceof Error ? err.message : t('backup.failed'));
          Alert.alert(t('backup.title'), message);
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [frequency, refreshUser, t]
  );

  const runRestore = async () => {
    Alert.alert(t('backup.restoreTitle'), t('backup.restoreConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('backup.restore'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const payload = await downloadBackupFromDrive();
            await api.post('/backup/restore', payload);
            await refreshUser();
            Alert.alert(t('backup.title'), t('backup.restoreSuccess'));
          } catch (err: unknown) {
            const message =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              (err instanceof Error ? err.message : t('backup.restoreFailed'));
            Alert.alert(t('backup.title'), message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const setFrequency = async (next: BackupFrequency) => {
    setBusy(true);
    try {
      await api.patch('/backup/settings', {
        backupFrequency: next,
        backupEnabled: next !== 'off',
      });
      await refreshUser();
    } catch {
      Alert.alert(t('backup.title'), t('backup.settingsFailed'));
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (value: boolean) => {
    if (value && !(await getGoogleAccessToken())) {
      Alert.alert(t('backup.title'), t('backup.needGoogle'));
      return;
    }
    setBusy(true);
    try {
      await api.patch('/backup/settings', {
        backupEnabled: value,
        backupFrequency: value ? (frequency === 'off' ? 'weekly' : frequency) : 'off',
      });
      await refreshUser();
    } catch {
      Alert.alert(t('backup.title'), t('backup.settingsFailed'));
    } finally {
      setBusy(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (autoRan || cancelled) return;
        if (!enabled || !isGoogleAuthConfigured()) return;
        try {
          const net = await Network.getNetworkStateAsync();
          if (!net.isConnected) return;
        } catch {
          /* ignore */
        }
        if (!isBackupDue(frequency, user?.lastBackupAt)) return;
        setAutoRan(true);
        await runBackup(true);
      })();
      return () => {
        cancelled = true;
      };
    }, [autoRan, enabled, frequency, runBackup, user?.lastBackupAt])
  );

  const lastLabel = user?.lastBackupAt
    ? new Date(user.lastBackupAt).toLocaleString(i18n.language)
    : t('backup.never');

  return (
    <>
      <AppText variant="overline" color={colors.muted} style={styles.groupLabel}>
        {t('backup.title')}
      </AppText>
      <Card variant="elevated">
        <View style={styles.row}>
          <RTLRow gap={12} style={styles.rowInner}>
            <View style={[styles.iconWrap, { backgroundColor: `${Brand.primary}12` }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={Brand.primary} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodySemibold" color={colors.text}>
                {t('backup.enable')}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                {t('backup.subtitle')}
              </AppText>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggleEnabled}
              disabled={busy}
              trackColor={{ true: Brand.primary }}
            />
          </RTLRow>
        </View>

        {enabled ? (
          <View style={styles.freqWrap}>
            <AppText variant="captionBold" color={colors.muted} style={styles.freqLabel}>
              {t('backup.frequency')}
            </AppText>
            <RTLRow gap={8} style={styles.chips}>
              {FREQUENCIES.map((f) => {
                const selected = frequency === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFrequency(f)}
                    disabled={busy}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <AppText
                      variant="captionBold"
                      color={selected ? '#fff' : Brand.primary}
                      align="center">
                      {t(`backup.${f}`)}
                    </AppText>
                  </Pressable>
                );
              })}
            </RTLRow>
          </View>
        ) : null}

        <AppText variant="caption" color={colors.muted} style={styles.last}>
          {t('backup.lastBackup')}: {lastLabel}
        </AppText>

        <RTLRow gap={10} style={styles.actions}>
          <Button
            title={busy ? t('common.loading') : t('backup.backupNow')}
            onPress={() => runBackup(false)}
            disabled={busy}
            style={{ flex: 1 }}
          />
          <Button
            title={t('backup.restore')}
            onPress={runRestore}
            variant="outline"
            disabled={busy}
            style={{ flex: 1 }}
          />
        </RTLRow>
        {busy ? <ActivityIndicator style={styles.spinner} color={Brand.primary} /> : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  groupLabel: { marginTop: 20, marginBottom: 8, marginHorizontal: 4 },
  row: { paddingVertical: 4 },
  rowInner: { width: '100%', alignItems: 'center' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, minWidth: 0 },
  freqWrap: { marginTop: 12 },
  freqLabel: { marginBottom: 8 },
  chips: { flexWrap: 'wrap', width: '100%' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: `${Brand.primary}40`,
    backgroundColor: `${Brand.primary}10`,
  },
  chipSelected: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  last: { marginTop: 12 },
  actions: { marginTop: 14, width: '100%' },
  spinner: { marginTop: 10 },
});
