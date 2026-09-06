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
  /** Force dark surfaces for add-transaction */
  dark?: boolean;
};

export function TransactionDateTime({
  value,
  onChange,
  accent = Brand.primary,
  dark = false,
}: TransactionDateTimeProps) {
  const { t, i18n } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { headingBlock } = useDirection();
  const isRTL = useIsRTL();
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const text = dark ? '#FFFFFF' : colors.text;
  const muted = dark ? 'rgba(255,255,255,0.55)' : colors.muted;
  const field = dark ? 'rgba(255,255,255,0.06)' : colors.field;
  const border = dark ? 'rgba(255,255,255,0.1)' : colors.border;
  const card = dark ? '#0F1C19' : colors.card;
  const themeVariant = dark ? 'dark' : scheme;

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
      <RTLRow gap={10} style={[styles.pickerActions, { borderTopColor: border }]}>
        <Pressable
          onPress={closePickers}
          style={[styles.actionBtn, { borderColor: border, backgroundColor: card }]}>
          <AppText variant="bodySmallBold" color={text}>
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
            { backgroundColor: dark ? field : `${accent}08`, borderColor: showDate ? accent : dark ? border : `${accent}22` },
            showDate && styles.cellActive,
          ]}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}16` }]}>
            <Ionicons name="calendar-outline" size={18} color={accent} />
          </View>
          <AppText variant="caption" color={muted} style={headingBlock}>
            {t('expenses.date')}
          </AppText>
          <AppText variant="bodySmallBold" color={text} style={headingBlock}>
            {formatTransactionDate(value, i18n.language)}
          </AppText>
        </Pressable>

        <Pressable
          onPress={openTime}
          style={[
            styles.cell,
            { backgroundColor: dark ? field : `${accent}08`, borderColor: showTime ? accent : dark ? border : `${accent}22` },
            showTime && styles.cellActive,
          ]}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}16` }]}>
            <Ionicons name="time-outline" size={18} color={accent} />
          </View>
          <AppText variant="caption" color={muted} style={headingBlock}>
            {t('expenses.time')}
          </AppText>
          <AppText variant="bodySmallBold" color={text} style={headingBlock}>
            {formatTransactionTime(value, i18n.language)}
          </AppText>
        </Pressable>
      </RTLRow>

      {showDate ? (
        <View style={[styles.pickerPanel, { borderColor: border, backgroundColor: field }]}>
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={value}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
              themeVariant={themeVariant}
            />
          </View>
          {renderPickerActions('date')}
        </View>
      ) : null}

      {showTime ? (
        <View style={[styles.pickerPanel, { borderColor: border, backgroundColor: field }]}>
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={value}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              themeVariant={themeVariant}
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 72,
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
  },
  pickerWrap: {
    overflow: 'hidden',
  },
  pickerActions: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
});
