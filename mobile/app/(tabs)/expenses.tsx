import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { AppText } from '@/components/AppText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR } from '@/lib/format';
import { Button } from '@/components/Button';
import { RTLRow } from '@/components/RTLRow';
import { ListCard } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Spacing } from '@/constants/theme';

type Transaction = {
  _id: string;
  type: 'expense' | 'income';
  amount: number;
  category?: string;
  note?: string;
  date: string;
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

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const formatPKR = useFormatPKR();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [items, setItems] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const now = new Date();
    const { data } = await api.get('/transactions', {
      params: { month: now.getMonth() + 1, year: now.getFullYear(), limit: 100 },
    });
    setItems(data);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setItems([]));
    }, [])
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

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={Brand.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title={t('expenses.noTransactions')} />
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
              title={item.category ? t(`categories.${item.category}`) : '—'}
              subtitle={item.note || undefined}
              meta={new Date(item.date).toLocaleDateString()}
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
  list: { flex: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  actions: { padding: Spacing.md, paddingBottom: Spacing.sm },
  btn: { flex: 1, paddingVertical: 12 },
});
