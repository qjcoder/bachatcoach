import { useCallback, useState } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { DirectionScrollView } from '@/components/DirectionScrollView';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR } from '@/lib/format';
import { AppText } from '@/components/AppText';
import { Card, CardHeader } from '@/components/Card';
import { RTLRow } from '@/components/RTLRow';
import { ProgressBar } from '@/components/ProgressBar';
import { useDirection } from '@/hooks/useDirection';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Spacing } from '@/constants/theme';

type CategoryItem = { _id: string; total: number };

type InsightsData = {
  vsLastMonth: { income: number; expenses: number; saved: number };
  categoryBreakdown: CategoryItem[];
  savingsOpportunity: { suggestion: string } | null;
  savingsRate: number;
  saved: number;
};

export default function InsightsScreen() {
  const { t, i18n } = useTranslation();
  const formatPKR = useFormatPKR();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { textBlock } = useDirection();
  const [data, setData] = useState<InsightsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data: res } = await api.get('/dashboard/summary', { params: { lang: i18n.language } });
    setData(res);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setData(null));
    }, [i18n.language])
  );

  const totalExpenses = data?.categoryBreakdown?.reduce((sum, c) => sum + c.total, 0) || 1;

  return (
    <DirectionScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
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
      }>
      <Card variant="elevated">
        <CardHeader icon="analytics-outline" title={t('insights.monthCompare')} />
        <CompareRow label={t('insights.incomeChange')} value={data?.vsLastMonth?.income ?? 0} formatPKR={formatPKR} colors={colors} />
        <CompareRow label={t('insights.expenseChange')} value={data?.vsLastMonth?.expenses ?? 0} formatPKR={formatPKR} colors={colors} invert />
        <CompareRow label={t('insights.savedChange')} value={data?.vsLastMonth?.saved ?? 0} formatPKR={formatPKR} colors={colors} />
      </Card>

      <Card variant="elevated" style={styles.section}>
        <CardHeader icon="pie-chart-outline" title={t('insights.categoryBreakdown')} />
        {data?.categoryBreakdown?.map((cat) => {
          const pct = Math.round((cat.total / totalExpenses) * 100);
          return (
            <View key={cat._id} style={styles.catRow}>
              <RTLRow style={styles.catHeader} gap={8}>
                <AppText variant="bodySemibold" color={colors.text} style={[styles.catTitle, textBlock]}>
                  {t(`categories.${cat._id}`)}
                </AppText>
                <AppText variant="bodySmallMedium" color={colors.muted}>{formatPKR(cat.total)}</AppText>
              </RTLRow>
              <ProgressBar progress={pct} />
              <AppText variant="caption" color={colors.muted} style={[styles.pct, textBlock]}>
                {pct}% of spending
              </AppText>
            </View>
          );
        })}
        {!data?.categoryBreakdown?.length && (
          <AppText variant="body" color={colors.muted} align="center" style={styles.empty}>
            {t('expenses.noTransactions')}
          </AppText>
        )}
      </Card>

      {data?.savingsOpportunity && (
        <Card variant="elevated" accentColor={Brand.secondary} style={styles.tipBox}>
          <CardHeader icon="sparkles" title={t('insights.savingsOpportunity')} iconColor={Brand.secondary} />
          <AppText variant="bodySmall" color={colors.muted} style={textBlock}>{data.savingsOpportunity.suggestion}</AppText>
        </Card>
      )}
    </DirectionScrollView>
  );
}

function CompareRow({
  label,
  value,
  formatPKR,
  colors,
  invert,
}: {
  label: string;
  value: number;
  formatPKR: (n: number) => string;
  colors: (typeof Colors)['light'];
  invert?: boolean;
}) {
  const { textBlock } = useDirection();
  const isGood = invert ? value < 0 : value > 0;
  const color = value === 0 ? colors.muted : isGood ? Brand.primary : Brand.danger;
  const icon = value === 0 ? 'remove' : value > 0 ? 'arrow-up' : 'arrow-down';

  return (
    <RTLRow style={styles.compareRow} gap={8}>
      <AppText variant="bodySmall" color={colors.muted} style={[styles.compareLabel, textBlock]}>{label}</AppText>
      <RTLRow gap={4} style={styles.compareValue}>
        <Ionicons name={icon} size={14} color={color} />
        <AppText variant="amountSm" color={color}>
          {value > 0 ? '+' : ''}{formatPKR(value)}
        </AppText>
      </RTLRow>
    </RTLRow>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  section: { marginTop: 12 },
  compareRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  compareLabel: { flex: 1 },
  compareValue: { alignItems: 'center' },
  catRow: { marginBottom: 16 },
  catHeader: { justifyContent: 'space-between', marginBottom: 8 },
  catTitle: { flex: 1 },
  pct: { marginTop: 4 },
  empty: { paddingVertical: 20 },
  tipBox: { marginTop: 12 },
});
