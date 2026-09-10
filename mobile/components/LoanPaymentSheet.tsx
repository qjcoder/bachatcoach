import { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { AppText } from '@/components/AppText';
import { useDialog } from '@/context/DialogContext';
import { useAuth } from '@/context/AuthContext';
import { getCurrency } from '@/constants/currencies';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { formatAmount } from '@/lib/format';
import { usePageChrome } from '@/hooks/usePageChrome';
import api from '@/lib/api';

export type LoanPaymentTarget = {
  id: string;
  name: string;
  direction: 'i_lent' | 'i_borrowed';
  balance: number;
};

type LoanPaymentSheetProps = {
  visible: boolean;
  target: LoanPaymentTarget | null;
  onClose: () => void;
  onSaved: () => void;
};

export function LoanPaymentSheet({
  visible,
  target,
  onClose,
  onSaved,
}: LoanPaymentSheetProps) {
  const { t, i18n } = useTranslation();
  const { showAlert } = useDialog();
  const { user } = useAuth();
  const { text, muted, border, field } = usePageChrome();
  const currency = getCurrency(user?.currency);

  const isLent = target?.direction === 'i_lent';
  const accent = isLent ? Brand.primary : Brand.danger;
  const entryType = isLent ? 'repaid' : 'paid_back';

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !target) return;
    setAmount(target.balance > 0 ? String(target.balance) : '');
    setNote('');
    setSaving(false);
  }, [visible, target]);

  const title = isLent
    ? t('loans.paymentReceived', { defaultValue: 'Received' })
    : t('loans.paymentPaying', { defaultValue: 'Paying' });

  const subtitle = isLent
    ? t('loans.paymentReceivedHint', {
        name: target?.name || '',
        defaultValue: `Record money received back from ${target?.name || 'this person'}.`,
      })
    : t('loans.paymentPayingHint', {
        name: target?.name || '',
        defaultValue: `Record money you paid back to ${target?.name || 'this person'}.`,
      });

  const balanceLabel = useMemo(() => {
    if (!target) return '';
    return `${currency.symbol} ${formatAmount(target.balance || 0, i18n.language)}`;
  }, [target, currency.symbol, i18n.language]);

  const save = async () => {
    if (!target || saving) return;
    const amt = Number(amount);
    if (!amount || !(amt > 0)) {
      showAlert({ title: t('common.error'), message: t('loans.amountRequired'), tone: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/contacts/${target.id}/entry`, {
        type: entryType,
        amount: amt,
        note: note.trim() || undefined,
      });
      onClose();
      onSaved();
    } catch {
      showAlert({
        title: t('common.error'),
        message: t('loans.paymentFailed', { defaultValue: 'Could not save payment' }),
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible && !!target} title={title} onClose={onClose} accentColor={accent}>
      <AppText variant="caption" color={muted} style={styles.hint}>
        {subtitle}
      </AppText>

      <View style={[styles.balanceChip, { borderColor: `${accent}40`, backgroundColor: `${accent}12` }]}>
        <AppText variant="caption" color={muted}>
          {t('loans.balance')}
        </AppText>
        <AppText variant="bodySemibold" color={accent}>
          {balanceLabel}
        </AppText>
      </View>

      <AppText variant="captionBold" color={muted} style={styles.label}>
        {t('loans.amount')}
      </AppText>
      <View style={[styles.field, { borderColor: border, backgroundColor: field }]}>
        <AppText variant="bodySemibold" color={muted}>
          {currency.symbol}
        </AppText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={muted}
          style={[styles.input, { color: text }]}
        />
        {target && target.balance > 0 ? (
          <Pressable
            onPress={() => setAmount(String(target.balance))}
            hitSlop={8}
            style={[styles.fullBtn, { backgroundColor: `${accent}18` }]}>
            <AppText variant="captionBold" color={accent}>
              {Number(amount) > 0 && Number(amount) < target.balance
                ? t('loans.payPartial', { defaultValue: 'Partial' })
                : t('loans.payFull', { defaultValue: 'Full' })}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <AppText variant="captionBold" color={muted} style={styles.label}>
        {t('loans.reportNote')}
      </AppText>
      <View style={[styles.field, { borderColor: border, backgroundColor: field }]}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t('loans.paymentNoteOptional', { defaultValue: 'Optional note' })}
          placeholderTextColor={muted}
          style={[styles.input, { color: text }]}
        />
      </View>

      <Pressable
        onPress={save}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: accent, opacity: saving ? 0.65 : pressed ? 0.9 : 1 },
        ]}>
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name={isLent ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={18}
              color="#FFFFFF"
            />
            <AppText variant="bodySemibold" color="#FFFFFF">
              {title}
            </AppText>
          </>
        )}
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: Spacing.sm, lineHeight: 18 },
  balanceChip: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  label: { marginBottom: 6 },
  field: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  fullBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  saveBtn: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
