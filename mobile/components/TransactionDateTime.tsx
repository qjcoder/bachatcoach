import { useState } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { RTLRow } from '@/components/RTLRow';
import { formatTransactionDate, formatTransactionTime } from '@/lib/format';
import { useDirection } from '@/hooks/useDirection';
import { useIsRTL } from '@/hooks/useIsRTL';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius } from '@/constants/theme';

type TransactionDateTimeProps = {
  value: Date;
  onChange: (date: Date) => void;
  accent?: string;
};

export function TransactionDateTime({ value, onChange, accent = Brand.primary }: TransactionDateTimeProps) {
  const { t, i18n } = useTranslation();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { headingBlock } = useDirection();
  const isRTL = useIsRTL();
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const closePickers = () => {
    setShowDate(false);
    setShowTime(false);
  };

  const openDate = () => {
    if (showDate) {
      closePickers();
      return;
    }
    setShowTime(false);
    setShowDate(true);
  };

  const openTime = () => {
    if (showTime) {
      closePickers();
      return;
    }
    setShowDate(false);
    setShowTime(true);
  };

  const continueToTime = () => {
    setShowDate(false);
    setShowTime(true);
  };

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') closePickers();
    if (!selected) return;
    const next = new Date(value);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    onChange(next);
  };

  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') closePickers();
    if (!selected) return;
    const next = new Date(value);
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);
  };

  const renderPickerActions = (mode: 'date' | 'time') => {
    if (Platform.OS !== 'ios') return null;

    return (
      <RTLRow gap={10} style={styles.pickerActions}>
        <Pressable
          onPress={closePickers}
          style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <AppText variant="bodySmallBold" color={colors.text}>
            {t('common.done')}
          </AppText>
        </Pressable>
        {mode === 'date' ? (
          <Pressable
            onPress={continueToTime}
            style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: accent }]}>
            <RTLRow gap={6} style={styles.actionBtnInner}>
              <AppText variant="bodySmallBold" color="#FFFFFF">
                {t('expenses.continueToTime')}
              </AppText>
              <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={16} color="#FFFFFF" />
            </RTLRow>
          </Pressable>
        ) : null}
      </RTLRow>
    );
  };

  return (
    <View style={styles.wrap}>
      <RTLRow gap={10} style={styles.row}>
        <Pressable
          onPress={openDate}
          style={[
            styles.cell,
            { backgroundColor: `${accent}08`, borderColor: showDate ? accent : `${accent}22` },
            showDate && styles.cellActive,
          ]}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}16` }]}>
            <Ionicons name="calendar-outline" size={18} color={accent} />
          </View>
          <AppText variant="caption" color={colors.muted} style={headingBlock}>
            {t('expenses.date')}
          </AppText>
          <AppText variant="bodySmallBold" color={colors.text} style={headingBlock}>
            {formatTransactionDate(value, i18n.language)}
          </AppText>
        </Pressable>

        <Pressable
          onPress={openTime}
          style={[
            styles.cell,
            { backgroundColor: `${accent}08`, borderColor: showTime ? accent : `${accent}22` },
            showTime && styles.cellActive,
          ]}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}16` }]}>
            <Ionicons name="time-outline" size={18} color={accent} />
          </View>
          <AppText variant="caption" color={colors.muted} style={headingBlock}>
            {t('expenses.time')}
          </AppText>
          <AppText variant="bodySmallBold" color={colors.text} style={headingBlock}>
            {formatTransactionTime(value, i18n.language)}
          </AppText>
        </Pressable>
      </RTLRow>

      {showDate ? (
        <View style={[styles.pickerPanel, { borderColor: colors.border }]}>
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={value}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          </View>
          {renderPickerActions('date')}
        </View>
      ) : null}

      {showTime ? (
        <View style={[styles.pickerPanel, { borderColor: colors.border }]}>
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={value}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          </View>
          {renderPickerActions('time')}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  row: { alignItems: 'stretch' },
  cell: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 14,
    minHeight: 96,
    justifyContent: 'center',
  },
  cellActive: {
    borderWidth: 1.5,
  },
  pickerPanel: {
    marginTop: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  pickerWrap: {
    overflow: 'hidden',
  },
  pickerActions: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionBtnPrimary: {
    borderWidth: 0,
  },
  actionBtnInner: {
    justifyContent: 'center',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
});
