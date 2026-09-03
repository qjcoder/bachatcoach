import { useCallback, useState } from 'react';
import { View, StyleSheet, RefreshControl, Pressable, Alert, ActivityIndicator } from 'react-native';
import { DirectionScrollView } from '@/components/DirectionScrollView';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR } from '@/lib/format';
import { exportMonthlyReportPdf, type MonthlyReportData } from '@/lib/monthlyReportPdf';
import { useAuth } from '@/context/AuthContext';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { AppText } from '@/components/AppText';
import { Card, CardHeader } from '@/components/Card';
import { RTLRow } from '@/components/RTLRow';
import { ProgressBar } from '@/components/ProgressBar';
import { useDirection } from '@/hooks/useDirection';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { localeForLanguage, scriptLanguage } from '@/lib/language';

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
  const { user } = useAuth();
  const displayName = useUserDisplayName('User');
  const formatPKR = useFormatPKR();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { textBlock, headingBlock } = useDirection();
  const [data, setData] = useState<InsightsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
        setData(null);
        setReport(null);
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
        saved: t('insights.reportSaved'),
        total: t('insights.reportTotal'),
        savingsRate: t('insights.reportSavingsRate'),
        generated: t('insights.reportGenerated'),
        currency: user?.currency || 'PKR',
      });
    } catch {
      Alert.alert(t('insights.monthlyReport'), t('insights.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const formatMonthShort = (month: number) =>
    new Date(reportYear, month - 1, 1).toLocaleDateString(
      localeForLanguage(i18n.language),
      { month: 'short' }
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
            await loadAll(reportYear, true);
            setRefreshing(false);
          }}
          tintColor={Brand.primary}
        />
      }>
      <Card variant="elevated">
        <CardHeader icon="document-text-outline" title={t('insights.monthlyReport')} />
        <AppText variant="caption" color={colors.muted} style={[styles.reportHint, headingBlock]}>
          {t('insights.reportYear')}
        </AppText>
        <RTLRow style={styles.yearRow} gap={12}>
          <Pressable onPress={() => changeYear(-1)} style={[styles.yearBtn, { borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={20} color={Brand.primary} />
          </Pressable>
          <AppText variant="h3" color={colors.text} style={styles.yearLabel}>
            {reportYear}
          </AppText>
          <Pressable
            onPress={() => changeYear(1)}
            disabled={reportYear >= new Date().getFullYear()}
            style={[
              styles.yearBtn,
              { borderColor: colors.border, opacity: reportYear >= new Date().getFullYear() ? 0.4 : 1 },
            ]}>
            <Ionicons name="chevron-forward" size={20} color={Brand.primary} />
          </Pressable>
        </RTLRow>

        <View style={[styles.reportTable, { borderColor: colors.border }]}>
          <RTLRow style={[styles.reportHeader, { backgroundColor: '#F1F5F9' }]} gap={4}>
            <AppText variant="captionBold" color={colors.muted} style={styles.colMonth}>
              {t('insights.reportMonth')}
            </AppText>
            <AppText variant="captionBold" color={Brand.primary} style={styles.colNum} align="right">
              {t('insights.reportIncome')}
            </AppText>
            <AppText variant="captionBold" color={Brand.danger} style={styles.colNum} align="right">
              {t('insights.reportExpenses')}
            </AppText>
            <AppText variant="captionBold" color={colors.text} style={styles.colNum} align="right">
              {t('insights.reportSaved')}
            </AppText>
          </RTLRow>
          {report?.months.map((row) => (
            <RTLRow key={row.month} style={styles.reportRow} gap={4}>
              <AppText variant="caption" color={colors.text} style={styles.colMonth}>
                {formatMonthShort(row.month)}
              </AppText>
              <AppText variant="captionBold" color={Brand.primary} style={styles.colNum} align="right">
                {formatPKR(row.income)}
              </AppText>
              <AppText variant="captionBold" color={Brand.danger} style={styles.colNum} align="right">
                {formatPKR(row.expenses)}
              </AppText>
              <AppText
                variant="captionBold"
                color={row.saved >= 0 ? Brand.primary : Brand.danger}
                style={styles.colNum}
                align="right">
                {formatPKR(row.saved)}
              </AppText>
            </RTLRow>
          ))}
          {report ? (
            <RTLRow style={[styles.reportRow, styles.reportTotal, { borderTopColor: colors.border }]} gap={4}>
              <AppText variant="bodySmallBold" color={colors.text} style={styles.colMonth}>
                {t('insights.reportTotal')}
              </AppText>
              <AppText variant="bodySmallBold" color={Brand.primary} style={styles.colNum} align="right">
                {formatPKR(report.totals.income)}
              </AppText>
              <AppText variant="bodySmallBold" color={Brand.danger} style={styles.colNum} align="right">
                {formatPKR(report.totals.expenses)}
              </AppText>
              <AppText
                variant="bodySmallBold"
                color={report.totals.saved >= 0 ? Brand.primary : Brand.danger}
                style={styles.colNum}
                align="right">
                {formatPKR(report.totals.saved)}
              </AppText>
            </RTLRow>
          ) : null}
        </View>

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

      <Card variant="elevated" style={styles.section}>
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
  reportHint: { marginBottom: 8 },
  yearRow: { justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  yearBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearLabel: { minWidth: 72, textAlign: 'center' },
  reportTable: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: 16,
  },
  reportHeader: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  reportRow: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  reportTotal: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    backgroundColor: '#F8FAFC',
  },
  colMonth: { flex: 1.1 },
  colNum: { flex: 1, fontSize: 11 },
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
