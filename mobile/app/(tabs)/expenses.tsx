import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
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
import { RTLRow } from '@/components/RTLRow';
import { ListCard, StatCard } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Spacing } from '@/constants/theme';

type Transaction = {
  _id: string;
  type: 'expense' | 'income';
  amount: number;
  category?: string;
  customCategory?: string;
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
};

const PERIOD_TABS: TransactionPeriod[] = ['today', 'week', 'month', 'year'];

export default function ExpensesScreen() {
  const { t, i18n } = useTranslation();
  const formatPKR = useFormatPKR();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [items, setItems] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<TransactionPeriod>('month');

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
      load(period).catch(() => setItems([]));
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
          return (
            <ListCard
              icon={iconName}
              iconColor={tint}
              iconBg={`${tint}12`}
              title={getCategoryLabel(item.category, item.customCategory, t)}
              subtitle={item.note || undefined}
              meta={`${formatTransactionDate(item.date, i18n.language)} · ${formatTransactionTime(item.date, i18n.language)}${item.receiptImage ? ' · 📎' : ''}`}
              trailing={
                <AppText variant="amountSm" color={tint}>
                  {isIncome ? '+' : '−'}{formatPKR(item.amount)}
                </AppText>
              }
            />
          );
        }}
      />
    </View>
  );
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
});
