import { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR } from '@/lib/format';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { LoanContactCard } from '@/components/LoanContactCard';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { BottomSheet } from '@/components/BottomSheet';
import { RTLRow } from '@/components/RTLRow';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing, TxnKind, TxnKindSoft } from '@/constants/theme';
import { getContactName } from '@/lib/contact';
import { contactMatchesQuery } from '@/lib/phone';
import { localeForLanguage } from '@/lib/language';

const PAGE_BG = '#020617';
const CARD_BG = '#0F172A';
const MUTED = 'rgba(255,255,255,0.55)';
const LENT = TxnKind.income;
const BORROWED = TxnKind.expense;
const LENT_SOFT = TxnKindSoft.income;
const BORROWED_SOFT = TxnKindSoft.expense;
const PREVIEW_LIMIT = 3;

type Contact = {
  _id: string;
  name: string;
  nameUr?: string;
  phone?: string;
  direction: 'i_lent' | 'i_borrowed';
  balance: number;
  isSettled?: boolean;
  purpose?: string;
  openedOn?: string;
  dueDate?: string | null;
  isOverdue?: boolean;
  loanCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type StatusFilter = 'all' | 'active' | 'repaid' | 'overdue';
type SortKey = 'newest' | 'amount' | 'name' | 'due';

function sumBalances(items: Contact[]) {
  return items.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
}

function sumLoanCounts(items: Contact[]) {
  return items.reduce((sum, c) => sum + (Number(c.loanCount) || (c.balance > 0 ? 1 : 0)), 0);
}

function formatShortDate(iso: string | undefined | null, lang: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(localeForLanguage(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function contactStatus(c: Contact): 'active' | 'repaid' | 'overdue' {
  if (c.isSettled || c.balance <= 0) return 'repaid';
  if (c.isOverdue) return 'overdue';
  return 'active';
}

export default function LoansScreen() {
  const { t, i18n } = useTranslation();
  const formatPKR = useFormatPKR();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<'i_lent' | 'i_borrowed'>('i_lent');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [people, setPeople] = useState<Contact[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLent, setExpandedLent] = useState(false);
  const [expandedBorrowed, setExpandedBorrowed] = useState(false);

  const load = async (fresh = false) => {
    const headers = fresh ? { 'X-Bypass-Cache': '1' } : undefined;
    const { data } = await api.get<Contact[]>('/contacts', {
      params: { includeSettled: 1 },
      headers,
    });
    setPeople(data);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {
        /* keep previous people */
      });
    }, [])
  );

  const lentPeople = useMemo(
    () => people.filter((c) => c.direction === 'i_lent'),
    [people]
  );
  const borrowedPeople = useMemo(
    () => people.filter((c) => c.direction === 'i_borrowed'),
    [people]
  );

  const summary = useMemo(() => {
    const lentActive = lentPeople.filter((c) => !c.isSettled && c.balance > 0);
    const borrowedActive = borrowedPeople.filter((c) => !c.isSettled && c.balance > 0);
    return {
      totalLent: sumBalances(lentActive),
      totalBorrowed: sumBalances(borrowedActive),
      lentPeople: lentActive.length,
      borrowedPeople: borrowedActive.length,
      lentLoans: sumLoanCounts(lentActive),
      borrowedLoans: sumLoanCounts(borrowedActive),
      overdueCount: people.filter((c) => contactStatus(c) === 'overdue').length,
    };
  }, [lentPeople, borrowedPeople, people]);

  const applyFilterSort = useCallback(
    (list: Contact[]) => {
      let next = list;
      if (statusFilter === 'active') next = list.filter((c) => contactStatus(c) === 'active');
      else if (statusFilter === 'repaid') next = list.filter((c) => contactStatus(c) === 'repaid');
      else if (statusFilter === 'overdue') next = list.filter((c) => contactStatus(c) === 'overdue');

      if (searchQuery.trim()) {
        next = next.filter((c) => contactMatchesQuery(c, searchQuery));
      }

      const sorted = [...next];
      sorted.sort((a, b) => {
        if (sortKey === 'amount') return (b.balance || 0) - (a.balance || 0);
        if (sortKey === 'name') {
          return getContactName(a, i18n.language).localeCompare(getContactName(b, i18n.language));
        }
        if (sortKey === 'due') {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return ad - bd;
        }
        return (
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
        );
      });
      return sorted;
    },
    [statusFilter, sortKey, searchQuery, i18n.language]
  );

  const lentList = useMemo(() => applyFilterSort(lentPeople), [applyFilterSort, lentPeople]);
  const borrowedList = useMemo(
    () => applyFilterSort(borrowedPeople),
    [applyFilterSort, borrowedPeople]
  );

  const lentPreview = expandedLent ? lentList : lentList.slice(0, PREVIEW_LIMIT);
  const borrowedPreview = expandedBorrowed ? borrowedList : borrowedList.slice(0, PREVIEW_LIMIT);

  const openAddLoan = (direction?: 'i_lent' | 'i_borrowed') => {
    const next = direction || tab;
    router.push({ pathname: '/add-loan', params: { direction: next } });
  };

  const openEdit = (contact: Contact) => {
    router.push({
      pathname: '/add-loan',
      params: { direction: contact.direction, id: contact._id },
    });
  };






  const tabAccent = tab === 'i_lent' ? LENT : BORROWED;
  const tabSoft = tab === 'i_lent' ? LENT_SOFT : BORROWED_SOFT;
  const fabBottom = Math.max(insets.bottom, 12) + 16;

  const heroColors =
    tab === 'i_lent'
      ? (['#062A22', '#065F46', '#047857', '#0A3D32'] as const)
      : (['#2A0A12', '#4C0519', '#9F1239', '#1A080E'] as const);
  const waveFillA =
    tab === 'i_lent' ? 'rgba(4, 120, 87, 0.45)' : 'rgba(190, 18, 60, 0.4)';
  const waveFillB =
    tab === 'i_lent' ? 'rgba(6, 78, 59, 0.55)' : 'rgba(136, 19, 55, 0.5)';

  const heroLabel = tab === 'i_lent' ? t('loans.totalLent') : t('loans.totalBorrowed');
  const heroAmount = tab === 'i_lent' ? summary.totalLent : summary.totalBorrowed;
  const heroPeople = tab === 'i_lent' ? summary.lentPeople : summary.borrowedPeople;
  const heroLoans = tab === 'i_lent' ? summary.lentLoans : summary.borrowedLoans;
  const heroMeta =
    heroPeople === 0
      ? `${t('loans.peopleCount', { count: 0 })} • ${t('loans.noActiveLoansLabel', { defaultValue: 'No active loans' })}`
      : `${t('loans.peopleCount', { count: heroPeople })} • ${t('loans.activeLoansFull', {
          count: heroLoans,
          defaultValue: `${heroLoans} active loans`,
        })}`;
  const heroIcon = tab === 'i_lent' ? 'hand-left-outline' : 'hand-right-outline';

  const statusLabel = (status: 'active' | 'repaid' | 'overdue') => {
    if (status === 'repaid') return t('loans.statusRepaid', { defaultValue: 'Repaid' });
    if (status === 'overdue') return t('loans.statusOverdue', { defaultValue: 'Overdue' });
    return t('loans.statusActive', { defaultValue: 'Active' });
  };

  const filterChips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('loans.filterAll') },
    { key: 'active', label: t('loans.filterActive') },
    { key: 'repaid', label: t('loans.filterRepaid', { defaultValue: 'Repaid' }) },
    { key: 'overdue', label: t('loans.filterOverdue', { defaultValue: 'Overdue' }) },
  ];

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'newest', label: t('loans.sortNewest', { defaultValue: 'Newest' }) },
    { key: 'amount', label: t('loans.sortAmount', { defaultValue: 'Amount' }) },
    { key: 'name', label: t('loans.sortName', { defaultValue: 'Name' }) },
    { key: 'due', label: t('loans.sortDue', { defaultValue: 'Due date' }) },
  ];

  const filterActive = statusFilter !== 'all' || sortKey !== 'newest';

  const renderLoanRow = (item: Contact) => {
    const status = contactStatus(item);
    const tint = item.direction === 'i_lent' ? LENT : BORROWED;
    const opened = formatShortDate(item.openedOn || item.createdAt, i18n.language);
    const due = formatShortDate(item.dueDate, i18n.language);
    return (
      <LoanContactCard
        key={item._id}
        name={getContactName(item, i18n.language)}
        purpose={item.purpose || undefined}
        amount={formatPKR(item.balance)}
        openedLabel={
          item.direction === 'i_lent'
            ? t('loans.lentOn', { date: opened, defaultValue: `Lent on ${opened}` })
            : t('loans.borrowedOn', { date: opened, defaultValue: `Borrowed on ${opened}` })
        }
        dueLabel={due ? t('loans.dueOn', { date: due, defaultValue: `Due ${due}` }) : undefined}
        status={status}
        statusLabel={statusLabel(status)}
        tint={tint}
        onPress={() => router.push({ pathname: '/loan-ledger', params: { id: item._id } })}
        onLongPress={() => openEdit(item)}
      />
    );
  };

  const metaLine = (
    amount: number,
    peopleCount: number,
    loansCount: number,
    color: string
  ) => {
    if (peopleCount === 0) {
      return (
        <AppText variant="caption" color={color}>
          {t('loans.peopleCount', { count: 0 })}
          {' • '}
          {t('loans.noActiveLoansLabel', { defaultValue: 'No active loans' })}
        </AppText>
      );
    }
    return (
      <AppText variant="caption" color={color}>
        {formatPKR(amount)}
        {' • '}
        {t('loans.peopleCount', { count: peopleCount })}
        {' • '}
        {t('loans.activeLoansFull', {
          count: loansCount,
          defaultValue: `${loansCount} active loans`,
        })}
      </AppText>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + fabBottom + 64 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load(true);
              setRefreshing(false);
            }}
            tintColor={LENT}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerText}>
          <AppText variant="h2" color="#FFFFFF">
            {t('loans.title')}
          </AppText>
          <AppText variant="bodySmall" color={MUTED}>
            {t('loans.pageTagline')}
          </AppText>
        </View>

        <SegmentedTabs
          tabs={[
            { key: 'i_lent', label: t('loans.givenToOthers') },
            { key: 'i_borrowed', label: t('loans.borrowedFromOthers') },
          ]}
          active={tab}
          onChange={setTab}
          accentColor={tabAccent}
          trackColor="#1A1A1A"
        />

        <LinearGradient
          colors={[...heroColors]}
          locations={[0, 0.4, 0.75, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: `${tabSoft}55` }]}>
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
          <RTLRow style={styles.heroBody} gap={12}>
            <View style={styles.heroLeft}>
              <AppText variant="label" color="rgba(255,255,255,0.85)">
                {heroLabel}
              </AppText>
              <AppText
                variant="amount"
                color="#FFFFFF"
                numberOfLines={1}
                adjustsFontSizeToFit
                style={styles.heroAmount}>
                {formatPKR(heroAmount)}
              </AppText>
              <AppText variant="caption" color={tabSoft} numberOfLines={2}>
                {heroMeta}
              </AppText>
            </View>
            <View style={[styles.heroIcon, { backgroundColor: `${tabAccent}33` }]}>
              <Ionicons name={heroIcon} size={22} color={tabSoft} />
            </View>
          </RTLRow>
        </LinearGradient>

        <RTLRow style={styles.searchRow} gap={10}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.45)" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('loans.searchPlaceholder')}
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
              (filterOpen || filterActive) && {
                borderColor: `${tabAccent}66`,
                backgroundColor: `${tabAccent}22`,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('loans.filter', { defaultValue: 'Filter' })}>
            <Ionicons
              name="options-outline"
              size={20}
              color={filterOpen || filterActive ? tabAccent : '#FFFFFF'}
            />
            {summary.overdueCount > 0 && statusFilter !== 'overdue' ? (
              <View style={styles.filterDot} />
            ) : null}
          </Pressable>
        </RTLRow>

        {/* Active tab list only — Given and Borrowed stay separate */}
        {tab === 'i_lent' ? (
          <View style={[styles.section, { borderColor: `${LENT}40` }]}>
            <RTLRow style={styles.sectionHeader} gap={10}>
              <View style={[styles.sectionIcon, { backgroundColor: `${LENT}22` }]}>
                <Ionicons name="hand-left-outline" size={16} color={LENT} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="bodySemibold" color="#FFFFFF" numberOfLines={1}>
                  {t('loans.moneyYouGave', { defaultValue: 'Money You Gave to Others' })}
                </AppText>
                {metaLine(summary.totalLent, summary.lentPeople, summary.lentLoans, `${LENT}CC`)}
              </View>
            </RTLRow>

            {lentPreview.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIcon, { backgroundColor: `${LENT}14` }]}>
                  <Ionicons name="document-text-outline" size={28} color={`${LENT}88`} />
                </View>
                <AppText variant="bodySemibold" color="#FFFFFF" align="center">
                  {t('loans.noLentYet', { defaultValue: 'No lent loans yet' })}
                </AppText>
                <AppText variant="caption" color={MUTED} align="center">
                  {t('loans.noLentHint', {
                    defaultValue: 'Add a loan when you lend money to someone.',
                  })}
                </AppText>
                <Pressable
                  onPress={() => openAddLoan('i_lent')}
                  style={[styles.emptyCta, { backgroundColor: LENT }]}>
                  <AppText variant="captionBold" color="#FFFFFF">
                    + {t('loans.addLoanLent', { defaultValue: 'Add Loan (Lent)' })}
                  </AppText>
                </Pressable>
              </View>
            ) : (
              <>
                {lentPreview.map(renderLoanRow)}
                {lentList.length > PREVIEW_LIMIT ? (
                  <Pressable
                    onPress={() => setExpandedLent((v) => !v)}
                    style={[styles.viewAll, { borderColor: `${LENT}66` }]}>
                    <Ionicons name="people-outline" size={16} color={LENT} />
                    <AppText variant="captionBold" color={LENT} style={{ flex: 1 }}>
                      {expandedLent
                        ? t('loans.showLess', { defaultValue: 'Show less' })
                        : t('loans.viewAllGiven', {
                            count: lentList.length,
                            defaultValue: `View All Loans Given (${lentList.length})`,
                          })}
                    </AppText>
                    <Ionicons
                      name={expandedLent ? 'chevron-up' : 'chevron-forward'}
                      size={16}
                      color={LENT}
                    />
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        ) : (
          <View style={[styles.section, { borderColor: `${BORROWED}40` }]}>
            <RTLRow style={styles.sectionHeader} gap={10}>
              <View style={[styles.sectionIcon, { backgroundColor: `${BORROWED}22` }]}>
                <Ionicons name="hand-right-outline" size={16} color={BORROWED} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="bodySemibold" color="#FFFFFF" numberOfLines={1}>
                  {t('loans.moneyYouOwe', { defaultValue: 'Money You Owe to Others' })}
                </AppText>
                {metaLine(
                  summary.totalBorrowed,
                  summary.borrowedPeople,
                  summary.borrowedLoans,
                  `${BORROWED}CC`
                )}
              </View>
            </RTLRow>

            {borrowedPreview.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIcon, { backgroundColor: `${BORROWED}14` }]}>
                  <Ionicons name="document-text-outline" size={28} color={`${BORROWED}88`} />
                </View>
                <AppText variant="bodySemibold" color="#FFFFFF" align="center">
                  {t('loans.noBorrowedYet', { defaultValue: 'No borrowed loans yet' })}
                </AppText>
                <AppText variant="caption" color={MUTED} align="center">
                  {t('loans.noBorrowedHint', {
                    defaultValue: 'Add a loan when you borrow money from someone.',
                  })}
                </AppText>
                <Pressable onPress={() => openAddLoan('i_borrowed')}>
                  <LinearGradient
                    colors={['#F43F5E', '#BE123C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyCta}>
                    <AppText variant="captionBold" color="#FFFFFF">
                      +{' '}
                      {t('loans.addBorrowedLoan', { defaultValue: 'Add Borrowed Loan' })}
                    </AppText>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              <>
                {borrowedPreview.map(renderLoanRow)}
                {borrowedList.length > PREVIEW_LIMIT ? (
                  <Pressable
                    onPress={() => setExpandedBorrowed((v) => !v)}
                    style={[styles.viewAll, { borderColor: `${BORROWED}66` }]}>
                    <Ionicons name="people-outline" size={16} color={BORROWED} />
                    <AppText variant="captionBold" color={BORROWED} style={{ flex: 1 }}>
                      {expandedBorrowed
                        ? t('loans.showLess', { defaultValue: 'Show less' })
                        : t('loans.viewAllBorrowed', {
                            count: borrowedList.length,
                            defaultValue: `View All Loans Borrowed (${borrowedList.length})`,
                          })}
                    </AppText>
                    <Ionicons
                      name={expandedBorrowed ? 'chevron-up' : 'chevron-forward'}
                      size={16}
                      color={BORROWED}
                    />
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => openAddLoan(tab)}
        style={({ pressed }) => [
          styles.fab,
          { bottom: fabBottom, backgroundColor: tabAccent, shadowColor: tabAccent },
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={tab === 'i_lent' ? t('loans.addLoanLent') : t('loans.addLoanBorrowed')}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      <BottomSheet
        visible={filterOpen}
        title={t('loans.filter', { defaultValue: 'Filter' })}
        onClose={() => setFilterOpen(false)}
        accentColor={tabAccent}>
        <AppText variant="caption" color={MUTED} style={{ marginBottom: 10 }}>
          {t('loans.filterStatus', { defaultValue: 'Status' })}
        </AppText>
        <View style={styles.filterChips}>
          {filterChips.map((chip) => {
            const on = statusFilter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setStatusFilter(chip.key)}
                style={[
                  styles.filterChip,
                  on && { backgroundColor: tabAccent, borderColor: tabAccent },
                ]}>
                <AppText variant="captionBold" color={on ? '#FFFFFF' : MUTED}>
                  {chip.label}
                </AppText>
                {chip.key === 'overdue' && summary.overdueCount > 0 ? (
                  <View style={styles.overdueDot} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <AppText variant="caption" color={MUTED} style={{ marginTop: 18, marginBottom: 10 }}>
          {t('loans.sortBy', { defaultValue: 'Sort by' })}
        </AppText>
        <View style={styles.filterChips}>
          {sortOptions.map((opt) => {
            const on = sortKey === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setSortKey(opt.key)}
                style={[
                  styles.filterChip,
                  on && { backgroundColor: tabAccent, borderColor: tabAccent },
                ]}>
                <AppText variant="captionBold" color={on ? '#FFFFFF' : MUTED}>
                  {opt.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <Button
          title={t('common.done', { defaultValue: 'Done' })}
          onPress={() => setFilterOpen(false)}
          style={{ marginTop: 16 }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  scrollContent: { paddingHorizontal: Spacing.md, gap: 14 },
  headerText: { gap: 4 },
  hero: {
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: 'hidden',
    borderWidth: 1,
    minHeight: 118,
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
  heroAmount: {
    marginTop: 2,
    marginBottom: 4,
    fontSize: 26,
    lineHeight: 30,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchRow: {
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
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BORROWED,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  overdueDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BORROWED,
  },
  section: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  sectionHeader: { alignItems: 'center', marginBottom: 6 },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyCta: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAll: {
    marginTop: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  suggestText: { flex: 1, minWidth: 0 },
});
