import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable, ScrollView, Platform } from 'react-native';
import { AppText } from '@/components/AppText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { getCategoryLabel } from '@/lib/category';
import { useFormatPKR, formatTransactionDate, formatTransactionTime } from '@/lib/format';
import {
  getTransactionPeriodRange,
  periodFetchLimit,
  type TransactionPeriod,
} from '@/lib/transactionPeriod';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { RTLRow } from '@/components/RTLRow';
import { ListCard, StatCard } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ReceiptViewer } from '@/components/ReceiptViewer';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { hasReceipt } from '@/lib/googleDrive';

type Transaction = {
  _id: string;
  type: 'expense' | 'income';
  amount: number;
  category?: string;
  customCategory?: string;
  paymentMethod?: string;
  note?: string;
  date: string;
  receiptImage?: string;
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: 'restaurant-outline',
  transport: 'car-outline',
  bills: 'flash-outline',
  rent: 'home-outline',
  shopping: 'bag-outline',
  health: 'medkit-outline',
  entertainment: 'game-controller-outline',
  education: 'school-outline',
  subscriptions: 'repeat-outline',
  personal: 'person-outline',
  savings: 'wallet-outline',
  salary: 'cash-outline',
  freelance: 'laptop-outline',
  gift: 'gift-outline',
  investment: 'trending-up-outline',
  other: 'ellipsis-horizontal-circle-outline',
  other_income: 'add-circle-outline',
};

const PERIOD_TABS: TransactionPeriod[] = ['today', 'week', 'month', 'year'];

function openEditParams(item: Transaction) {
  return {
    type: item.type,
    id: item._id,
    amount: String(item.amount ?? ''),
    category: item.category || '',
    customCategory: item.customCategory || '',
    paymentMethod: item.paymentMethod || '',
    note: item.note || '',
    date: item.date || '',
    receiptImage: item.receiptImage || '',
  };
}

export default function ExpensesScreen() {
  const { t, i18n } = useTranslation();
  const formatPKR = useFormatPKR();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [items, setItems] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<TransactionPeriod>('month');
  const [receiptRef, setReceiptRef] = useState<string | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const load = useCallback(async (activePeriod: TransactionPeriod, fresh = false) => {
    const { from, to } = getTransactionPeriodRange(activePeriod);
    const { data } = await api.get('/transactions', {
      params: { from, to, limit: periodFetchLimit(activePeriod) },
      headers: fresh ? { 'X-Bypass-Cache': '1' } : undefined,
    });
    setItems(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(period).catch(() => {
        /* keep last list on focus errors */
      });
    }, [load, period])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load(period, true);
    } finally {
      setRefreshing(false);
    }
  };

  const periodTabs = PERIOD_TABS.map((key) => ({
    key,
    label: t(`expenses.filter${key.charAt(0).toUpperCase()}${key.slice(1)}`),
  }));

  const { totalIn, totalOut } = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          if (item.type === 'income') acc.totalIn += item.amount;
          else acc.totalOut += item.amount;
          return acc;
        },
        { totalIn: 0, totalOut: 0 }
      ),
    [items]
  );

  const selectedIsIncome = selected?.type === 'income';
  const selectedTint = selectedIsIncome ? Brand.primary : Brand.danger;
  const selectedReceiptDrive = selected?.receiptImage?.startsWith('drive:') ?? false;
  const selectedHasReceipt = hasReceipt(selected?.receiptImage);

  const closeDetails = () => setSelected(null);

  const goEdit = (item: Transaction) => {
    closeDetails();
    router.push({ pathname: '/add-transaction', params: openEditParams(item) });
  };

  /** Close details sheet first — iOS cannot reliably stack Modal on Modal. */
  const openReceipt = (ref: string) => {
    closeDetails();
    const delay = Platform.OS === 'ios' ? 380 : 120;
    setTimeout(() => setReceiptRef(ref), delay);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RTLRow style={styles.actions} gap={10}>
        <Button
          title={t('expenses.addExpense')}
          onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'expense' } })}
          style={styles.btn}
        />
        <Button
          title={t('expenses.addIncome')}
          onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'income' } })}
          variant="outline"
          style={styles.btn}
        />
      </RTLRow>

      <View style={styles.filters}>
        <SegmentedTabs tabs={periodTabs} active={period} onChange={setPeriod} />
      </View>

      <RTLRow style={styles.summary} gap={12}>
        <StatCard
          label={t('expenses.totalIn')}
          value={formatPKR(totalIn)}
          accent={Brand.primary}
          iconName="arrow-down-circle-outline"
        />
        <StatCard
          label={t('expenses.totalOut')}
          value={formatPKR(totalOut)}
          accent={Brand.danger}
          iconName="arrow-up-circle-outline"
        />
      </RTLRow>

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(item) => item._id}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
        updateCellsBatchingPeriod={50}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title={t('expenses.noTransactionsPeriod')} />
        }
        renderItem={({ item }) => {
          const isIncome = item.type === 'income';
          const iconName = CATEGORY_ICONS[item.category || ''] || 'ellipse-outline';
          const tint = isIncome ? Brand.primary : Brand.danger;
          const attached = hasReceipt(item.receiptImage);
          return (
            <ListCard
              icon={iconName}
              iconColor={tint}
              iconBg={`${tint}12`}
              title={getCategoryLabel(item.category, item.customCategory, t)}
              subtitle={item.note || undefined}
              meta={`${formatTransactionDate(item.date, i18n.language)} · ${formatTransactionTime(item.date, i18n.language)}${attached ? ' · 📎' : ''}`}
              onPress={() => setSelected(item)}
              onEdit={() => goEdit(item)}
              editLabel={isIncome ? t('expenses.editIncome') : t('expenses.editExpense')}
              trailing={
                <AppText variant="amountSm" color={tint}>
                  {isIncome ? '+' : '−'}
                  {formatPKR(item.amount)}
                </AppText>
              }
            />
          );
        }}
      />

      <BottomSheet
        visible={!!selected}
        title={t('expenses.details')}
        onClose={closeDetails}>
        {selected ? (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.detailHero, { backgroundColor: `${selectedTint}12` }]}>
              <View style={[styles.detailIcon, { backgroundColor: `${selectedTint}18` }]}>
                <Ionicons
                  name={CATEGORY_ICONS[selected.category || ''] || 'ellipse-outline'}
                  size={26}
                  color={selectedTint}
                />
              </View>
              <AppText variant="captionBold" color={selectedTint}>
                {selectedIsIncome ? t('expenses.income') : t('expenses.expense')}
              </AppText>
              <AppText variant="amount" color={selectedTint} style={styles.detailAmount}>
                {selectedIsIncome ? '+' : '−'}
                {formatPKR(selected.amount)}
              </AppText>
            </View>

            <DetailRow
              label={t('expenses.category')}
              value={getCategoryLabel(selected.category, selected.customCategory, t)}
              colors={colors}
            />
            <DetailRow
              label={t('expenses.date')}
              value={formatTransactionDate(selected.date, i18n.language)}
              colors={colors}
            />
            <DetailRow
              label={t('expenses.time')}
              value={formatTransactionTime(selected.date, i18n.language)}
              colors={colors}
            />
            {!selectedIsIncome ? (
              <DetailRow
                label={t('expenses.paymentMethod')}
                value={
                  selected.paymentMethod
                    ? t(`paymentMethods.${selected.paymentMethod}`, {
                        defaultValue: selected.paymentMethod,
                      })
                    : '—'
                }
                colors={colors}
              />
            ) : null}
            <DetailRow
              label={t('expenses.note')}
              value={selected.note?.trim() || t('expenses.noNote')}
              colors={colors}
              muted={!selected.note?.trim()}
            />
            <DetailRow
              label={t('expenses.receipt')}
              value={
                selectedReceiptDrive
                  ? t('expenses.viewReceipt')
                  : selected?.receiptImage === 'legacy'
                    ? t('expenses.legacyReceipt')
                    : t('expenses.noReceipt')
              }
              colors={colors}
              muted={!selectedHasReceipt}
              onPress={
                selectedReceiptDrive
                  ? () => {
                      if (selected.receiptImage) openReceipt(selected.receiptImage);
                    }
                  : undefined
              }
            />

            <RTLRow style={styles.detailActions} gap={10}>
              <Button title={t('common.cancel')} onPress={closeDetails} variant="outline" style={{ flex: 1 }} />
              <Button
                title={selectedIsIncome ? t('expenses.editIncome') : t('expenses.editExpense')}
                onPress={() => goEdit(selected)}
                style={{ flex: 1 }}
              />
            </RTLRow>
          </ScrollView>
        ) : null}
      </BottomSheet>

      <ReceiptViewer receiptRef={receiptRef} onClose={() => setReceiptRef(null)} />
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
  muted,
  onPress,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
  muted?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <AppText variant="caption" color={colors.muted}>
        {label}
      </AppText>
      <RTLRow style={styles.detailValueRow} gap={6}>
        <AppText
          variant="bodySemibold"
          color={onPress ? Brand.primary : muted ? colors.muted : colors.text}
          style={styles.detailValue}>
          {value}
        </AppText>
        {onPress ? <Ionicons name="open-outline" size={16} color={Brand.primary} /> : null}
      </RTLRow>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  actions: { padding: Spacing.md, paddingBottom: Spacing.sm },
  filters: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  summary: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  btn: { flex: 1, paddingVertical: 12 },
  detailHero: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  detailIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  detailAmount: { writingDirection: 'ltr' },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  detailValueRow: { alignItems: 'center' },
  detailValue: { flex: 1 },
  detailActions: { marginTop: 16 },
  pressed: { opacity: 0.85 },
});
