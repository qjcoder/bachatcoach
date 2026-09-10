import { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { AppText } from '@/components/AppText';
import { RTLRow } from '@/components/RTLRow';
import { useDialog } from '@/context/DialogContext';
import { useAuth } from '@/context/AuthContext';
import { getCurrency } from '@/constants/currencies';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { usePageChrome } from '@/hooks/usePageChrome';
import {
  combineDateAndTime,
  formatTransactionDate,
  formatTransactionTime,
} from '@/lib/format';
import api from '@/lib/api';
import type { LoanEntryReport } from '@/lib/loansReportPdf';

export type LoanEntryEditTarget = {
  contactId: string;
  direction: 'i_lent' | 'i_borrowed';
  entry: LoanEntryReport;
};

type LoanEntryEditSheetProps = {
  visible: boolean;
  target: LoanEntryEditTarget | null;
  onClose: () => void;
  onSaved: () => void;
};

export function LoanEntryEditSheet({
  visible,
  target,
  onClose,
  onSaved,
}: LoanEntryEditSheetProps) {
  const { t, i18n } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const { user } = useAuth();
  const { text, muted, border, field, card } = usePageChrome();
  const currency = getCurrency(user?.currency);
  const accent =
    target?.direction === 'i_borrowed' ? Brand.danger : Brand.primary;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date());
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !target) return;
    setAmount(String(target.entry.amount || ''));
    setNote(target.entry.note || '');
    const d = target.entry.date ? new Date(target.entry.date) : new Date();
    setEntryDate(Number.isNaN(d.getTime()) ? new Date() : d);
    setPickerMode(null);
    setSaving(false);
  }, [visible, target]);

  const dateLabel = useMemo(
    () => formatTransactionDate(entryDate, i18n.language),
    [entryDate, i18n.language]
  );
  const timeLabel = useMemo(
    () => formatTransactionTime(entryDate, i18n.language),
    [entryDate, i18n.language]
  );

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerMode(null);
    if (event.type === 'dismissed' || !selected) return;
    setEntryDate((prev) =>
      pickerMode === 'date'
        ? combineDateAndTime(selected, prev)
        : combineDateAndTime(prev, selected)
    );
  };

  const save = async () => {
    if (!target?.entry.id || saving) return;
    const amt = Number(amount);
    if (!amount || !(amt > 0)) {
      showAlert({ title: t('common.error'), message: t('loans.amountRequired'), tone: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/contacts/${target.contactId}/entry/${target.entry.id}`, {
        amount: amt,
        note: note.trim(),
        date: entryDate.toISOString(),
      });
      onClose();
      onSaved();
    } catch {
      showAlert({
        title: t('common.error'),
        message: t('loans.entryUpdateFailed', { defaultValue: 'Could not update entry' }),
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!target?.entry.id || saving) return;
    showConfirm({
      title: t('loans.deleteEntryTitle', { defaultValue: 'Delete entry?' }),
      message: t('loans.deleteEntryBody', {
        defaultValue: 'This removes the entry and updates the balance.',
      }),
      tone: 'error',
      destructive: true,
      confirmLabel: t('common.delete'),
      onConfirm: async () => {
        setSaving(true);
        try {
          await api.delete(`/contacts/${target.contactId}/entry/${target.entry.id}`);
          onClose();
          onSaved();
        } catch {
          showAlert({
            title: t('common.error'),
            message: t('loans.entryDeleteFailed', { defaultValue: 'Could not delete entry' }),
            tone: 'error',
          });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  return (
    <>
      <BottomSheet
        visible={visible && !!target}
        title={t('loans.editEntry', { defaultValue: 'Edit entry' })}
        onClose={onClose}
        accentColor={accent}>
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
        </View>

        <RTLRow style={styles.metaRow} gap={8}>
          <Pressable
            onPress={() => setPickerMode('date')}
            style={[styles.metaChip, { borderColor: border, backgroundColor: field }]}>
            <View style={[styles.metaIconWrap, { backgroundColor: `${accent}22` }]}>
              <Ionicons name="calendar-outline" size={14} color={accent} />
            </View>
            <View style={styles.metaCopy}>
              <AppText variant="caption" color={muted} numberOfLines={1}>
                {t('expenses.date', { defaultValue: 'Date' })}
              </AppText>
              <AppText variant="captionBold" color={text} numberOfLines={1}>
                {dateLabel}
              </AppText>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setPickerMode('time')}
            style={[styles.metaChip, { borderColor: border, backgroundColor: field }]}>
            <View style={[styles.metaIconWrap, { backgroundColor: `${accent}22` }]}>
              <Ionicons name="time-outline" size={14} color={accent} />
            </View>
            <View style={styles.metaCopy}>
              <AppText variant="caption" color={muted} numberOfLines={1}>
                {t('expenses.time', { defaultValue: 'Time' })}
              </AppText>
              <AppText variant="captionBold" color={text} numberOfLines={1}>
                {timeLabel}
              </AppText>
            </View>
          </Pressable>
        </RTLRow>

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

        <RTLRow style={styles.footerRow} gap={10}>
          <Pressable
            onPress={remove}
            disabled={saving}
            style={({ pressed }) => [
              styles.deleteBtn,
              { borderColor: `${Brand.danger}55`, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Ionicons name="trash-outline" size={16} color={Brand.danger} />
            <AppText variant="captionBold" color={Brand.danger} numberOfLines={1}>
              {t('common.delete')}
            </AppText>
          </Pressable>
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
              <AppText variant="bodySemibold" color="#FFFFFF">
                {t('common.save')}
              </AppText>
            )}
          </Pressable>
        </RTLRow>
      </BottomSheet>

      {pickerMode && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setPickerMode(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerMode(null)} />
          <View style={[styles.modalSheet, { backgroundColor: card }]}>
            <RTLRow style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <AppText variant="bodySemibold" color={text}>
                {pickerMode === 'date' ? t('expenses.date') : t('expenses.time')}
              </AppText>
              <Pressable onPress={() => setPickerMode(null)} hitSlop={10}>
                <AppText variant="captionBold" color={accent}>
                  {t('common.done')}
                </AppText>
              </Pressable>
            </RTLRow>
            <DateTimePicker
              value={entryDate}
              mode={pickerMode}
              display="spinner"
              onChange={onPickerChange}
            />
          </View>
        </Modal>
      ) : null}

      {pickerMode && Platform.OS === 'android' ? (
        <DateTimePicker
          value={entryDate}
          mode={pickerMode}
          display="default"
          onChange={onPickerChange}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
  metaRow: {
    marginBottom: Spacing.md,
    alignItems: 'stretch',
  },
  metaChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 48,
  },
  metaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCopy: { flex: 1, minWidth: 0, gap: 2 },
  footerRow: {
    marginTop: 4,
    alignItems: 'stretch',
  },
  saveBtn: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
});
