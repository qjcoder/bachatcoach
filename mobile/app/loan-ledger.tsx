import { useCallback, useLayoutEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR, formatTransactionDate, formatTransactionTime } from '@/lib/format';
import { type LoanContactReportDetail, type LoanEntryReport } from '@/lib/loansReportPdf';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { RTLRow } from '@/components/RTLRow';
import { useDialog } from '@/context/DialogContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { getContactName } from '@/lib/contact';

function entryLabel(
  type: LoanEntryReport['type'],
  t: (key: string) => string
) {
  switch (type) {
    case 'lent':
      return t('loans.entryLent');
    case 'repaid':
      return t('loans.entryRepaid');
    case 'received':
      return t('loans.entryReceived');
    case 'paid_back':
      return t('loans.entryPaidBack');
    default:
      return type;
  }
}

function entryTint(type: LoanEntryReport['type'], direction: 'i_lent' | 'i_borrowed') {
  const increases =
    (direction === 'i_lent' && type === 'lent') ||
    (direction === 'i_borrowed' && type === 'received');
  return increases ? (direction === 'i_lent' ? Brand.primary : Brand.danger) : Brand.secondary;
}

function entrySign(type: LoanEntryReport['type'], direction: 'i_lent' | 'i_borrowed') {
  const increases =
    (direction === 'i_lent' && type === 'lent') ||
    (direction === 'i_borrowed' && type === 'received');
  return increases ? '+' : '−';
}

export default function LoanLedgerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const contactId = Array.isArray(id) ? id[0] : id;
  const { t, i18n } = useTranslation();
  const { showAlert } = useDialog();
  const navigation = useNavigation();
  const formatPKR = useFormatPKR();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [report, setReport] = useState<LoanContactReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (fresh = false) => {
      if (!contactId) return;
      const { data } = await api.get<{ contact: LoanContactReportDetail }>(
        `/contacts/${contactId}/report`,
        { headers: fresh ? { 'X-Bypass-Cache': '1' } : undefined }
      );
      setReport(data.contact);
      navigation.setOptions({
        title: getContactName(data.contact, i18n.language),
      });
    },
    [contactId, i18n.language, navigation]
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('loans.ledgerTitle') });
  }, [navigation, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(() => {
          setReport(null);
          showAlert({ title: t('loans.title'), message: t('loans.ledgerLoadFailed'), tone: 'error' });
        })
        .finally(() => setLoading(false));
    }, [load, showAlert, t])
  );

  const tint =
    report?.direction === 'i_borrowed' ? Brand.danger : Brand.primary;

  if (loading && !report) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={Brand.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState icon="document-text-outline" title={t('loans.ledgerLoadFailed')} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={report.entries}
        keyExtractor={(item, index) => item.id || `${item.date}-${index}`}
        contentContainerStyle={[
          styles.listContent,
          report.entries.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await load(true);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={Brand.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Card variant="elevated" style={styles.summaryCard}>
              <RTLRow gap={12} style={styles.personRow}>
                <View style={[styles.avatar, { backgroundColor: `${tint}14` }]}>
                  <Ionicons name="person" size={22} color={tint} />
                </View>
                <View style={styles.personInfo}>
                  <AppText variant="h3" color={colors.text} numberOfLines={2}>
                    {getContactName(report, i18n.language)}
                  </AppText>
                  {report.phone ? (
                    <AppText variant="caption" color={colors.muted} style={styles.phone}>
                      {report.phone}
                    </AppText>
                  ) : null}
                  <AppText variant="caption" color={colors.muted}>
                    {report.direction === 'i_lent' ? t('loans.iLent') : t('loans.iBorrowed')}
                  </AppText>
                </View>
              </RTLRow>

              <AppText variant="amountMd" color={tint} style={styles.balance}>
                {formatPKR(report.balance)}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                {t('loans.balance')}
              </AppText>

              <RTLRow gap={10} style={styles.statsRow}>
                <View style={[styles.stat, { backgroundColor: colors.field }]}>
                  <AppText variant="caption" color={colors.muted}>
                    {t('loans.reportTotalGiven')}
                  </AppText>
                  <AppText variant="bodySemibold" color={colors.text}>
                    {formatPKR(report.summary.totalGiven)}
                  </AppText>
                </View>
                <View style={[styles.stat, { backgroundColor: colors.field }]}>
                  <AppText variant="caption" color={colors.muted}>
                    {t('loans.reportTotalReturned')}
                  </AppText>
                  <AppText variant="bodySemibold" color={colors.text}>
                    {formatPKR(report.summary.totalReturned)}
                  </AppText>
                </View>
              </RTLRow>
            </Card>

            <AppText variant="bodySemibold" color={colors.muted} style={styles.sectionTitle}>
              {t('loans.ledgerEntries')}
            </AppText>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="list-outline" title={t('loans.reportNoEntries')} />}
        renderItem={({ item }) => {
          const color = entryTint(item.type, report.direction);
          return (
            <View style={[styles.entry, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <RTLRow style={styles.entryTop} gap={10}>
                <View style={[styles.entryIcon, { backgroundColor: `${color}14` }]}>
                  <Ionicons
                    name={
                      item.type === 'lent' || item.type === 'received'
                        ? 'arrow-up-outline'
                        : 'arrow-down-outline'
                    }
                    size={16}
                    color={color}
                  />
                </View>
                <View style={styles.entryBody}>
                  <AppText variant="bodySemibold" color={colors.text}>
                    {entryLabel(item.type, t)}
                  </AppText>
                  <AppText variant="caption" color={colors.muted}>
                    {formatTransactionDate(item.date, i18n.language)} ·{' '}
                    {formatTransactionTime(item.date, i18n.language)}
                  </AppText>
                  {item.note ? (
                    <AppText variant="bodySmall" color={colors.muted} style={styles.note}>
                      {item.note}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="amountSm" color={color}>
                  {entrySign(item.type, report.direction)}
                  {formatPKR(item.amount)}
                </AppText>
              </RTLRow>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  listEmpty: { flexGrow: 1 },
  header: { marginBottom: Spacing.sm },
  summaryCard: { marginBottom: Spacing.md },
  personRow: { alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personInfo: { flex: 1, minWidth: 0 },
  phone: { writingDirection: 'ltr', marginTop: 2 },
  balance: { marginTop: 4, writingDirection: 'ltr' },
  statsRow: { marginTop: 16 },
  stat: {
    flex: 1,
    borderRadius: Radius.md,
    padding: 12,
    gap: 4,
  },
  sectionTitle: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  entry: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
  },
  entryTop: { alignItems: 'flex-start' },
  entryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  entryBody: { flex: 1, minWidth: 0 },
  note: { marginTop: 4 },
});
