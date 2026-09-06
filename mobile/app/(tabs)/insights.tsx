import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DirectionScrollView } from '@/components/DirectionScrollView';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR, formatAmount } from '@/lib/format';
import { exportMonthlyReportPdf, type MonthlyReportData } from '@/lib/monthlyReportPdf';
import { getDailyQuote } from '@/lib/dailyQuotes';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { AppText } from '@/components/AppText';
import { Card, CardHeader } from '@/components/Card';
import { RTLRow } from '@/components/RTLRow';
import { ProgressBar } from '@/components/ProgressBar';
import { RingProgress } from '@/components/RingProgress';
import { DonutChart } from '@/components/DonutChart';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { useDirection } from '@/hooks/useDirection';
import { getCurrency } from '@/constants/currencies';
import { Brand, Radius, Spacing, TxnKind, categoryTint, txnKindGradient } from '@/constants/theme';
import { localeForLanguage, scriptLanguage } from '@/lib/language';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG = '#020617';
const CARD = '#0F172A';
const CARD_BORDER = 'rgba(255,255,255,0.07)';
const MUTED = 'rgba(255,255,255,0.55)';
const TEXT = '#F8FAFC';

type CategoryItem = { _id: string; total: number };

type InsightsData = {
  vsLastMonth: {
    income: number;
    expenses: number;
    saved: number;
    toSavings?: number;
    incomePct?: number;
    expensesPct?: number;
    savedPct?: number;
  };
  categoryBreakdown: CategoryItem[];
  savingsOpportunity: { suggestion: string } | null;
  savingsRate: number;
  saved: number;
  toSavings?: number;
};

type InsightsTab = 'overview' | 'report';

function clampScore(n: number) {
  return Math.max(0, Math.min(100, Math.round(n || 0)));
}

function healthLabelKey(score: number): string {
  if (score >= 30) return 'insights.savingExcellent';
  if (score >= 20) return 'insights.savingGood';
  if (score >= 10) return 'insights.spendingGood';
  return 'insights.spendingHigh';
}

function healthHintKey(score: number): string {
  if (score >= 30) return 'insights.healthExcellentHint';
  if (score >= 20) return 'insights.healthGoodHint';
  if (score >= 10) return 'insights.healthFairHint';
  return 'insights.healthLowHint';
}

export default function InsightsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const displayName = useUserDisplayName('User');
  const formatPKR = useFormatPKR();
  const currency = getCurrency(user?.currency);
  const insets = useSafeAreaInsets();
  const { textBlock, headingBlock } = useDirection();
  const [data, setData] = useState<InsightsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<InsightsTab>('overview');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = async (fresh = false) => {
    const { data: res } = await api.get('/dashboard/summary', {
      params: { lang: i18n.language },
      headers: fresh ? { 'X-Bypass-Cache': '1' } : undefined,
    });
    setData(res);
  };

  const loadReport = async (year: number, fresh = false) => {
    const { data: res } = await api.get('/dashboard/monthly-report', {
      params: { year },
      headers: fresh ? { 'X-Bypass-Cache': '1' } : undefined,
    });
    setReport(res);
  };

  const loadAll = async (year: number, fresh = false) => {
    await Promise.all([load(fresh), loadReport(year, fresh)]);
  };

  useFocusEffect(
    useCallback(() => {
      loadAll(reportYear).catch(() => {
        /* keep previous insights / report */
      });
    }, [i18n.language, reportYear])
  );

  const changeYear = (delta: number) => {
    setReportYear((y) => y + delta);
  };

  const exportPdf = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const lang = scriptLanguage(i18n.language);
      await exportMonthlyReportPdf(report, displayName, lang, {
        title: t('insights.reportTitle'),
        subtitle: `${report.year}`,
        month: t('insights.reportMonth'),
        income: t('insights.reportIncome'),
        expenses: t('insights.reportExpenses'),
        toSavings: t('insights.reportToSavings'),
        saved: t('insights.reportSaved'),
        total: t('insights.reportTotal'),
        savingsRate: t('insights.reportSavingsRate'),
        generated: t('insights.reportGenerated'),
        currency: user?.currency || 'PKR',
      });
    } catch {
      showAlert({
        title: t('insights.monthlyReport'),
        message: t('insights.exportFailed'),
        tone: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const formatMonthShort = (month: number) =>
    new Date(reportYear, month - 1, 1).toLocaleDateString(localeForLanguage(i18n.language), {
      month: 'short',
    });

  const healthScore = clampScore(data?.savingsRate ?? 0);

  const spendSlices = useMemo(() => {
    const rows = data?.categoryBreakdown || [];
    return rows.slice(0, 5).map((row, i) => ({
      value: row.total,
      color: categoryTint(row._id, i),
      id: row._id,
    }));
  }, [data?.categoryBreakdown]);

  const spendTotal = spendSlices.reduce((s, r) => s + r.value, 0);

  const topInsights = useMemo(() => {
    if (!data) return [] as string[];
    const bullets: string[] = [];
    const expPct = data.vsLastMonth?.expensesPct;
    if (typeof expPct === 'number') {
      bullets.push(
        t('insights.expenseInsight', {
          pct: Math.abs(expPct),
          direction: expPct <= 0 ? t('insights.down') : t('insights.up'),
        })
      );
    } else if (data.vsLastMonth) {
      const delta = data.vsLastMonth.expenses;
      bullets.push(
        t('insights.expenseDeltaInsight', {
          amount: formatPKR(Math.abs(delta)),
          direction: delta <= 0 ? t('insights.down') : t('insights.up'),
        })
      );
    }
    bullets.push(t('insights.savingsRateInsight', { rate: healthScore }));
    if (data.savingsOpportunity?.suggestion) {
      bullets.push(data.savingsOpportunity.suggestion);
    }
    return bullets.slice(0, 3);
  }, [data, formatPKR, healthScore, t]);

  const dailyQuote = useMemo(
    () => getDailyQuote(scriptLanguage(i18n.language)),
    [i18n.language]
  );

  const tabs = [
    { key: 'overview' as const, label: t('insights.tabOverview') },
    { key: 'report' as const, label: t('insights.tabReport') },
  ];

  return (
    <DirectionScrollView
      style={[styles.container, { backgroundColor: BG }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadAll(reportYear, true);
            setRefreshing(false);
          }}
          tintColor={Brand.primary}
        />
      }>
      <View style={styles.header}>
        <AppText variant="h1" color={TEXT} style={headingBlock}>
          {t('insights.title')}
        </AppText>
        <AppText variant="bodySmall" color={MUTED} style={[styles.tagline, textBlock]}>
          {t('insights.pageTagline')}
        </AppText>
      </View>

      <SegmentedTabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <View style={styles.overview}>
          <Card variant="elevated" style={styles.panel}>
            <CardHeader
              icon="heart-outline"
              title={t('insights.financialHealth')}
              iconColor={TxnKind.savings}
              titleColor={TEXT}
            />
            <RTLRow style={styles.healthBody} gap={16}>
              <RingProgress
                size={104}
                progress={healthScore}
                color={TxnKind.savings}
                trackColor="rgba(201,162,39,0.2)"
                label={`${healthScore}`}
                subLabel={t('insights.healthScore')}
              />
              <View style={styles.healthCopy}>
                <AppText variant="bodySemibold" color={TEXT} style={textBlock}>
                  {t(healthLabelKey(healthScore))}
                </AppText>
                <AppText variant="caption" color={MUTED} style={[styles.healthHint, textBlock]}>
                  {t(healthHintKey(healthScore))}
                </AppText>
                <ProgressBar progress={healthScore} height={8} color={TxnKind.savings} />
                <AppText variant="caption" color={MUTED} style={[styles.rateCaption, textBlock]}>
                  {t('dashboard.savingsRate')}: {healthScore}%
                </AppText>
              </View>
            </RTLRow>
          </Card>

          <Card variant="elevated" style={styles.panel}>
            <CardHeader
              icon="analytics-outline"
              title={t('insights.monthCompare')}
              iconColor={Brand.primary}
              titleColor={TEXT}
            />
            <CompareRow
              label={t('insights.incomeChange')}
              value={data?.vsLastMonth?.income ?? 0}
              formatPKR={formatPKR}
              kind="income"
            />
            <CompareRow
              label={t('insights.expenseChange')}
              value={data?.vsLastMonth?.expenses ?? 0}
              formatPKR={formatPKR}
              kind="expense"
            />
            <CompareRow
              label={t('insights.toSavingsChange')}
              value={data?.vsLastMonth?.toSavings ?? 0}
              formatPKR={formatPKR}
              kind="savings"
            />
            <CompareRow
              label={t('insights.savedChange')}
              value={data?.vsLastMonth?.saved ?? 0}
              formatPKR={formatPKR}
              kind="savings"
              last
            />
          </Card>

          <Card variant="elevated" style={styles.panel}>
            <CardHeader
              icon="pie-chart-outline"
              title={t('insights.categoryBreakdown')}
              iconColor={Brand.primary}
              titleColor={TEXT}
            />
            <RTLRow style={styles.spendBody} gap={14}>
              <DonutChart
                size={112}
                strokeWidth={11}
                slices={spendSlices.length ? spendSlices : [{ value: 1, color: 'rgba(255,255,255,0.12)' }]}
                centerSubLabel={currency.code}
                centerLabel={formatAmount(spendTotal, i18n.language)}
              />
              <View style={styles.legend}>
                {spendSlices.length === 0 ? (
                  <AppText variant="caption" color={MUTED} style={textBlock}>
                    {t('expenses.noTransactions')}
                  </AppText>
                ) : (
                  spendSlices.map((slice) => {
                    const pct = spendTotal > 0 ? Math.round((slice.value / spendTotal) * 100) : 0;
                    return (
                      <RTLRow key={slice.id} gap={8} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                        <AppText variant="caption" color={MUTED} style={{ flex: 1 }} numberOfLines={1}>
                          {t(`categories.${slice.id}`, { defaultValue: slice.id })}
                        </AppText>
                        <AppText variant="captionBold" color={TEXT}>
                          {pct}%
                        </AppText>
                      </RTLRow>
                    );
                  })
                )}
              </View>
            </RTLRow>
          </Card>

          {topInsights.length > 0 ? (
            <Card variant="elevated" style={styles.panel}>
              <CardHeader
                icon="bulb-outline"
                title={t('insights.topInsights')}
                iconColor={Brand.secondary}
                titleColor={TEXT}
              />
              {topInsights.map((line, index) => (
                <RTLRow key={`${index}-${line.slice(0, 12)}`} gap={10} style={styles.insightRow}>
                  <View style={styles.insightBullet}>
                    <AppText variant="captionBold" color={Brand.secondary}>
                      {index + 1}
                    </AppText>
                  </View>
                  <AppText variant="bodySmall" color={MUTED} style={[styles.insightText, textBlock]}>
                    {line}
                  </AppText>
                </RTLRow>
              ))}
            </Card>
          ) : null}

          <Pressable
            onPress={() => router.push('/goals')}
            style={({ pressed }) => [styles.goalsPress, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel={t('insights.viewGoals')}>
            <LinearGradient
              colors={['#3F2E14', '#2A2110', '#1A160C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.goalsCard}>
              <RTLRow gap={12} style={styles.goalsInner}>
                <View style={styles.goalsIcon}>
                  <Ionicons name="flag" size={18} color={Brand.secondary} />
                </View>
                <View style={styles.goalsCopy}>
                  <AppText variant="bodySemibold" color="#FDE68A" style={textBlock}>
                    {t('insights.viewGoals')}
                  </AppText>
                  <AppText variant="caption" color="rgba(253,230,138,0.7)" style={textBlock}>
                    {t('insights.goalsCta')}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Brand.secondarySoft} />
              </RTLRow>
            </LinearGradient>
          </Pressable>

          <LinearGradient
            colors={['#3F2E14', '#78350F', '#451A03']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quoteCard}>
            <RTLRow gap={10} style={{ alignItems: 'flex-start' }}>
              <LinearGradient colors={txnKindGradient('savings')} style={styles.quoteIcon}>
                <Ionicons name="chatbubble-ellipses" size={14} color="#1C1917" />
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="captionBold" color="#FDE68A" style={{ marginBottom: 4 }}>
                  {t('insights.quoteOfDay')}
                </AppText>
                <AppText variant="caption" color="rgba(255,255,255,0.9)" style={[textBlock, { fontStyle: 'italic' }]}>
                  "{dailyQuote.text}"
                </AppText>
                {dailyQuote.source ? (
                  <AppText variant="caption" color="rgba(255,255,255,0.5)" style={{ marginTop: 6, fontSize: 10 }}>
                    — {dailyQuote.source}
                  </AppText>
                ) : null}
              </View>
            </RTLRow>
          </LinearGradient>
        </View>
      ) : (
        <Card variant="elevated" style={styles.panel}>
          <CardHeader
            icon="document-text-outline"
            title={t('insights.monthlyReport')}
            iconColor={Brand.primary}
            titleColor={TEXT}
          />
          <AppText variant="caption" color={MUTED} style={[styles.reportHint, headingBlock]}>
            {t('insights.reportYear')}
          </AppText>
          <RTLRow style={styles.yearRow} gap={12}>
            <Pressable onPress={() => changeYear(-1)} style={styles.yearBtn}>
              <Ionicons name="chevron-back" size={20} color={Brand.primary} />
            </Pressable>
            <AppText variant="h3" color={TEXT} style={styles.yearLabel}>
              {reportYear}
            </AppText>
            <Pressable
              onPress={() => changeYear(1)}
              disabled={reportYear >= new Date().getFullYear()}
              style={[styles.yearBtn, { opacity: reportYear >= new Date().getFullYear() ? 0.4 : 1 }]}>
              <Ionicons name="chevron-forward" size={20} color={Brand.primary} />
            </Pressable>
          </RTLRow>

          <View style={styles.reportTable}>
            <RTLRow style={styles.reportHeader} gap={4}>
              <AppText variant="captionBold" color={MUTED} style={styles.colMonth} align="center">
                {t('insights.reportMonth')}
              </AppText>
              <View style={styles.colNumWrap}>
                <AppText variant="captionBold" color={TxnKind.income} style={styles.colNumText} align="center">
                  {t('insights.reportIncome')}
                </AppText>
              </View>
              <View style={styles.colNumWrap}>
                <AppText variant="captionBold" color={TxnKind.expense} style={styles.colNumText} align="center">
                  {t('insights.reportExpenses')}
                </AppText>
              </View>
              <View style={styles.colNumWrap}>
                <AppText variant="captionBold" color={TxnKind.savings} style={styles.colNumText} align="center">
                  {t('insights.reportSaved')}
                </AppText>
              </View>
            </RTLRow>
            {report?.months.map((row) => (
              <RTLRow key={row.month} style={styles.reportRow} gap={4}>
                <AppText variant="caption" color={TEXT} style={styles.colMonth} align="center">
                  {formatMonthShort(row.month)}
                </AppText>
                <View style={styles.colNumWrap}>
                  <AppText
                    variant="captionBold"
                    color={TxnKind.income}
                    style={styles.colNumText}
                    align="center"
                    numberOfLines={1}>
                    {formatAmount(row.income, i18n.language)}
                  </AppText>
                </View>
                <View style={styles.colNumWrap}>
                  <AppText
                    variant="captionBold"
                    color={TxnKind.expense}
                    style={styles.colNumText}
                    align="center"
                    numberOfLines={1}>
                    {formatAmount(row.expenses, i18n.language)}
                  </AppText>
                </View>
                <View style={styles.colNumWrap}>
                  <AppText
                    variant="captionBold"
                    color={TxnKind.savings}
                    style={styles.colNumText}
                    align="center"
                    numberOfLines={1}>
                    {formatAmount(row.saved, i18n.language)}
                  </AppText>
                </View>
              </RTLRow>
            ))}
            {report ? (
              <RTLRow style={[styles.reportRow, styles.reportTotal]} gap={4}>
                <AppText
                  variant="captionBold"
                  color={TEXT}
                  style={styles.colMonth}
                  align="center"
                  numberOfLines={2}>
                  {t('insights.reportTotal')}
                </AppText>
                <View style={styles.colNumWrap}>
                  <AppText
                    variant="captionBold"
                    color={TxnKind.income}
                    style={styles.colNumText}
                    align="center"
                    numberOfLines={2}>
                    {formatAmount(report.totals.income, i18n.language)}
                  </AppText>
                </View>
                <View style={styles.colNumWrap}>
                  <AppText
                    variant="captionBold"
                    color={TxnKind.expense}
                    style={styles.colNumText}
                    align="center"
                    numberOfLines={2}>
                    {formatAmount(report.totals.expenses, i18n.language)}
                  </AppText>
                </View>
                <View style={styles.colNumWrap}>
                  <AppText
                    variant="captionBold"
                    color={TxnKind.savings}
                    style={styles.colNumText}
                    align="center"
                    numberOfLines={2}>
                    {formatAmount(report.totals.saved, i18n.language)}
                  </AppText>
                </View>
              </RTLRow>
            ) : null}
          </View>

          {report ? (
            <AppText variant="caption" color={TxnKind.savings} style={[styles.reportHint, headingBlock]}>
              {t('insights.reportToSavings')}: {formatPKR(report.totals.toSavings ?? 0)}
            </AppText>
          ) : null}

          <Pressable
            onPress={exportPdf}
            disabled={exporting || !report}
            style={({ pressed }) => [
              styles.exportBtn,
              { backgroundColor: Brand.primary, opacity: exporting || !report ? 0.65 : pressed ? 0.9 : 1 },
            ]}>
            <RTLRow gap={8} style={styles.exportInner}>
              {exporting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              )}
              <AppText variant="button" color="#FFFFFF">
                {exporting ? t('insights.exportingPdf') : t('insights.exportPdf')}
              </AppText>
            </RTLRow>
          </Pressable>
        </Card>
      )}
    </DirectionScrollView>
  );
}

function CompareRow({
  label,
  value,
  formatPKR,
  kind,
  last,
}: {
  label: string;
  value: number;
  formatPKR: (n: number) => string;
  kind: 'income' | 'expense' | 'savings';
  last?: boolean;
}) {
  const { textBlock } = useDirection();
  const color = value === 0 ? MUTED : TxnKind[kind];
  const icon = value === 0 ? 'remove' : value > 0 ? 'arrow-up' : 'arrow-down';

  return (
    <RTLRow style={[styles.compareRow, last && styles.compareRowLast]} gap={8}>
      <AppText variant="bodySmall" color={MUTED} style={[styles.compareLabel, textBlock]}>
        {label}
      </AppText>
      <RTLRow gap={4} style={styles.compareValue}>
        <Ionicons name={icon} size={14} color={color} />
        <AppText variant="amountSm" color={color}>
          {value > 0 ? '+' : ''}
          {formatPKR(value)}
        </AppText>
      </RTLRow>
    </RTLRow>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  header: { marginBottom: 14 },
  tagline: { marginTop: 4, lineHeight: 20 },
  overview: { marginTop: 4 },
  panel: {
    marginTop: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  healthBody: { alignItems: 'center' },
  healthCopy: { flex: 1, minWidth: 0, gap: 8 },
  healthHint: { lineHeight: 18 },
  rateCaption: { marginTop: 2 },
  spendBody: { alignItems: 'center' },
  legend: { flex: 1, minWidth: 0, gap: 8 },
  legendRow: { alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  insightRow: { alignItems: 'flex-start', marginBottom: 12 },
  insightBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${Brand.secondary}22`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  insightText: { flex: 1, lineHeight: 20 },
  goalsPress: { marginTop: 12 },
  goalsCard: {
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: `${Brand.secondary}33`,
  },
  goalsInner: { alignItems: 'center' },
  goalsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Brand.secondary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsCopy: { flex: 1, minWidth: 0, gap: 2 },
  quoteCard: {
    marginTop: 12,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  quoteIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportHint: { marginBottom: 8 },
  yearRow: { justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  yearBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearLabel: { minWidth: 72, textAlign: 'center' },
  reportTable: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: 16,
  },
  reportHeader: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  reportRow: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
  },
  reportTotal: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  colMonth: { flex: 1.1, textAlign: 'center' },
  colNumWrap: { flex: 1, minWidth: 0, justifyContent: 'center' },
  colNumText: { fontSize: 11, textAlign: 'center', width: '100%' },
  exportBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
  },
  exportInner: { justifyContent: 'center' },
  compareRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
  },
  compareRowLast: { borderBottomWidth: 0 },
  compareLabel: { flex: 1 },
  compareValue: { alignItems: 'center' },
});
