import { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  RefreshControl,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import Svg, {
  Rect,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/AppText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { getCategoryLabel } from '@/lib/category';
import { useFormatPKR, formatAmount, formatTransactionDate, formatTransactionTime } from '@/lib/format';
import { getCurrency } from '@/constants/currencies';
import { useAuth } from '@/context/AuthContext';
import {
  getTransactionPeriodRange,
  periodFetchLimit,
  type TransactionPeriod,
} from '@/lib/transactionPeriod';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { RTLRow } from '@/components/RTLRow';
import { DonutChart } from '@/components/DonutChart';
import { EmptyState } from '@/components/EmptyState';
import { ReceiptViewer } from '@/components/ReceiptViewer';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Spacing, TxnKind, TxnKindSoft, TxnKindDeep, categoryTint, categoryColorAt } from '@/constants/theme';
import { hasReceipt } from '@/lib/googleDrive';
import { localeForLanguage } from '@/lib/language';
import type { MonthlyReportRow } from '@/lib/monthlyReportPdf';
import { resolveMoneyKind, moneyKindColor } from '@/lib/txnKind';

const BG = '#020617';
const CARD = '#0F172A';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const MUTED = 'rgba(255,255,255,0.55)';

type FlowMode = 'expense' | 'income' | 'savings';
type MetricMode = 'amount' | 'count';
type MonthBar = { month: number; year: number; label: string; value: number };

type Transaction = {
  _id: string;
  type: 'expense' | 'income' | 'savings';
  amount: number;
  category?: string;
  customCategory?: string;
  paymentMethod?: string;
  note?: string;
  tags?: string[];
  date: string;
  receiptImage?: string;
};

type DashboardSummary = {
  income: number;
  expenses: number;
  toSavings?: number;
  vsLastMonth?: {
    income?: number;
    expenses?: number;
    toSavings?: number;
    incomePct?: number;
    expensesPct?: number;
  };
  categoryBreakdown?: Array<{ _id: string; total: number }>;
  incomeCategoryBreakdown?: Array<{ _id: string; total: number }>;
};

function isSavingsTxn(item: Pick<Transaction, 'type' | 'category'>) {
  return item.type === 'savings' || (item.type === 'expense' && item.category === 'savings');
}

function txnTint(item: Pick<Transaction, 'type' | 'category'>) {
  return moneyKindColor(resolveMoneyKind(item));
}

function editLabelFor(item: Transaction, t: (key: string) => string) {
  if (item.type === 'income') return t('expenses.editIncome');
  if (isSavingsTxn(item)) return t('expenses.editSavings');
  return t('expenses.editExpense');
}

function openEditParams(item: Transaction) {
  const type = isSavingsTxn(item) ? 'savings' : item.type;
  return {
    type,
    id: item._id,
    amount: String(item.amount ?? ''),
    category: item.category || '',
    customCategory: item.customCategory || '',
    paymentMethod: item.paymentMethod || '',
    note: item.note || '',
    tags: Array.isArray(item.tags) ? JSON.stringify(item.tags) : '',
    date: item.date || '',
    receiptImage: item.receiptImage || '',
  };
}

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

function monthBounds(month: number, year: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

function lastSevenMonthBars(
  months: Array<MonthlyReportRow & { year: number }>,
  lang: string,
  kind: FlowMode
): MonthBar[] {
  const now = new Date();
  const locale = localeForLanguage(lang);
  const bars: MonthBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const row = months.find((r) => r.month === m && r.year === y);
    const label = d.toLocaleString(locale, { month: 'short' });
    const value =
      kind === 'income'
        ? row?.income ?? 0
        : kind === 'savings'
          ? row?.toSavings ?? 0
          : row?.expenses ?? 0;
    bars.push({ month: m, year: y, label, value });
  }
  return bars;
}

function MiniExpenseBars({
  bars,
  activeMonth,
  activeYear,
  tipLabel,
  accent = 'expense',
  onSelectMonth,
}: {
  bars: MonthBar[];
  activeMonth: number;
  activeYear: number;
  tipLabel: string;
  accent?: FlowMode;
  onSelectMonth: (month: number, year: number) => void;
}) {
  const width = 172;
  const height = 92;
  const padTop = 24;
  const padBottom = 14;
  const chartH = height - padTop - padBottom;
  const gap = 5;
  const barW = Math.max(9, (width - gap * (bars.length - 1)) / bars.length);
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const tipW = Math.min(100, Math.max(52, tipLabel.length * 6.2));
  const tipColor = TxnKind[accent];
  const activeLabel =
    accent === 'income' ? '#A7F3D0' : accent === 'savings' ? '#FDE68A' : '#FECDD3';
  const mutedId = `barMuted-${accent}`;
  const hotId = `barHot-${accent}`;
  const deep = TxnKindDeep[accent];
  const soft = TxnKindSoft[accent];
  const mutedEnd =
    accent === 'income' ? '#064E3B' : accent === 'savings' ? '#3D2E14' : '#4C0519';

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id={mutedId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={deep} stopOpacity={accent === 'expense' ? 0.75 : 0.55} />
            <Stop offset="1" stopColor={mutedEnd} stopOpacity={accent === 'expense' ? 0.55 : 0.4} />
          </SvgLinearGradient>
          <SvgLinearGradient id={hotId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={soft} stopOpacity="1" />
            <Stop offset="1" stopColor={tipColor} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        {bars.map((b, i) => {
          const h = Math.max(6, (b.value / maxVal) * chartH);
          const x = i * (barW + gap);
          const y = padTop + (chartH - h);
          const active = b.month === activeMonth && b.year === activeYear;
          const cx = x + barW / 2;
          const tipX = Math.min(Math.max(cx - tipW / 2, 0), width - tipW);
          const tipY = Math.max(0, y - 20);
          return (
            <G key={`${b.year}-${b.month}-${i}`}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={3.5}
                fill={active ? `url(#${hotId})` : `url(#${mutedId})`}
              />
              <SvgText
                x={cx}
                y={height - 2}
                fill={active ? activeLabel : 'rgba(255,255,255,0.42)'}
                fontSize={9}
                fontWeight={active ? '700' : '500'}
                textAnchor="middle">
                {b.label}
              </SvgText>
              {active ? (
                <G>
                  <Rect x={tipX} y={tipY} width={tipW} height={16} rx={5} fill={tipColor} />
                  <Path
                    d={`M ${cx - 4} ${tipY + 16} L ${cx} ${tipY + 20} L ${cx + 4} ${tipY + 16} Z`}
                    fill={tipColor}
                  />
                  <SvgText
                    x={tipX + tipW / 2}
                    y={tipY + 11.5}
                    fill="#FFFFFF"
                    fontSize={9}
                    fontWeight="700"
                    textAnchor="middle">
                    {tipLabel}
                  </SvgText>
                </G>
              ) : null}
            </G>
          );
        })}
      </Svg>
      {bars.map((b, i) => {
        const x = i * (barW + gap);
        return (
          <Pressable
            key={`hit-${b.year}-${b.month}`}
            onPress={() => onSelectMonth(b.month, b.year)}
            accessibilityRole="button"
            accessibilityLabel={b.label}
            style={{
              position: 'absolute',
              left: Math.max(0, x - 2),
              top: 0,
              width: barW + gap + 2,
              height,
            }}
          />
        );
      })}
    </View>
  );
}

export default function ExpensesScreen() {
  const { t, i18n } = useTranslation();
  const formatPKR = useFormatPKR();
  const { user } = useAuth();
  const currency = getCurrency(user?.currency || 'PKR');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const nowInit = new Date();
  const [flowMode, setFlowMode] = useState<FlowMode>('expense');
  const [metricMode, setMetricMode] = useState<MetricMode>('amount');
  const [items, setItems] = useState<Transaction[]>([]);
  const [monthExpenseCount, setMonthExpenseCount] = useState(0);
  const [monthIncomeCount, setMonthIncomeCount] = useState(0);
  const [monthSavingsCount, setMonthSavingsCount] = useState(0);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthRows, setMonthRows] = useState<Array<MonthlyReportRow & { year: number }>>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<TransactionPeriod>('month');
  const [focusMonth, setFocusMonth] = useState(nowInit.getMonth() + 1);
  const [focusYear, setFocusYear] = useState(nowInit.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [receiptRef, setReceiptRef] = useState<string | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);

  const isIncomeMode = flowMode === 'income';
  const isSavingsMode = flowMode === 'savings';
  const isExpenseMode = flowMode === 'expense';

  const loadPeriod = useCallback(
    async (
      activePeriod: TransactionPeriod,
      kind: FlowMode,
      month: number,
      year: number,
      fresh = false
    ) => {
      const { from, to } =
        activePeriod === 'month'
          ? monthBounds(month, year)
          : getTransactionPeriodRange(activePeriod);
      const headers = fresh ? { 'X-Bypass-Cache': '1' } : undefined;
      if (kind === 'savings') {
        const { data } = await api.get('/transactions', {
          params: { from, to, limit: periodFetchLimit(activePeriod) },
          headers,
        });
        setItems((data as Transaction[]).filter(isSavingsTxn));
        return;
      }
      const { data } = await api.get('/transactions', {
        params: { from, to, type: kind, limit: periodFetchLimit(activePeriod) },
        headers,
      });
      const list = (data as Transaction[]).filter((item) =>
        kind === 'income' ? item.type === 'income' : item.type === 'expense' && !isSavingsTxn(item)
      );
      setItems(list);
    },
    []
  );

  const loadOverview = useCallback(
    async (month: number, year: number, fresh = false) => {
      const headers = fresh ? { 'X-Bypass-Cache': '1' } : undefined;
      const { from, to } = monthBounds(month, year);
      const currentYear = new Date().getFullYear();
      const prevYear = currentYear - 1;
      const needsPrevYear = new Date().getMonth() < 6;
      const [summaryRes, expenseRes, incomeRes, monthAllRes, reportRes, prevReportRes] =
        await Promise.all([
          api.get('/dashboard/summary', {
            params: { lang: i18n.language, month, year },
            headers,
          }),
          api.get('/transactions', {
            params: { from, to, type: 'expense', limit: periodFetchLimit('month') },
            headers,
          }),
          api.get('/transactions', {
            params: { from, to, type: 'income', limit: periodFetchLimit('month') },
            headers,
          }),
          api.get('/transactions', {
            params: { from, to, limit: periodFetchLimit('month') },
            headers,
          }),
          api.get('/dashboard/monthly-report', { params: { year: currentYear }, headers }),
          needsPrevYear
            ? api.get('/dashboard/monthly-report', { params: { year: prevYear }, headers })
            : Promise.resolve({ data: { months: [] as MonthlyReportRow[] } }),
        ]);
      setSummary(summaryRes.data);
      setMonthExpenseCount(
        (expenseRes.data as Transaction[]).filter((item) => !isSavingsTxn(item)).length
      );
      setMonthIncomeCount((incomeRes.data as Transaction[]).length);
      setMonthSavingsCount((monthAllRes.data as Transaction[]).filter(isSavingsTxn).length);
      const currentRows = ((reportRes.data?.months as MonthlyReportRow[]) || []).map((r) => ({
        ...r,
        year: currentYear,
      }));
      const priorRows = ((prevReportRes.data?.months as MonthlyReportRow[]) || []).map((r) => ({
        ...r,
        year: prevYear,
      }));
      setMonthRows([...priorRows, ...currentRows]);
    },
    [i18n.language]
  );

  useFocusEffect(
    useCallback(() => {
      loadOverview(focusMonth, focusYear).catch(() => {
        /* keep last overview on focus errors */
      });
      loadPeriod(period, flowMode, focusMonth, focusYear).catch(() => {
        /* keep last list on focus errors */
      });
    }, [loadOverview, loadPeriod, period, flowMode, focusMonth, focusYear])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadOverview(focusMonth, focusYear, true),
        loadPeriod(period, flowMode, focusMonth, focusYear, true),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const onSelectMonth = (month: number, year: number) => {
    setFocusMonth(month);
    setFocusYear(year);
    setPeriod('month');
  };

  const flowTabs = [
    { key: 'expense' as const, label: t('expenses.modeExpenses', { defaultValue: 'Expenses' }) },
    { key: 'income' as const, label: t('expenses.modeIncome', { defaultValue: 'Income' }) },
    { key: 'savings' as const, label: t('expenses.modeSavings', { defaultValue: 'Savings' }) },
  ];

  const periodTabs = PERIOD_TABS.map((key) => ({
    key,
    label: t(`expenses.filter${key.charAt(0).toUpperCase()}${key.slice(1)}`),
  }));

  const savingsPct = useMemo(() => {
    const current = summary?.toSavings ?? 0;
    const delta = summary?.vsLastMonth?.toSavings ?? 0;
    const prev = current - delta;
    if (prev === 0) return current === 0 ? 0 : 100;
    return Math.round((delta / Math.abs(prev)) * 100);
  }, [summary?.toSavings, summary?.vsLastMonth?.toSavings]);

  const changePct = isIncomeMode
    ? summary?.vsLastMonth?.incomePct ?? 0
    : isSavingsMode
      ? savingsPct
      : summary?.vsLastMonth?.expensesPct ?? 0;
  const changeUp = changePct > 0;
  const chartBars = useMemo(
    () => lastSevenMonthBars(monthRows, i18n.language, flowMode),
    [monthRows, i18n.language, flowMode]
  );
  const monthCount = isIncomeMode
    ? monthIncomeCount
    : isSavingsMode
      ? monthSavingsCount
      : monthExpenseCount;
  const totalAmount = isIncomeMode
    ? summary?.income ?? 0
    : isSavingsMode
      ? summary?.toSavings ?? 0
      : summary?.expenses ?? 0;
  const heroValue = metricMode === 'count' ? String(monthCount) : formatPKR(totalAmount);
  const tipLabel = heroValue;

  const categoryRows = useMemo(() => {
    if (isIncomeMode) {
      if (summary?.incomeCategoryBreakdown?.length) return summary.incomeCategoryBreakdown;
      const map = new Map<string, number>();
      for (const item of items) {
        if (item.type !== 'income') continue;
        const id = item.category || 'other_income';
        map.set(id, (map.get(id) || 0) + item.amount);
      }
      return Array.from(map.entries())
        .map(([_id, total]) => ({ _id, total }))
        .sort((a, b) => b.total - a.total);
    }
    if (isSavingsMode) {
      const map = new Map<string, number>();
      for (const item of items) {
        if (!isSavingsTxn(item)) continue;
        const id = item.paymentMethod || 'other';
        map.set(id, (map.get(id) || 0) + item.amount);
      }
      return Array.from(map.entries())
        .map(([_id, total]) => ({ _id, total }))
        .sort((a, b) => b.total - a.total);
    }
    return summary?.categoryBreakdown || [];
  }, [
    isIncomeMode,
    isSavingsMode,
    summary?.incomeCategoryBreakdown,
    summary?.categoryBreakdown,
    items,
  ]);

  const spendSlices = useMemo(() => {
    return categoryRows.slice(0, 5).map((row, i) => ({
      value: row.total,
      color: isSavingsMode ? categoryColorAt(i) : categoryTint(row._id, i),
      id: row._id,
      total: row.total,
    }));
  }, [categoryRows, isSavingsMode]);

  const spendTotal = spendSlices.reduce((s, r) => s + r.value, 0);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const label = getCategoryLabel(item.category, item.customCategory, t).toLowerCase();
      const note = (item.note || '').toLowerCase();
      const type = item.type.toLowerCase();
      return label.includes(q) || note.includes(q) || type.includes(q);
    });
  }, [items, searchQuery, t]);

  const txnSections = useMemo(() => {
    const groups = new Map<string, { title: string; sortKey: string; data: Transaction[]; total: number }>();
    const locale = localeForLanguage(i18n.language);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    for (const item of filteredItems) {
      const d = new Date(item.date);
      const key = dayKey(d);
      let title: string;
      if (key === dayKey(today)) title = t('expenses.today', { defaultValue: 'Today' });
      else if (key === dayKey(yesterday)) title = t('expenses.yesterday', { defaultValue: 'Yesterday' });
      else {
        title = d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
      }
      const dayAmt =
        flowMode === 'income'
          ? item.type === 'income'
            ? item.amount
            : 0
          : flowMode === 'savings'
            ? isSavingsTxn(item)
              ? item.amount
              : 0
            : item.type === 'expense' && !isSavingsTxn(item)
              ? item.amount
              : 0;
      const existing = groups.get(key);
      if (existing) {
        existing.data.push(item);
        existing.total += dayAmt;
      } else {
        groups.set(key, { title, sortKey: key, data: [item], total: dayAmt });
      }
    }
    return Array.from(groups.values())
      .sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1))
      .map((g) => ({
        title: g.title,
        dayTotal: g.total,
        data: g.data,
      }));
  }, [filteredItems, i18n.language, t, flowMode]);

  const selectedIsIncome = selected?.type === 'income';
  const selectedIsSavings = selected ? isSavingsTxn(selected) : false;
  const selectedTint = selected ? txnTint(selected) : Brand.danger;
  const selectedReceiptDrive = selected?.receiptImage?.startsWith('drive:') ?? false;
  const selectedHasReceipt = hasReceipt(selected?.receiptImage);

  const closeDetails = () => setSelected(null);

  const goEdit = (item: Transaction) => {
    closeDetails();
    router.push({ pathname: '/add-transaction', params: openEditParams(item) });
  };

  const openReceipt = (ref: string) => {
    closeDetails();
    const delay = Platform.OS === 'ios' ? 380 : 120;
    setTimeout(() => setReceiptRef(ref), delay);
  };

  const addTransaction = () => {
    router.push({
      pathname: '/add-transaction',
      params: { type: flowMode },
    });
  };

  const fabBottom = Math.max(insets.bottom, 12) + 16;
  const listBottomPad = fabBottom + 64;

  const renderTxnItem = (item: Transaction) => {
    const isIncome = item.type === 'income';
    const savings = isSavingsTxn(item);
    const iconName = savings
      ? 'wallet-outline'
      : CATEGORY_ICONS[item.category || ''] || 'ellipse-outline';
    const tint = txnTint(item);
    const attached = hasReceipt(item.receiptImage);
    const categoryLabel = savings
      ? t('expenses.savingsTransfer')
      : getCategoryLabel(item.category, item.customCategory, t);
    const title = item.note?.trim() || categoryLabel;
    const meta = `${categoryLabel} • ${formatTransactionTime(item.date, i18n.language)}${attached ? ' · 📎' : ''}`;
    const amountColor = txnTint(item);

    return (
      <Pressable onPress={() => setSelected(item)} style={styles.txnRow}>
        <View style={[styles.txnIcon, { backgroundColor: `${tint}33` }]}>
          <Ionicons name={iconName} size={20} color="#FFFFFF" />
        </View>
        <View style={styles.txnBody}>
          <AppText variant="bodySemibold" color="#FFFFFF" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" color={MUTED} numberOfLines={1}>
            {meta}
          </AppText>
        </View>
        <AppText variant="amountSm" color={amountColor} style={styles.txnAmount}>
          {isIncome ? '+ ' : savings ? '→ ' : '- '}
          {formatPKR(item.amount)}
        </AppText>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
      </Pressable>
    );
  };

  const flowAccent = TxnKind[flowMode];
  const flowSoft = TxnKindSoft[flowMode];
  const heroColors =
    flowMode === 'income'
      ? (['#062A22', '#065F46', '#047857', '#0A3D32'] as const)
      : flowMode === 'savings'
        ? (['#2A2110', '#5C4A1A', '#A8841C', '#1A160C'] as const)
        : (['#2A0A12', '#4C0519', '#9F1239', '#1A080E'] as const);
  const waveFillA =
    flowMode === 'income'
      ? 'rgba(4, 120, 87, 0.45)'
      : flowMode === 'savings'
        ? 'rgba(201, 162, 39, 0.4)'
        : 'rgba(190, 18, 60, 0.4)';
  const waveFillB =
    flowMode === 'income'
      ? 'rgba(6, 78, 59, 0.55)'
      : flowMode === 'savings'
        ? 'rgba(122, 95, 20, 0.5)'
        : 'rgba(136, 19, 55, 0.5)';

  const deltaColor = flowSoft;
  const deltaPillBg = `${flowAccent}55`;

  const totalLabel = isIncomeMode
    ? t('expenses.totalIncome', { defaultValue: 'Total Income' })
    : isSavingsMode
      ? t('expenses.totalSavings', { defaultValue: 'Total Savings' })
      : t('expenses.totalExpenses', { defaultValue: 'Total Expenses' });

  const categoryPanelTitle = isIncomeMode
    ? t('expenses.incomeByCategory', { defaultValue: 'Income by Category' })
    : isSavingsMode
      ? t('expenses.savingsBySource', { defaultValue: 'Savings by Source' })
      : t('expenses.spendingByCategory', { defaultValue: 'Spending by Category' });

  const listHeader = (
    <View>
      <LinearGradient
        colors={[...heroColors]}
        locations={[0, 0.4, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderColor: `${flowSoft}55` }]}>
        <View style={styles.heroWaveWrap} pointerEvents="none">
          <Svg
            width={400}
            height={56}
            viewBox="0 0 360 56"
            preserveAspectRatio="none"
            style={StyleSheet.absoluteFill}>
            <Path
              d="M0 28 C40 8 70 48 110 30 C150 12 180 44 220 28 C260 12 300 40 360 22 L360 56 L0 56 Z"
              fill={waveFillA}
            />
            <Path
              d="M0 38 C50 22 90 52 140 36 C190 20 230 48 280 34 C320 24 340 42 360 36 L360 56 L0 56 Z"
              fill={waveFillB}
            />
          </Svg>
        </View>
        <RTLRow style={styles.heroBody} gap={10}>
          <View style={styles.heroLeft}>
            <AppText variant="label" color="rgba(255,255,255,0.85)">
              {totalLabel}
            </AppText>
            <AppText
              variant="amount"
              color="#FFFFFF"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.heroAmount}>
              {heroValue}
            </AppText>
            <RTLRow gap={8} style={styles.deltaRow}>
              <View
                style={[
                  styles.deltaPill,
                  {
                    backgroundColor: deltaPillBg,
                  },
                ]}>
                <Ionicons
                  name={changeUp ? 'arrow-up' : 'arrow-down'}
                  size={10}
                  color={deltaColor}
                />
                <AppText variant="captionBold" color={deltaColor}>
                  {Math.abs(changePct)}%
                </AppText>
              </View>
              <AppText variant="caption" color="rgba(255,255,255,0.55)">
                {t('expenses.vsLastMonth', { defaultValue: 'vs last month' })}
              </AppText>
            </RTLRow>
          </View>
          <View style={styles.heroRight}>
            <View style={[styles.metricToggle, { borderColor: `${flowSoft}33` }]}>
              <Pressable
                onPress={() => setMetricMode('amount')}
                style={[
                  styles.metricChip,
                  metricMode === 'amount' && { backgroundColor: flowAccent },
                ]}>
                <AppText
                  variant="captionBold"
                  color={metricMode === 'amount' ? '#FFFFFF' : 'rgba(255,255,255,0.72)'}>
                  {t('expenses.metricAmount', { defaultValue: 'Amount' })}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => setMetricMode('count')}
                style={[
                  styles.metricChip,
                  metricMode === 'count' && { backgroundColor: flowAccent },
                ]}>
                <AppText
                  variant="captionBold"
                  color={metricMode === 'count' ? '#FFFFFF' : 'rgba(255,255,255,0.72)'}>
                  {t('expenses.metricCount', { defaultValue: 'Count' })}
                </AppText>
              </Pressable>
            </View>
            <MiniExpenseBars
              bars={chartBars}
              activeMonth={focusMonth}
              activeYear={focusYear}
              tipLabel={tipLabel}
              accent={flowMode}
              onSelectMonth={onSelectMonth}
            />
          </View>
        </RTLRow>
      </LinearGradient>

      <View style={[styles.panel, { borderColor: `${flowSoft}28` }]}>
        <AppText variant="bodySemibold" color="#FFFFFF" style={styles.panelTitle}>
          {categoryPanelTitle}
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
                const legendLabel = isSavingsMode
                  ? t(`paymentMethods.${slice.id}`, { defaultValue: slice.id })
                  : t(`categories.${slice.id}`, { defaultValue: slice.id });
                return (
                  <RTLRow key={slice.id} gap={8} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                    <AppText variant="caption" color={MUTED} style={{ flex: 1 }} numberOfLines={1}>
                      {legendLabel}
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

      <RTLRow style={styles.searchRow} gap={10}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.45)" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('expenses.searchPlaceholder', { defaultValue: 'Search transactions...' })}
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <Pressable
          onPress={() => setFilterOpen(true)}
          style={[
            styles.filterBtn,
            filterOpen && {
              borderColor: `${flowAccent}66`,
              backgroundColor: `${flowAccent}22`,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('expenses.filter', { defaultValue: 'Filter' })}>
          <Ionicons name="options-outline" size={20} color={filterOpen ? flowAccent : '#FFFFFF'} />
        </Pressable>
      </RTLRow>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: BG, paddingTop: insets.top + 8 }]}>
      <View style={styles.pageHeader}>
        <AppText variant="h2" color="#FFFFFF">
          {t('expenses.pageTitle', { defaultValue: 'Cashflow' })}
        </AppText>
        <AppText variant="bodySmall" color={MUTED} style={styles.pageTagline}>
          {t('expenses.pageTagline', {
            defaultValue: 'Track money in, out, and saved.',
          })}
        </AppText>
      </View>

      <View style={styles.flowTabs}>
        <SegmentedTabs tabs={flowTabs} active={flowMode} onChange={setFlowMode} accentColor={flowAccent} />
      </View>

      <SectionList
        style={styles.flex}
        sections={txnSections}
        keyExtractor={(item) => item._id}
        stickySectionHeadersEnabled={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: listBottomPad },
          txnSections.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={
              isIncomeMode
                ? t('expenses.noIncomePeriod', { defaultValue: 'No income in this period' })
                : isSavingsMode
                  ? t('expenses.noSavingsPeriod', { defaultValue: 'No savings in this period' })
                  : t('expenses.noTransactionsPeriod')
            }
          />
        }
        renderSectionHeader={({ section }) => (
          <RTLRow style={styles.sectionHead} gap={8}>
            <AppText variant="bodySemibold" color="#FFFFFF" style={{ flex: 1 }}>
              {section.title}
            </AppText>
            <AppText variant="caption" color={MUTED}>
              {formatPKR(section.dayTotal)}
            </AppText>
          </RTLRow>
        )}
        renderItem={({ item }) => renderTxnItem(item)}
      />

      <Pressable
        onPress={addTransaction}
        style={({ pressed }) => [
          styles.fab,
          { bottom: fabBottom, backgroundColor: flowAccent, shadowColor: flowAccent },
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          isIncomeMode
            ? t('expenses.addIncome')
            : isSavingsMode
              ? t('expenses.addSavings')
              : t('expenses.addExpense')
        }>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <BottomSheet visible={!!selected} title={t('expenses.details')} onClose={closeDetails}>
        {selected ? (
          <>
            <View style={[styles.detailHero, { backgroundColor: `${selectedTint}12` }]}>
              <View style={[styles.detailIcon, { backgroundColor: `${selectedTint}18` }]}>
                <Ionicons
                  name={
                    selectedIsSavings
                      ? 'wallet-outline'
                      : CATEGORY_ICONS[selected.category || ''] || 'ellipse-outline'
                  }
                  size={26}
                  color={selectedTint}
                />
              </View>
              <AppText variant="captionBold" color={selectedTint}>
                {selectedIsSavings
                  ? t('expenses.savingsTransfer')
                  : selectedIsIncome
                    ? t('expenses.income')
                    : t('expenses.expense')}
              </AppText>
              <AppText variant="amount" color={selectedTint} style={styles.detailAmount}>
                {selectedIsIncome ? '+' : selectedIsSavings ? '→' : '−'}
                {formatPKR(selected.amount)}
              </AppText>
            </View>

            {!selectedIsSavings ? (
              <DetailRow
                label={t('expenses.category')}
                value={getCategoryLabel(selected.category, selected.customCategory, t)}
                colors={colors}
              />
            ) : null}
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
                title={editLabelFor(selected, t)}
                onPress={() => goEdit(selected)}
                style={{ flex: 1 }}
              />
            </RTLRow>
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet
        visible={filterOpen}
        title={t('expenses.filter', { defaultValue: 'Filter' })}
        onClose={() => setFilterOpen(false)}
        accentColor={flowAccent}>
        <AppText variant="caption" color={MUTED} style={{ marginBottom: 10 }}>
          {t('expenses.filterPeriod', { defaultValue: 'Period' })}
        </AppText>
        <View style={styles.filterChips}>
          {periodTabs.map((tab) => {
            const on = period === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setPeriod(tab.key);
                  setFilterOpen(false);
                }}
                style={[
                  styles.filterChip,
                  on && { backgroundColor: flowAccent, borderColor: flowAccent },
                ]}>
                <AppText variant="captionBold" color={on ? '#FFFFFF' : MUTED}>
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
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
  flex: { flex: 1 },
  pageHeader: {
    paddingHorizontal: Spacing.md,
    marginBottom: 12,
  },
  pageTagline: { marginTop: 4 },
  flowTabs: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchRow: {
    paddingHorizontal: 0,
    paddingBottom: 4,
    paddingTop: 2,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionHead: {
    paddingHorizontal: 2,
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  txnIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnBody: { flex: 1, minWidth: 0, gap: 2 },
  txnAmount: { writingDirection: 'ltr', flexShrink: 0 },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  hero: {
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    minHeight: 128,
  },
  heroWaveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    opacity: 0.9,
  },
  heroBody: {
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  heroLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
    justifyContent: 'center',
    gap: 2,
  },
  heroRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  heroAmount: {
    marginTop: 2,
    marginBottom: 4,
    fontSize: 26,
    lineHeight: 30,
  },
  deltaRow: { alignItems: 'center', flexWrap: 'wrap' },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  metricToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radius.full,
    padding: 2,
    borderWidth: 1,
  },
  metricChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  panel: {
    backgroundColor: CARD,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  panelTitle: { marginBottom: 12 },
  spendBody: { alignItems: 'center' },
  legend: { flex: 1, minWidth: 0, gap: 8 },
  legendRow: { alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  fab: {
    position: 'absolute',
    right: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabPressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
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
