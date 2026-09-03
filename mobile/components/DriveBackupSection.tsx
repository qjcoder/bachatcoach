import { useCallback, useState } from 'react';
import { View, StyleSheet, Switch, ActivityIndicator, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import * as Network from 'expo-network';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { SettingsMenuRow } from '@/components/SettingsMenuRow';
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

type RowTheme = {
  textColor: string;
  mutedColor: string;
  borderColor: string;
};

type Props = {
  rowTheme: RowTheme;
};

export function DriveBackupSection({ rowTheme }: Props) {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [busy, setBusy] = useState(false);
  const [autoRan, setAutoRan] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const frequency = (user?.backupFrequency || 'off') as BackupFrequency;
  const enabled = Boolean(user?.backupEnabled) && frequency !== 'off';

  const runBackup = useCallback(
    async (silent = false) => {
      const token = await getGoogleAccessToken();
      if (!token) {
        if (!silent) {
          showAlert({ title: t('backup.title'), message: t('backup.needGoogle'), tone: 'warning' });
        }
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
        if (!silent) {
          setSheetOpen(false);
          showAlert({ title: t('backup.title'), message: t('backup.success'), tone: 'success' });
        }
        return true;
      } catch (err: unknown) {
        if (!silent) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            (err instanceof Error ? err.message : t('backup.failed'));
          showAlert({ title: t('backup.title'), message, tone: 'error' });
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [frequency, refreshUser, showAlert, t]
  );

  const runRestore = () => {
    showConfirm({
      title: t('backup.restoreTitle'),
      message: t('backup.restoreConfirm'),
      confirmLabel: t('backup.restore'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      tone: 'warning',
      onConfirm: async () => {
        setBusy(true);
        try {
          const payload = await downloadBackupFromDrive();
          await api.post('/backup/restore', payload);
          await refreshUser();
          setSheetOpen(false);
          showAlert({ title: t('backup.title'), message: t('backup.restoreSuccess'), tone: 'success' });
        } catch (err: unknown) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            (err instanceof Error ? err.message : t('backup.restoreFailed'));
          showAlert({ title: t('backup.title'), message, tone: 'error' });
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const setFrequency = async (next: BackupFrequency) => {
    setBusy(true);
    try {
      await api.patch('/backup/settings', { backupFrequency: next, backupEnabled: true });
      await refreshUser();
    } catch {
      showAlert({ title: t('backup.title'), message: t('backup.settingsFailed'), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (value: boolean) => {
    if (value && !(await getGoogleAccessToken())) {
      showAlert({ title: t('backup.title'), message: t('backup.needGoogle'), tone: 'warning' });
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
      showAlert({ title: t('backup.title'), message: t('backup.settingsFailed'), tone: 'error' });
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
  const statusLabel = enabled
    ? t(`backup.${frequency === 'off' ? 'weekly' : frequency}`)
    : t('backup.off');
  const switchTrack = { false: scheme === 'dark' ? '#334155' : '#CBD5E1', true: Brand.primary };

  return (
    <>
      <SettingsMenuRow
        icon="cloud-outline"
        label={t('backup.menu')}
        detail={statusLabel}
        onPress={() => setSheetOpen(true)}
        {...rowTheme}
      />

      <BottomSheet visible={sheetOpen} title={t('backup.title')} onClose={() => !busy && setSheetOpen(false)}>
        <AppText variant="caption" color={colors.muted} style={styles.intro}>
          {t('backup.subtitle')}
        </AppText>
        <AppText variant="caption" color={colors.muted} style={styles.lastBackup}>
          {t('backup.lastBackup')}: {lastLabel}
        </AppText>

        <View style={[styles.sheetCard, { backgroundColor: scheme === 'dark' ? '#0F172A' : '#F8FAFC', borderColor: colors.border }]}>
          <SettingsMenuRow
            icon="cloud-upload-outline"
            label={t('backup.enable')}
            {...rowTheme}
            last={!enabled}
            right={
              <Switch
                value={enabled}
                onValueChange={toggleEnabled}
                disabled={busy}
                trackColor={switchTrack}
                thumbColor="#fff"
              />
            }
          />
          {enabled ? (
            <View style={[styles.freqWrap, { borderBottomColor: colors.border }]}>
              <AppText variant="caption" color={colors.muted} style={styles.freqLabel}>
                {t('backup.frequency')}
              </AppText>
              <View style={styles.freqRow}>
                {FREQUENCIES.map((f) => {
                  const selected = frequency === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => setFrequency(f)}
                      disabled={busy}
                      style={[styles.chip, selected && styles.chipOn]}>
                      <AppText variant="captionBold" color={selected ? '#fff' : colors.muted}>
                        {t(`backup.${f}`)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          <SettingsMenuRow
            icon="arrow-up-outline"
            label={t('backup.backupNow')}
            onPress={() => runBackup(false)}
            {...rowTheme}
            right={busy ? <ActivityIndicator size="small" color={Brand.primary} /> : undefined}
          />
          <SettingsMenuRow
            icon="arrow-down-outline"
            label={t('backup.restore')}
            onPress={runRestore}
            last
            {...rowTheme}
          />
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 4 },
  lastBackup: { marginBottom: 16 },
  sheetCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  freqWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  freqLabel: { marginBottom: 8 },
  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(148,163,184,0.16)',
  },
  chipOn: { backgroundColor: Brand.primary },
});
