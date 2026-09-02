import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR } from '@/lib/format';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { AppText } from '@/components/AppText';
import { DirectionScrollView } from '@/components/DirectionScrollView';
import { RTLBlock } from '@/components/RTLRow';
import { RTLRow } from '@/components/RTLRow';
import { Card, StatCard, HeroSavingsCard } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { GoalIcon } from '@/components/GoalIcon';
import { useDirection } from '@/hooks/useDirection';
import { Brand, Radius, Spacing } from '@/constants/theme';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { normalizeLanguage } from '@/lib/language';

type DashboardSummary = {
  income: number;
  expenses: number;
  saved: number;
  savingsRate: number;
  vsLastMonth: { saved: number };
  loans: { totalLent: number; totalBorrowed: number };
  motivation: { tip: string; source?: string };
  goals?: Array<{
    _id: string;
    title: string;
    titleUr?: string;
    targetAmount: number;
    currentAmount: number;
    icon?: string;
  }>;
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const displayName = useUserDisplayName();
  const formatPKR = useFormatPKR();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { textBlock, headingBlock } = useDirection();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data } = await api.get('/dashboard/summary', { params: { lang: i18n.language } });
    setSummary(data);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setSummary(null));
    }, [i18n.language])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const saved = summary?.saved ?? 0;
  const savedDelta = summary?.vsLastMonth?.saved ?? 0;

  return (
    <DirectionScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.primary} />
      }
      showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#10B981', '#059669', '#047857']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <RTLBlock>
          <AppText variant="bodyMedium" color="rgba(255,255,255,0.85)" style={textBlock}>
            {t('dashboard.greeting')}
          </AppText>
          <AppText variant="h1" color="#FFFFFF" style={[styles.name, textBlock]}>
            {displayName}
          </AppText>
        </RTLBlock>
      </LinearGradient>

      <View style={styles.body}>
        <HeroSavingsCard
          label={t('dashboard.savedThisMonth')}
          amount={formatPKR(saved)}
          rate={summary?.savingsRate ?? 0}
          rateLabel={t('dashboard.savingsRate')}
          delta={
            savedDelta !== 0
              ? {
                  value: `${formatPKR(Math.abs(savedDelta))} ${t('dashboard.vsLastMonth')}`,
                  positive: savedDelta > 0,
                }
              : null
          }
        />

        <RTLRow style={styles.row} gap={12}>
          <StatCard label={t('dashboard.income')} value={formatPKR(summary?.income ?? 0)} accent={Brand.primary} iconName="arrow-down-circle-outline" />
          <StatCard label={t('dashboard.expenses')} value={formatPKR(summary?.expenses ?? 0)} accent={Brand.danger} iconName="arrow-up-circle-outline" />
        </RTLRow>

        <SectionHeader title={t('dashboard.quickAdd')} />
        <RTLRow style={styles.quickRow} gap={12}>
          <Pressable
            style={[styles.quickBtn, styles.expenseBtn]}
            onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'expense' } })}>
            <RTLRow gap={8} style={styles.quickBtnInner}>
              <Ionicons name="remove-circle" size={22} color="#fff" />
              <AppText variant="bodySmallBold" color="#FFFFFF" style={styles.quickBtnLabel}>
                {t('dashboard.addExpense')}
              </AppText>
            </RTLRow>
          </Pressable>
          <Pressable
            style={[styles.quickBtn, styles.incomeBtn]}
            onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'income' } })}>
            <RTLRow gap={8} style={styles.quickBtnInner}>
              <Ionicons name="add-circle" size={22} color="#fff" />
              <AppText variant="bodySmallBold" color="#FFFFFF" style={styles.quickBtnLabel}>
                {t('dashboard.addIncome')}
              </AppText>
            </RTLRow>
          </Pressable>
        </RTLRow>

        <RTLRow style={styles.row} gap={12}>
          <StatCard label={t('dashboard.totalLent')} value={formatPKR(summary?.loans?.totalLent ?? 0)} iconName="people-outline" accent={Brand.primary} />
          <StatCard label={t('dashboard.totalBorrowed')} value={formatPKR(summary?.loans?.totalBorrowed ?? 0)} iconName="document-text-outline" accent={Brand.danger} />
        </RTLRow>

        {summary?.goals && summary.goals.length > 0 ? (
          <>
            <SectionHeader
              title={t('goals.title')}
              actionLabel={t('goals.viewAll')}
              onAction={() => router.push('/goals')}
            />
            {summary.goals.slice(0, 2).map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              const goalTitle = normalizeLanguage(i18n.language) === 'ur' && goal.titleUr ? goal.titleUr : goal.title;
              return (
                <Card key={goal._id} variant="elevated" style={styles.goalCard}>
                  <RTLRow style={styles.goalRow} gap={12}>
                    <View style={styles.goalIconSlot}>
                      <GoalIcon icon={goal.icon} size={22} />
                    </View>
                    <View style={styles.goalInfo}>
                      <AppText
                        variant="bodySemibold"
                        color={colors.text}
                        numberOfLines={2}
                        style={styles.goalTitle}>
                        {goalTitle}
                      </AppText>
                      <AppText
                        variant="bodySmall"
                        color={colors.muted}
                        numberOfLines={1}
                        style={styles.goalAmount}>
                        {formatPKR(goal.currentAmount)} / {formatPKR(goal.targetAmount)}
                      </AppText>
                    </View>
                    <AppText variant="amountMd" color={Brand.primary} align="center" shrink style={styles.goalPct}>
                      {pct}%
                    </AppText>
                  </RTLRow>
                  <ProgressBar progress={pct} />
                </Card>
              );
            })}
          </>
        ) : (
          <Pressable onPress={() => router.push('/goals')} style={styles.addGoalBtn}>
            <RTLRow gap={8} style={styles.addGoalInner}>
              <Ionicons name="flag-outline" size={20} color={Brand.primary} />
              <AppText variant="bodySmallBold" color={Brand.primary}>+ {t('goals.addGoal')}</AppText>
            </RTLRow>
          </Pressable>
        )}

        {summary?.motivation?.tip && (
          <Card variant="elevated" accentColor={Brand.secondary} style={styles.tipCard}>
            <RTLRow gap={14} style={styles.tipRow}>
              <View style={styles.tipIconWrap}>
                <Ionicons name="bulb" size={22} color={Brand.secondary} />
              </View>
              <View style={styles.tipBody}>
                <AppText
                  variant="bodySmallBold"
                  color={colors.text}
                  style={styles.tipTitle}>
                  {t('dashboard.motivation')}
                </AppText>
                <AppText variant="bodySmall" color={colors.muted} style={styles.tipQuote}>
                  "{summary.motivation.tip}"
                </AppText>
                {summary.motivation.source ? (
                  <AppText
                    variant="caption"
                    color={colors.muted}
                    style={styles.tipSource}>
                    — {summary.motivation.source}
                  </AppText>
                ) : null}
              </View>
            </RTLRow>
          </Card>
        )}
      </View>
    </DirectionScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 48,
    width: '100%',
  },
  name: { marginTop: 4 },
  body: {
    paddingHorizontal: Spacing.md,
    marginTop: -32,
  },
  row: { marginBottom: Spacing.md },
  quickRow: { marginBottom: Spacing.md },
  quickBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  quickBtnInner: { width: '100%', justifyContent: 'flex-start' },
  quickBtnLabel: { flex: 1 },
  expenseBtn: { backgroundColor: Brand.danger },
  incomeBtn: { backgroundColor: Brand.primary },
  goalCard: { marginBottom: 10 },
  goalRow: { marginBottom: 10, alignItems: 'center', width: '100%' },
  goalIconSlot: { flexShrink: 0 },
  goalInfo: { flex: 1, minWidth: 0, alignItems: 'flex-start', alignSelf: 'stretch' },
  goalTitle: { width: '100%' },
  goalAmount: { marginTop: 3, width: '100%' },
  goalPct: { flexShrink: 0, minWidth: 44, textAlign: 'center' },
  addGoalBtn: {
    paddingVertical: 16,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Brand.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addGoalInner: { justifyContent: 'center' },
  tipCard: { padding: 0 },
  tipRow: { padding: Spacing.md },
  tipBody: { flex: 1, minWidth: 0, alignItems: 'flex-start', alignSelf: 'stretch' },
  tipIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Brand.secondary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: { marginBottom: 4, width: '100%' },
  tipQuote: { width: '100%' },
  tipSource: { marginTop: 6, fontStyle: 'italic', opacity: 0.85, width: '100%' },
});
