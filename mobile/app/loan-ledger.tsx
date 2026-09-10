import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR, formatTransactionDate, formatTransactionTime } from '@/lib/format';
import {
  exportLoansContactPdf,
  type LoanContactReportDetail,
  type LoanEntryReport,
} from '@/lib/loansReportPdf';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import {
  LoanPaymentSheet,
  type LoanPaymentTarget,
} from '@/components/LoanPaymentSheet';
import {
  LoanEntryEditSheet,
  type LoanEntryEditTarget,
} from '@/components/LoanEntryEditSheet';
import { initialsForName } from '@/components/LoanContactCard';
import { RTLRow } from '@/components/RTLRow';
import { useDialog } from '@/context/DialogContext';
import { useAuth } from '@/context/AuthContext';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { usePageChrome } from '@/hooks/usePageChrome';
import {
  Brand,
  Radius,
  Spacing,
  TxnKind,
  TxnKindDeep,
  TxnKindSoft,
  txnKindGradientDeep,
} from '@/constants/theme';
import { getContactName } from '@/lib/contact';
import { scriptLanguage } from '@/lib/language';
import { getCurrency } from '@/constants/currencies';
import { buildLoanReminderMessage, sendWhatsAppReminder } from '@/lib/whatsapp';

function entryLabel(type: LoanEntryReport['type'], t: (key: string) => string) {
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

function entryIncreases(type: LoanEntryReport['type'], direction: 'i_lent' | 'i_borrowed') {
  return (
    (direction === 'i_lent' && type === 'lent') ||
    (direction === 'i_borrowed' && type === 'received')
  );
}

function entryTint(type: LoanEntryReport['type'], direction: 'i_lent' | 'i_borrowed') {
  if (entryIncreases(type, direction)) {
    return direction === 'i_lent' ? TxnKind.income : TxnKind.expense;
  }
  return Brand.secondary;
}

function entrySign(type: LoanEntryReport['type'], direction: 'i_lent' | 'i_borrowed') {
  return entryIncreases(type, direction) ? '+' : '−';
}

export default function LoanLedgerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const contactId = Array.isArray(id) ? id[0] : id;
  const { t, i18n } = useTranslation();
  const { showAlert } = useDialog();
  const { user } = useAuth();
  const displayName = useUserDisplayName(t('common.appName'));
  const navigation = useNavigation();
  const formatPKR = useFormatPKR();
  const { bg, card, border, text, muted, soft, field, onBrand, isDark } = usePageChrome();
  const [report, setReport] = useState<LoanContactReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LoanEntryEditTarget | null>(null);
  const [reminding, setReminding] = useState(false);

  const isBorrowed = report?.direction === 'i_borrowed';
  const tint = isBorrowed ? TxnKind.expense : TxnKind.income;
  const tintSoft = isBorrowed ? TxnKindSoft.expense : TxnKindSoft.income;
  const gradient = useMemo(
    () =>
      isBorrowed ? txnKindGradientDeep('expense') : txnKindGradientDeep('income'),
    [isBorrowed]
  );

  const shareLedgerPdf = useCallback(async () => {
    if (!report || sharing) return;
    setSharing(true);
    try {
      const lang = scriptLanguage(i18n.language) === 'ur' ? 'ur' : 'en';
      const currency = getCurrency(user?.currency).code;
      await exportLoansContactPdf(
        report,
        new Date().toISOString(),
        displayName,
        lang,
        {
          title: t('loans.reportTitle'),
          lentTitle: t('loans.reportLent'),
          borrowedTitle: t('loans.reportBorrowed'),
          generated: t('loans.reportGenerated'),
          person: t('loans.person', { defaultValue: 'Person' }),
          phone: t('loans.phone'),
          balance: t('loans.balance'),
          date: t('loans.reportDate'),
          time: t('loans.reportTime'),
          type: t('loans.reportType'),
          amount: t('loans.reportAmount'),
          note: t('loans.reportNote'),
          summary: t('loans.reportSummary'),
          people: t('loans.reportPeople'),
          outstanding: t('loans.reportOutstanding'),
          totalGiven: t('loans.reportTotalGiven'),
          totalReturned: t('loans.reportTotalReturned'),
          noEntries: t('loans.reportNoEntries'),
          noContacts: t('loans.reportNoContacts'),
          entryLent: t('loans.entryLent'),
          entryRepaid: t('loans.entryRepaid'),
          entryReceived: t('loans.entryReceived'),
          entryPaidBack: t('loans.entryPaidBack'),
          currency,
        },
        report.direction === 'i_lent' ? t('loans.reportLent') : t('loans.reportBorrowed'),
        getContactName(report, i18n.language)
      );
    } catch {
      showAlert({
        title: t('loans.title'),
        message: t('loans.exportFailed'),
        tone: 'error',
      });
    } finally {
      setSharing(false);
    }
  }, [report, sharing, i18n.language, user?.currency, displayName, t, showAlert]);

  const remindOnWhatsApp = useCallback(async () => {
    if (!report || reminding) return;
    const phone = report.phone?.trim();
    if (!phone) {
      showAlert({
        title: t('loans.noPhone'),
        message: t('loans.addPhoneFirst'),
        tone: 'warning',
      });
      return;
    }
    setReminding(true);
    try {
      const lang = scriptLanguage(i18n.language) === 'ur' ? 'ur' : 'en';
      const currency = getCurrency(user?.currency).code;
      const message = buildLoanReminderMessage(
        getContactName(report, i18n.language),
        report.balance,
        lang,
        currency,
        report.dueDate
      );
      await sendWhatsAppReminder(phone, message);
    } catch {
      showAlert({
        title: t('common.error'),
        message: t('loans.whatsappError'),
        tone: 'error',
      });
    } finally {
      setReminding(false);
    }
  }, [report, reminding, i18n.language, user?.currency, showAlert, t]);

  const load = useCallback(
    async (fresh = false) => {
      if (!contactId) return;
      const { data } = await api.get<{ contact: LoanContactReportDetail }>(
        `/contacts/${contactId}/report`,
        { headers: fresh ? { 'X-Bypass-Cache': '1' } : undefined }
      );
      setReport(data.contact);
      const borrowed = data.contact.direction === 'i_borrowed';
      navigation.setOptions({
        title: getContactName(data.contact, i18n.language),
        headerStyle: {
          backgroundColor: borrowed ? TxnKindDeep.expense : TxnKindDeep.income,
        },
        headerTintColor: '#FFFFFF',
      });
    },
    [contactId, i18n.language, navigation]
  );

  useLayoutEffect(() => {
    const borrowed = report?.direction === 'i_borrowed';
    navigation.setOptions({
      title: report ? getContactName(report, i18n.language) : t('loans.ledgerTitle'),
      headerRight: undefined,
      headerStyle: {
        backgroundColor: borrowed ? TxnKindDeep.expense : TxnKindDeep.income,
      },
      headerTintColor: '#FFFFFF',
    });
  }, [navigation, t, report, i18n.language]);

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

  if (loading && !report) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator color={Brand.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <EmptyState icon="document-text-outline" title={t('loans.ledgerLoadFailed')} />
      </View>
    );
  }

  const personName = getContactName(report, i18n.language);
  const settled = report.balance <= 0;
  const paymentLabel =
    report.direction === 'i_lent'
      ? t('loans.paymentReceived', { defaultValue: 'Received' })
      : t('loans.paymentPaying', { defaultValue: 'Paying' });

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <FlatList
        data={report.entries}
        keyExtractor={(item, index) => item.id || `${item.date}-${index}`}
        initialNumToRender={12}
        windowSize={7}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        contentContainerStyle={[
          styles.listContent,
          report.entries.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
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
            tintColor={tint}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <LinearGradient
              colors={[...gradient]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}>
              <View style={[styles.heroGlow, { backgroundColor: 'rgba(255,255,255,0.14)' }]} />
              <RTLRow gap={12} style={styles.heroTop}>
                <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <AppText variant="bodySemibold" color={onBrand}>
                    {initialsForName(personName)}
                  </AppText>
                </View>
                <View style={styles.heroCopy}>
                  <AppText variant="h3" color={onBrand} numberOfLines={1}>
                    {personName}
                  </AppText>
                  {report.phone ? (
                    <AppText variant="caption" color="rgba(255,255,255,0.82)" style={styles.phone}>
                      {report.phone}
                    </AppText>
                  ) : null}
                  <View style={styles.chipRow}>
                    <View style={styles.directionChip}>
                      <AppText variant="captionBold" color={onBrand}>
                        {report.direction === 'i_lent' ? t('loans.iLent') : t('loans.iBorrowed')}
                      </AppText>
                    </View>
                    {settled ? (
                      <View style={[styles.directionChip, styles.settledChip]}>
                        <AppText variant="captionBold" color={onBrand}>
                          {t('loans.settled')}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
              </RTLRow>

              <AppText variant="label" color="rgba(255,255,255,0.8)" style={styles.balanceLabel}>
                {t('loans.balance')}
              </AppText>
              <AppText
                variant="amount"
                color={onBrand}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={styles.balance}>
                {formatPKR(report.balance)}
              </AppText>
            </LinearGradient>

            <View
              style={[
                styles.panel,
                {
                  backgroundColor: card,
                  borderColor: isDark ? border : `${tint}18`,
                  shadowColor: tint,
                },
              ]}>
              <RTLRow gap={10} style={styles.statsRow}>
                <View style={[styles.stat, { backgroundColor: field }]}>
                  <AppText variant="caption" color={muted} numberOfLines={2}>
                    {t('loans.reportTotalGiven')}
                  </AppText>
                  <AppText variant="bodySemibold" color={text} style={styles.statAmount}>
                    {formatPKR(report.summary.totalGiven)}
                  </AppText>
                </View>
                <View style={[styles.stat, { backgroundColor: field }]}>
                  <AppText variant="caption" color={muted} numberOfLines={2}>
                    {t('loans.reportTotalReturned')}
                  </AppText>
                  <AppText variant="bodySemibold" color={text} style={styles.statAmount}>
                    {formatPKR(report.summary.totalReturned)}
                  </AppText>
                </View>
              </RTLRow>

              <RTLRow style={styles.actions} gap={8}>
                {!settled ? (
                  <Pressable
                    onPress={() => setPaymentOpen(true)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.primaryBtn,
                      { backgroundColor: tint, opacity: pressed ? 0.9 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={paymentLabel}>
                    <Ionicons
                      name={
                        report.direction === 'i_lent' ? 'arrow-down-circle' : 'arrow-up-circle'
                      }
                      size={18}
                      color="#FFFFFF"
                    />
                    <AppText
                      variant="captionBold"
                      color="#FFFFFF"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      align="center">
                      {paymentLabel}
                    </AppText>
                  </Pressable>
                ) : null}

                {!settled && report.direction === 'i_lent' ? (
                  <Pressable
                    onPress={remindOnWhatsApp}
                    disabled={reminding}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.secondaryBtn,
                      {
                        borderColor: `${Brand.whatsapp}55`,
                        backgroundColor: `${Brand.whatsapp}12`,
                        opacity: reminding ? 0.65 : pressed ? 0.88 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t('loans.remind')}>
                    {reminding ? (
                      <ActivityIndicator color={Brand.whatsapp} size="small" />
                    ) : (
                      <Ionicons name="logo-whatsapp" size={18} color={Brand.whatsapp} />
                    )}
                    <AppText
                      variant="captionBold"
                      color={Brand.whatsapp}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      align="center">
                      {t('loans.remind')}
                    </AppText>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={shareLedgerPdf}
                  disabled={sharing}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.secondaryBtn,
                    {
                      borderColor: `${tint}40`,
                      backgroundColor: field,
                      opacity: sharing ? 0.65 : pressed ? 0.88 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('loans.shareLedgerWhatsApp')}>
                  {sharing ? (
                    <ActivityIndicator color={tint} size="small" />
                  ) : (
                    <Ionicons name="share-outline" size={18} color={tint} />
                  )}
                  <AppText
                    variant="captionBold"
                    color={tint}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    align="center">
                    {sharing
                      ? t('loans.exportingPdf')
                      : t('loans.shareShort', { defaultValue: 'Share' })}
                  </AppText>
                </Pressable>
              </RTLRow>
            </View>

            <RTLRow style={styles.sectionHead} gap={8}>
              <View style={[styles.sectionDot, { backgroundColor: tintSoft }]} />
              <AppText variant="bodySemibold" color={soft}>
                {t('loans.ledgerEntries')}
              </AppText>
            </RTLRow>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="list-outline" title={t('loans.reportNoEntries')} accent={tint} />
        }
        renderItem={({ item, index }) => {
          const color = entryTint(item.type, report.direction);
          const isLast = index === report.entries.length - 1;
          return (
            <Pressable
              onPress={() => {
                if (!item.id) return;
                setEditTarget({
                  contactId: report.id,
                  direction: report.direction,
                  entry: item,
                });
              }}
              style={({ pressed }) => [
                styles.entryShell,
                index === 0 && styles.entryFirst,
                isLast && styles.entryLast,
                { backgroundColor: card, borderColor: border, opacity: pressed ? 0.92 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('loans.editEntry')}>
              <RTLRow style={styles.entry} gap={12}>
                <View style={styles.timelineCol}>
                  <View style={[styles.entryIcon, { backgroundColor: `${color}16` }]}>
                    <Ionicons
                      name={
                        entryIncreases(item.type, report.direction)
                          ? 'arrow-up-outline'
                          : 'arrow-down-outline'
                      }
                      size={16}
                      color={color}
                    />
                  </View>
                  {!isLast ? (
                    <View style={[styles.timelineLine, { backgroundColor: border }]} />
                  ) : null}
                </View>
                <View style={[styles.entryBody, !isLast && styles.entryBodyBorder, { borderBottomColor: border }]}>
                  <RTLRow gap={10} style={styles.entryTop}>
                    <View style={styles.entryCopy}>
                      <AppText variant="bodySemibold" color={text}>
                        {entryLabel(item.type, t)}
                      </AppText>
                      <AppText variant="caption" color={muted} style={styles.entryMeta}>
                        {formatTransactionDate(item.date, i18n.language)} ·{' '}
                        {formatTransactionTime(item.date, i18n.language)}
                      </AppText>
                      {item.note ? (
                        <AppText variant="caption" color={muted} style={styles.note} numberOfLines={2}>
                          {item.note}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText variant="bodySemibold" color={color} style={styles.entryAmount}>
                      {entrySign(item.type, report.direction)}
                      {formatPKR(item.amount)}
                    </AppText>
                  </RTLRow>
                </View>
              </RTLRow>
            </Pressable>
          );
        }}
      />

      <LoanPaymentSheet
        visible={paymentOpen}
        target={
          report
            ? ({
                id: report.id,
                name: personName,
                direction: report.direction,
                balance: report.balance,
              } satisfies LoanPaymentTarget)
            : null
        }
        onClose={() => setPaymentOpen(false)}
        onSaved={() => {
          load(true).catch(() => {});
        }}
      />

      <LoanEntryEditSheet
        visible={!!editTarget}
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          load(true).catch(() => {});
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl + 8,
  },
  listEmpty: { flexGrow: 1 },
  header: { marginBottom: 4 },
  hero: {
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -60,
    right: -40,
  },
  heroTop: { alignItems: 'center', marginBottom: 18 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, minWidth: 0, gap: 3 },
  phone: { writingDirection: 'ltr' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  directionChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  settledChip: { backgroundColor: 'rgba(255,255,255,0.28)' },
  balanceLabel: { marginBottom: 2 },
  balance: {
    writingDirection: 'ltr',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  panel: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  statsRow: { marginBottom: 12 },
  stat: {
    flex: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
    minHeight: 72,
  },
  statAmount: { writingDirection: 'ltr' },
  actions: {
    alignItems: 'stretch',
  },
  actionBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  primaryBtn: {
    borderWidth: 0,
  },
  secondaryBtn: {
    borderWidth: 1,
  },
  sectionHead: {
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryShell: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  entryFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: 4,
  },
  entryLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    marginBottom: 8,
  },
  entry: {
    alignItems: 'stretch',
    paddingHorizontal: 14,
  },
  timelineCol: {
    width: 36,
    alignItems: 'center',
    paddingTop: 14,
  },
  entryIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 6,
    borderRadius: 1,
    minHeight: 12,
  },
  entryBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: 12,
    paddingBottom: 14,
  },
  entryBodyBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryTop: { alignItems: 'flex-start' },
  entryCopy: { flex: 1, minWidth: 0 },
  entryMeta: { marginTop: 3 },
  note: { marginTop: 4 },
  entryAmount: { writingDirection: 'ltr', marginTop: 2 },
});
