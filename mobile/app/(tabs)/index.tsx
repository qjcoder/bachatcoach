import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR, formatAmount } from '@/lib/format';
import { getCurrency } from '@/constants/currencies';
import { useAuth } from '@/context/AuthContext';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { AppText } from '@/components/AppText';
import { DirectionScrollView } from '@/components/DirectionScrollView';
import { RTLRow } from '@/components/RTLRow';
import { DonutChart } from '@/components/DonutChart';
import { RingProgress } from '@/components/RingProgress';
import { UserAvatar } from '@/components/UserAvatar';
import { BrandLogo } from '@/components/BrandLogo';
import { getCategoryLabel } from '@/lib/category';
import { Brand, Radius, Spacing, TxnKind, TxnKindSoft, TxnKindDeep, txnKindGradient, txnKindGradientDeep, categoryTint } from '@/constants/theme';
import { resolveMoneyKind, moneyKindColor } from '@/lib/txnKind';

const BG = '#020617';
const CARD = '#0F172A';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const MUTED = 'rgba(255,255,255,0.55)';
const SCREEN_W = Dimensions.get('window').width;

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: 'restaurant-outline',
  transport: 'car-outline',
  bills: 'flash-outline',
  rent: 'home-outline',
  shopping: 'bag-outline',
  health: 'medkit-outline',
  entertainment: 'game-controller-outline',
  education: 'school-outline',
  subscriptions: 'card-outline',
  personal: 'person-outline',
  other: 'ellipse-outline',
  salary: 'cash-outline',
  freelance: 'laptop-outline',
  gift: 'gift-outline',
  investment: 'trending-up-outline',
  other_income: 'add-circle-outline',
};

type RecentTxn = {
  _id: string;
  type: 'expense' | 'income' | 'savings';
  amount: number;
  category?: string;
  customCategory?: string;
  note?: string;
  date: string;
};

type DashboardSummary = {
  income: number;
  expenses: number;
  toSavings?: number;
  saved: number;
  savingsRate: number;
  vsLastMonth: {
    saved: number;
    income?: number;
    expenses?: number;
    incomePct?: number;
    expensesPct?: number;
    savedPct?: number;
  };
  loans: { totalLent: number; totalBorrowed: number; lentCount?: number };
  motivation: { tip: string; source?: string };
  categoryBreakdown?: Array<{ _id: string; total: number }>;
  recentTransactions?: RecentTxn[];
  goals?: Array<{ _id: string }>;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (name.slice(0, 2) || '?').toUpperCase();
}

function formatShortDate(iso: string, lang: string) {
  try {
    return new Date(iso).toLocaleDateString(lang.startsWith('ur') ? 'ur-PK' : 'en-GB', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function formatTodayBadge(lang: string) {
  try {
    return new Date().toLocaleDateString(lang.startsWith('ur') ? 'ur-PK' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function MetricTile({
  label,
  value,
  meta,
  icon,
  colors,
}: {
  label: string;
  value: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: [string, string];
}) {
  return (
    <View style={styles.metricTile}>
      <RTLRow style={styles.metricHead} gap={8}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.metricIcon}>
          <Ionicons name={icon} size={14} color="#FFFFFF" />
        </LinearGradient>
        <AppText variant="caption" color={MUTED} numberOfLines={1} style={styles.metricLabel}>
          {label}
        </AppText>
      </RTLRow>
      <RTLRow style={styles.metricValueRow} gap={6}>
        <AppText
          variant="bodySemibold"
          color="#FFFFFF"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={styles.metricValue}>
          {value}
        </AppText>
        {meta && meta !== '—' ? (
          <AppText variant="captionBold" color={colors[0]} numberOfLines={1} style={styles.metricMeta}>
            {meta}
          </AppText>
        ) : null}
      </RTLRow>
    </View>
  );
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const displayName = useUserDisplayName();
  const { user } = useAuth();
  const formatPKR = useFormatPKR();
  const currency = getCurrency(user?.currency || 'PKR');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (fresh = false) => {
    const { data } = await api.get('/dashboard/summary', {
      params: { lang: i18n.language },
      headers: fresh ? { 'X-Bypass-Cache': '1' } : undefined,
    });
    setSummary(data);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [i18n.language])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  };

  const saved = summary?.saved ?? 0;
  const savedPct = summary?.vsLastMonth?.savedPct ?? 0;
  const incomePct = summary?.vsLastMonth?.incomePct ?? 0;
  const expensesPct = summary?.vsLastMonth?.expensesPct ?? 0;
  const initials = initialsFromName(displayName || user?.name || 'U');

  const spendSlices = useMemo(() => {
    const rows = summary?.categoryBreakdown || [];
    return rows.slice(0, 5).map((row, i) => ({
      value: row.total,
      color: categoryTint(row._id, i),
      id: row._id,
      total: row.total,
    }));
  }, [summary?.categoryBreakdown]);

  const spendTotal = spendSlices.reduce((s, r) => s + r.value, 0);

  return (
    <DirectionScrollView
      style={[styles.root, { backgroundColor: BG }]}
      contentContainerStyle={{ paddingBottom: 20, paddingTop: insets.top + 8 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.success} />}
      showsVerticalScrollIndicator={false}>
      {/* Top brand row */}
      <RTLRow style={styles.topBar} gap={12}>
        <RTLRow gap={10} style={styles.brandBlock}>
          <BrandLogo size={36} />
          <View style={styles.brandText}>
            <RTLRow gap={0} style={styles.brandTitleRow}>
              <AppText variant="h3" color="#FFFFFF">
                Bachat
              </AppText>
              <AppText variant="h3" color={TxnKind.savings}>
                Coach
              </AppText>
            </RTLRow>
            <RTLRow gap={5} style={styles.dateInline}>
              <Ionicons name="calendar-outline" size={12} color={TxnKindSoft.income} />
              <AppText variant="caption" color={MUTED} numberOfLines={1}>
                {formatTodayBadge(i18n.language)}
              </AppText>
            </RTLRow>
          </View>
        </RTLRow>
        <RTLRow gap={10}>
          <Pressable style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            <View style={styles.notifDot} />
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={8}>
            {user?.avatar ? (
              <UserAvatar name={displayName} avatar={user.avatar} size={36} circular />
            ) : (
              <View style={styles.avatarFallback}>
                <AppText variant="captionBold" color={TxnKindSoft.income}>
                  {initials}
                </AppText>
              </View>
            )}
          </Pressable>
        </RTLRow>
      </RTLRow>

      {/* Hero savings */}
      <LinearGradient
        colors={['#0B3D32', '#0F766E', '#047857', '#064E3B']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View style={styles.heroGlowA} />
        <View style={styles.heroGlowB} />
        <RTLRow style={styles.heroTop} gap={12}>
          <View style={styles.heroLeft}>
            <AppText variant="label" color="rgba(255,255,255,0.8)">
              {t('dashboard.savedThisMonth')}
            </AppText>
            <AppText variant="amountMd" color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.heroAmount}>
              {formatPKR(saved)}
            </AppText>
            <View style={[styles.deltaPill, savedPct < 0 && styles.deltaPillNeg]}>
              <Ionicons
                name={savedPct >= 0 ? 'trending-up' : 'trending-down'}
                size={12}
                color={savedPct >= 0 ? '#A7F3D0' : '#FECACA'}
              />
              <AppText variant="caption" color={savedPct >= 0 ? '#A7F3D0' : '#FECACA'}>
                {savedPct >= 0 ? '+' : ''}
                {savedPct}% {t('dashboard.vsLastMonth')}
              </AppText>
            </View>
            <RTLRow gap={6} style={styles.heroNote}>
              <Ionicons name="stats-chart" size={13} color="#A7F3D0" />
              <AppText variant="caption" color="rgba(255,255,255,0.8)" style={{ flex: 1 }} numberOfLines={2}>
                {t('dashboard.doingGreat')}
              </AppText>
            </RTLRow>
          </View>
          <View style={styles.heroRight}>
            <RingProgress
              size={98}
              progress={summary?.savingsRate ?? 0}
              label={`${summary?.savingsRate ?? 0}%`}
              subLabel={t('dashboard.savingsRate')}
              color={TxnKindSoft.savings}
            />
            <Pressable
              onPress={() => router.push('/goals')}
              style={({ pressed }) => [styles.goalBtn, pressed && styles.goalBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.createGoal')}>
              <LinearGradient
                colors={txnKindGradientDeep('savings')}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.goalBtnInner}>
                <Ionicons name="flag" size={13} color="#1C1917" />
                <AppText
                  variant="captionBold"
                  color="#1C1917"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={styles.goalBtnText}>
                  {t('dashboard.createGoal')}
                </AppText>
              </LinearGradient>
            </Pressable>
          </View>
        </RTLRow>
      </LinearGradient>

      {/* Quick Add — immediately under Saved This Month */}
      <RTLRow style={styles.sectionHead} gap={8}>
        <AppText variant="h3" color="#FFFFFF" style={{ flex: 1 }}>
          {t('dashboard.quickAdd')}
        </AppText>
        <Pressable onPress={() => router.push('/(tabs)/expenses')} hitSlop={8}>
          <RTLRow gap={4}>
            <AppText variant="captionBold" color={TxnKindSoft.income}>
              {t('dashboard.seeAll')}
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={TxnKindSoft.income} />
          </RTLRow>
        </Pressable>
      </RTLRow>

      <RTLRow style={styles.quickRow} gap={8}>
        <Pressable
          style={styles.quickOuter}
          onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'expense' } })}>
          <LinearGradient colors={txnKindGradient('expense')} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickBtn}>
            <View style={styles.quickBubble}>
              <Ionicons name="remove" size={14} color={TxnKind.expense} />
            </View>
            <AppText
              variant="captionBold"
              color="#FFFFFF"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={styles.quickLabel}>
              {t('dashboard.addExpense')}
            </AppText>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={styles.quickOuter}
          onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'income' } })}>
          <LinearGradient colors={txnKindGradient('income')} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickBtn}>
            <View style={styles.quickBubble}>
              <Ionicons name="add" size={14} color={TxnKind.income} />
            </View>
            <AppText
              variant="captionBold"
              color="#FFFFFF"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={styles.quickLabel}>
              {t('dashboard.addIncome')}
            </AppText>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={styles.quickOuter}
          onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'savings' } })}>
          <LinearGradient colors={txnKindGradient('savings')} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickBtn}>
            <View style={styles.quickBubble}>
              <Ionicons name="wallet" size={12} color={TxnKindDeep.savings} />
            </View>
            <AppText
              variant="captionBold"
              color="#FFFFFF"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={styles.quickLabel}>
              {t('dashboard.addSavings')}
            </AppText>
          </LinearGradient>
        </Pressable>
      </RTLRow>

      {/* 2x2 metrics */}
      <View style={styles.metricGrid}>
        <MetricTile
          label={t('dashboard.income')}
          value={formatPKR(summary?.income ?? 0)}
          meta={`${incomePct >= 0 ? '↑' : '↓'} ${Math.abs(incomePct)}%`}
          icon="arrow-up"
          colors={txnKindGradient('income')}
        />
        <MetricTile
          label={t('dashboard.expenses')}
          value={formatPKR(summary?.expenses ?? 0)}
          meta={`${expensesPct >= 0 ? '↑' : '↓'} ${Math.abs(expensesPct)}%`}
          icon="arrow-down"
          colors={txnKindGradient('expense')}
        />
        <MetricTile
          label={t('dashboard.savings')}
          value={formatPKR(summary?.toSavings ?? 0)}
          meta="—"
          icon="wallet"
          colors={txnKindGradient('savings')}
        />
        <MetricTile
          label={t('dashboard.totalLent')}
          value={formatPKR(summary?.loans?.totalLent ?? 0)}
          meta={t('dashboard.peopleCount', { count: summary?.loans?.lentCount ?? 0 })}
          icon="people"
          colors={['#60A5FA', '#2563EB']}
        />
      </View>

      {/* Monthly spending — full width: donut + legend */}
      <View style={styles.panel}>
        <AppText variant="bodySemibold" color="#FFFFFF" style={styles.panelTitle}>
          {t('dashboard.monthlySpending')}
        </AppText>
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
              <AppText variant="caption" color={MUTED}>
                —
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
                    <AppText variant="captionBold" color="#FFFFFF">
                      {pct}%
                    </AppText>
                  </RTLRow>
                );
              })
            )}
          </View>
        </RTLRow>
      </View>

      {/* Recent transactions — full width for readable titles */}
      <View style={styles.panel}>
        <AppText variant="bodySemibold" color="#FFFFFF" style={styles.panelTitle}>
          {t('dashboard.recentTransactions')}
        </AppText>
        {(summary?.recentTransactions || []).length === 0 ? (
          <AppText variant="caption" color={MUTED}>
            {t('dashboard.noRecent')}
          </AppText>
        ) : (
          (summary?.recentTransactions || []).map((txn, index, list) => {
            const kind = resolveMoneyKind(txn);
            const isIncome = kind === 'income';
            const isSavings = kind === 'savings';
            const title = isSavings
              ? t('expenses.savingsTransfer')
              : getCategoryLabel(txn.category, txn.customCategory, t);
            const icon = isSavings
              ? 'wallet-outline'
              : CATEGORY_ICONS[txn.category || ''] || 'ellipse-outline';
            const tint = moneyKindColor(kind);
            const isLast = index === list.length - 1;
            return (
              <RTLRow key={txn._id} style={[styles.txnRow, isLast && styles.txnRowLast]} gap={10}>
                <View style={[styles.txnIcon, { backgroundColor: `${tint}22` }]}>
                  <Ionicons name={icon} size={15} color={tint} />
                </View>
                <View style={styles.txnBody}>
                  <AppText variant="captionBold" color="#FFFFFF" numberOfLines={1}>
                    {title}
                  </AppText>
                </View>
                <View style={styles.txnRight}>
                  <AppText variant="captionBold" color={tint} numberOfLines={1} style={styles.txnAmount}>
                    {isIncome ? '+' : isSavings ? '→' : '−'}
                    {formatPKR(txn.amount)}
                  </AppText>
                  <AppText variant="caption" color={MUTED} numberOfLines={1} style={styles.txnDate}>
                    {formatShortDate(txn.date, i18n.language)}
                  </AppText>
                </View>
              </RTLRow>
            );
          })
        )}
      </View>

      {/* Quote — closing note at end of home scroll */}
      {summary?.motivation?.tip ? (
        <LinearGradient colors={['#3F2E14', '#78350F', '#451A03']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quoteCard}>
          <RTLRow gap={10} style={{ alignItems: 'flex-start' }}>
            <LinearGradient colors={txnKindGradient('savings')} style={styles.quoteIcon}>
              <Ionicons name="bulb" size={16} color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="captionBold" color="#FDE68A" style={{ marginBottom: 2 }}>
                {t('dashboard.motivation')}
              </AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.9)" style={{ fontStyle: 'italic' }} numberOfLines={3}>
                "{summary.motivation.tip}"
              </AppText>
              {summary.motivation.source ? (
                <AppText variant="caption" color="rgba(255,255,255,0.5)" style={{ marginTop: 4, fontSize: 10 }} numberOfLines={1}>
                  — {summary.motivation.source}
                </AppText>
              ) : null}
            </View>
          </RTLRow>
        </LinearGradient>
      ) : null}
    </DirectionScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingHorizontal: Spacing.md,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBlock: { flex: 1, alignItems: 'center' },
  brandText: { flexShrink: 1, minWidth: 0 },
  brandTitleRow: { alignItems: 'baseline' },
  dateInline: { marginTop: 2, alignItems: 'center' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: BG,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.2)',
  },
  heroGlowA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(52,211,153,0.12)',
    top: -60,
    right: -40,
  },
  heroGlowB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -40,
    left: -20,
  },
  heroTop: { alignItems: 'flex-start' },
  heroLeft: { flex: 1, minWidth: 0 },
  heroRight: {
    alignItems: 'center',
    gap: 10,
    width: 110,
  },
  heroAmount: { marginTop: 6, marginBottom: 10 },
  deltaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  deltaPillNeg: { backgroundColor: 'rgba(239,68,68,0.2)' },
  heroNote: { marginTop: 12, alignItems: 'flex-start' },
  goalBtn: {
    width: '100%',
    borderRadius: Radius.full,
    overflow: 'hidden',
    shadowColor: TxnKind.savings,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  goalBtnPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  goalBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  goalBtnText: { letterSpacing: 0.2 },
  metricGrid: {
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metricTile: {
    width: (SCREEN_W - Spacing.md * 2 - 8) / 2,
    backgroundColor: CARD,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  metricHead: {
    marginBottom: 6,
    alignItems: 'center',
  },
  metricIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricLabel: { flex: 1, flexShrink: 1 },
  metricValueRow: {
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  metricValue: { flex: 1, minWidth: 0 },
  metricMeta: { flexShrink: 0 },
  sectionHead: {
    paddingHorizontal: Spacing.md,
    marginBottom: 8,
    alignItems: 'center',
  },
  quickRow: { paddingHorizontal: Spacing.md, marginBottom: 14 },
  quickOuter: { flex: 1 },
  quickBtn: {
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
  },
  quickBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quickLabel: {
    flexShrink: 1,
    textAlign: 'center',
  },
  panel: {
    marginHorizontal: Spacing.md,
    backgroundColor: CARD,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 10,
  },
  panelTitle: { marginBottom: 12 },
  txnRow: {
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
  },
  txnRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  txnIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txnBody: { flex: 1, minWidth: 0 },
  txnRight: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '42%' },
  txnAmount: { textAlign: 'right' },
  txnDate: { marginTop: 2, fontSize: 10 },
  spendBody: { alignItems: 'center' },
  legend: { flex: 1, minWidth: 0, gap: 8 },
  legendRow: { alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  quoteCard: {
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    overflow: 'hidden',
  },
  quoteIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
