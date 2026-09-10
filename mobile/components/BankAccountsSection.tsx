import { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useDialog } from '@/context/DialogContext';
import { AppText } from '@/components/AppText';
import { SettingsMenuRow } from '@/components/SettingsMenuRow';
import { BottomSheet } from '@/components/BottomSheet';
import { TextField } from '@/components/TextField';
import { RTLRow } from '@/components/RTLRow';
import { BankLogo } from '@/components/BankLogo';
import { getCountryBanks, searchCountryBanks } from '@/constants/banks';
import { Brand, Radius } from '@/constants/theme';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type BankAccount = {
  _id: string;
  name: string;
};

type RowTheme = {
  textColor: string;
  mutedColor: string;
  borderColor: string;
};

type Props = {
  rowTheme: RowTheme;
  currencyCode?: string;
  last?: boolean;
};

export function BankAccountsMenuRow({ rowTheme, currencyCode = 'PKR', last }: Props) {
  const { t } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const country = useMemo(() => getCountryBanks(currencyCode), [currencyCode]);

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bank-accounts');
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      /* keep last list */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const catalog = useMemo(
    () => searchCountryBanks(currencyCode, search),
    [currencyCode, search]
  );

  const ownedNames = useMemo(
    () => new Set(accounts.map((a) => a.name.trim().toLowerCase())),
    [accounts]
  );

  const subtitle =
    accounts.length === 0
      ? t('banks.rowEmpty', { country: country.countryName })
      : accounts.length === 1
        ? accounts[0].name
        : t('banks.rowCount', { count: accounts.length });

  const openManage = () => {
    setManageOpen(true);
    void load();
  };

  const openPicker = () => {
    setSearch('');
    setCustomName('');
    setShowCustom(false);
    setPickerOpen(true);
  };

  const addBank = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      showAlert({
        title: t('banks.title'),
        message: t('banks.nameRequired'),
        tone: 'warning',
      });
      return;
    }
    if (ownedNames.has(trimmed.toLowerCase())) {
      showAlert({
        title: t('banks.title'),
        message: t('banks.alreadyAdded'),
        tone: 'warning',
      });
      return;
    }
    setSaving(true);
    try {
      await api.post('/bank-accounts', { name: trimmed });
      setPickerOpen(false);
      setShowCustom(false);
      await load();
      setManageOpen(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('banks.saveFailed');
      showAlert({ title: t('banks.title'), message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = (account: BankAccount) => {
    showConfirm({
      title: t('banks.deleteTitle'),
      message: t('banks.deleteConfirm', { name: account.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      tone: 'error',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/bank-accounts/${account._id}`);
          await load();
        } catch {
          showAlert({
            title: t('banks.title'),
            message: t('banks.deleteFailed'),
            tone: 'error',
          });
        }
      },
    });
  };

  return (
    <>
      <SettingsMenuRow
        icon="business-outline"
        label={t('banks.menuLabel')}
        subtitle={subtitle}
        onPress={openManage}
        last={last}
        {...rowTheme}
      />

      <BottomSheet
        visible={manageOpen}
        title={t('banks.title')}
        onClose={() => setManageOpen(false)}>
        {loading && accounts.length === 0 ? (
          <View style={styles.loadingPad}>
            <ActivityIndicator color={Brand.primary} />
          </View>
        ) : null}

        {accounts.map((account) => (
          <View
            key={account._id}
            style={[styles.accountRow, { borderColor: rowTheme.borderColor }]}>
            <RTLRow gap={10} style={{ alignItems: 'center', flex: 1 }}>
              <BankLogo name={account.name} size={32} />
              <AppText variant="bodySemibold" color={rowTheme.textColor} style={{ flex: 1 }} numberOfLines={2}>
                {account.name}
              </AppText>
            </RTLRow>
            <Pressable onPress={() => remove(account)} hitSlop={10} style={styles.removeBtn}>
              <Ionicons name="trash-outline" size={18} color={Brand.danger} />
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={openPicker}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}>
          <RTLRow gap={8} style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="add-circle-outline" size={18} color={Brand.primary} />
            <AppText variant="bodySemibold" color={Brand.primary}>
              {t('banks.add')}
            </AppText>
          </RTLRow>
        </Pressable>
      </BottomSheet>

      <BottomSheet
        visible={pickerOpen}
        title={t('banks.pickTitle', { country: country.countryName })}
        onClose={() => !saving && setPickerOpen(false)}
        scrollable={false}>
        <TextField
          label={t('banks.search')}
          icon="search-outline"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          placeholder={t('banks.searchPlaceholder')}
        />

        {showCustom ? (
          <View style={styles.customBlock}>
            <AppText variant="caption" color={colors.muted} style={styles.hint}>
              {t('banks.customHint')}
            </AppText>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder={t('banks.namePlaceholder')}
              placeholderTextColor={colors.muted}
              autoFocus
              maxLength={80}
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.field,
                  borderColor: colors.border,
                },
              ]}
            />
            <Pressable
              onPress={() => addBank(customName)}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: Brand.primary, opacity: saving ? 0.65 : pressed ? 0.9 : 1 },
              ]}>
              <AppText variant="button" color="#FFFFFF" align="center">
                {saving ? t('common.loading') : t('common.save')}
              </AppText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={catalog}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const added = ownedNames.has(item.trim().toLowerCase());
              const isOther = item === 'Other bank';
              return (
                <Pressable
                  disabled={saving || (added && !isOther)}
                  onPress={() => {
                    if (isOther) {
                      setShowCustom(true);
                      return;
                    }
                    void addBank(item);
                  }}
                  style={({ pressed }) => [
                    styles.bankRow,
                    { borderColor: colors.border, backgroundColor: colors.field },
                    pressed && { opacity: 0.88 },
                    added && !isOther && { opacity: 0.55 },
                  ]}>
                  {isOther ? (
                    <Ionicons name="create-outline" size={22} color={Brand.primary} />
                  ) : (
                    <BankLogo name={item} size={32} />
                  )}
                  <AppText variant="bodySemibold" color={colors.text} style={{ flex: 1 }} numberOfLines={2}>
                    {isOther ? t('banks.other') : item}
                  </AppText>
                  {added && !isOther ? (
                    <Ionicons name="checkmark-circle" size={18} color={Brand.primary} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={18} color={Brand.primary} />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <AppText variant="caption" color={colors.muted} style={styles.empty}>
                {t('banks.noMatch')}
              </AppText>
            }
          />
        )}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 12 },
  empty: { paddingVertical: 8, marginBottom: 8 },
  loadingPad: { paddingVertical: 16, alignItems: 'center' },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 8,
  },
  removeBtn: { padding: 4 },
  addBtn: {
    paddingVertical: 14,
    marginTop: 4,
  },
  list: { maxHeight: 420, marginTop: 8 },
  listContent: { paddingBottom: 12, gap: 8 },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  customBlock: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  saveBtn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
