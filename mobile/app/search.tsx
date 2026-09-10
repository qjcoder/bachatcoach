import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/lib/api';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { RTLRow } from '@/components/RTLRow';
import { useFormatPKR, formatTransactionDate } from '@/lib/format';
import { getCategoryLabel } from '@/lib/category';
import { getContactName } from '@/lib/contact';
import { usePageChrome } from '@/hooks/usePageChrome';
import { Brand, Radius, Spacing, TxnKind } from '@/constants/theme';
import { moneyKindColor, resolveMoneyKind } from '@/lib/txnKind';

type SearchTxn = {
  id: string;
  type: 'expense' | 'income' | 'savings';
  amount: number;
  category?: string;
  customCategory?: string;
  note?: string;
  date: string;
  hasReceipt?: boolean;
};

type SearchContact = {
  id: string;
  name: string;
  nameUr?: string;
  phone?: string;
  direction: 'i_lent' | 'i_borrowed';
  balance: number;
};

type SearchEntry = {
  id: string;
  contactId: string;
  contactName: string;
  direction: 'i_lent' | 'i_borrowed';
  type: string;
  amount: number;
  note?: string;
  date: string;
};

type SearchHit =
  | { kind: 'txn'; data: SearchTxn }
  | { kind: 'contact'; data: SearchContact }
  | { kind: 'entry'; data: SearchEntry };

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const formatPKR = useFormatPKR();
  const { bg, card, border, text, muted, field } = usePageChrome();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [txns, setTxns] = useState<SearchTxn[]>([]);
  const [contacts, setContacts] = useState<SearchContact[]>([]);
  const [entries, setEntries] = useState<SearchEntry[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setTxns([]);
      setContacts([]);
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .get<{ transactions: SearchTxn[]; contacts: SearchContact[]; entries: SearchEntry[] }>(
          '/search',
          { params: { q }, headers: { 'X-Bypass-Cache': '1' } }
        )
        .then(({ data }) => {
          setTxns(data.transactions || []);
          setContacts(data.contacts || []);
          setEntries(data.entries || []);
        })
        .catch(() => {
          setTxns([]);
          setContacts([]);
          setEntries([]);
        })
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const hits = useMemo<SearchHit[]>(() => {
    const rows: SearchHit[] = [
      ...contacts.map((data) => ({ kind: 'contact' as const, data })),
      ...entries.map((data) => ({ kind: 'entry' as const, data })),
      ...txns.map((data) => ({ kind: 'txn' as const, data })),
    ];
    return rows;
  }, [contacts, entries, txns]);

  const openHit = useCallback(
    (hit: SearchHit) => {
      Keyboard.dismiss();
      if (hit.kind === 'contact' || hit.kind === 'entry') {
        const id = hit.kind === 'contact' ? hit.data.id : hit.data.contactId;
        router.push({ pathname: '/loan-ledger', params: { id } });
        return;
      }
      router.push({
        pathname: '/add-transaction',
        params: { id: hit.data.id, type: hit.data.type },
      });
    },
    [router]
  );

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top + 8 }]}>
      <RTLRow style={styles.topBar} gap={10}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={[styles.backBtn, { backgroundColor: field }]}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={text} />
        </Pressable>
        <View style={[styles.searchBar, { backgroundColor: field, borderColor: border }]}>
          <Ionicons name="search-outline" size={18} color={muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={muted}
            style={[styles.input, { color: text }]}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {loading ? <ActivityIndicator size="small" color={Brand.primary} /> : null}
        </View>
      </RTLRow>

      <FlatList
        data={hits}
        keyExtractor={(item) =>
          item.kind === 'txn'
            ? `t-${item.data.id}`
            : item.kind === 'contact'
              ? `c-${item.data.id}`
              : `e-${item.data.id}`
        }
        contentContainerStyle={[
          styles.list,
          hits.length === 0 && styles.listEmpty,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.trim() ? (
            loading ? null : (
              <EmptyState
                icon="search-outline"
                title={t('search.noResults')}
                subtitle={t('search.noResultsHint')}
              />
            )
          ) : (
            <EmptyState
              icon="search-outline"
              title={t('search.title')}
              subtitle={t('search.hint')}
            />
          )
        }
        renderItem={({ item }) => {
          if (item.kind === 'contact') {
            const c = item.data;
            const tint = c.direction === 'i_lent' ? TxnKind.income : TxnKind.expense;
            return (
              <Pressable
                onPress={() => openHit(item)}
                style={[styles.row, { backgroundColor: card, borderColor: border }]}>
                <View style={[styles.icon, { backgroundColor: `${tint}18` }]}>
                  <Ionicons name="person-outline" size={18} color={tint} />
                </View>
                <View style={styles.mid}>
                  <AppText variant="captionBold" color={muted}>
                    {t('search.people')}
                  </AppText>
                  <AppText variant="bodySemibold" color={text} numberOfLines={1}>
                    {getContactName(c, i18n.language)}
                  </AppText>
                  {c.phone ? (
                    <AppText variant="caption" color={muted} numberOfLines={1}>
                      {c.phone}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="bodySemibold" color={tint}>
                  {formatPKR(c.balance)}
                </AppText>
              </Pressable>
            );
          }

          if (item.kind === 'entry') {
            const e = item.data;
            const tint = e.direction === 'i_lent' ? TxnKind.income : TxnKind.expense;
            return (
              <Pressable
                onPress={() => openHit(item)}
                style={[styles.row, { backgroundColor: card, borderColor: border }]}>
                <View style={[styles.icon, { backgroundColor: `${tint}18` }]}>
                  <Ionicons name="list-outline" size={18} color={tint} />
                </View>
                <View style={styles.mid}>
                  <AppText variant="captionBold" color={muted}>
                    {t('search.ledger')}
                  </AppText>
                  <AppText variant="bodySemibold" color={text} numberOfLines={1}>
                    {e.contactName}
                  </AppText>
                  <AppText variant="caption" color={muted} numberOfLines={1}>
                    {e.note || e.type} · {formatTransactionDate(e.date, i18n.language)}
                  </AppText>
                </View>
                <AppText variant="bodySemibold" color={tint}>
                  {formatPKR(e.amount)}
                </AppText>
              </Pressable>
            );
          }

          const txn = item.data;
          const kind = resolveMoneyKind(txn);
          const color = moneyKindColor(kind);
          return (
            <Pressable
              onPress={() => openHit(item)}
              style={[styles.row, { backgroundColor: card, borderColor: border }]}>
              <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
                <Ionicons
                  name={txn.hasReceipt ? 'receipt-outline' : 'cash-outline'}
                  size={18}
                  color={color}
                />
              </View>
              <View style={styles.mid}>
                <AppText variant="captionBold" color={muted}>
                  {t('search.transactions')}
                </AppText>
                <AppText variant="bodySemibold" color={text} numberOfLines={1}>
                  {getCategoryLabel(txn.category || '', txn.customCategory, t)}
                </AppText>
                <AppText variant="caption" color={muted} numberOfLines={1}>
                  {txn.note || formatTransactionDate(txn.date, i18n.language)}
                  {txn.hasReceipt ? ` · ${t('search.hasReceipt')}` : ''}
                </AppText>
              </View>
              <AppText variant="bodySemibold" color={color}>
                {formatPKR(txn.amount)}
              </AppText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 8 },
  list: { paddingHorizontal: Spacing.md, gap: 8 },
  listEmpty: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1, minWidth: 0, gap: 2 },
});
