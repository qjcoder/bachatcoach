import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useFormatPKR } from '@/lib/format';
import { buildLoanReminderMessage, sendWhatsAppReminder } from '@/lib/whatsapp';
import {
  exportLoansContactPdf,
  type LoanContactReportDetail,
} from '@/lib/loansReportPdf';
import { useAuth } from '@/context/AuthContext';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { Button } from '@/components/Button';
import { LoanContactCard, LoanActionButton } from '@/components/LoanContactCard';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { BottomSheet } from '@/components/BottomSheet';
import { RTLRow } from '@/components/RTLRow';
import { EmptyState } from '@/components/EmptyState';
import { TextField } from '@/components/TextField';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Spacing } from '@/constants/theme';
import { useIsRTL } from '@/hooks/useIsRTL';
import { getContactName } from '@/lib/contact';
import { scriptLanguage } from '@/lib/language';

type Contact = {
  _id: string;
  name: string;
  nameUr?: string;
  phone?: string;
  direction: 'i_lent' | 'i_borrowed';
  balance: number;
};

export default function LoansScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const displayName = useUserDisplayName('User');
  const formatPKR = useFormatPKR();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const isRTL = useIsRTL();
  const [tab, setTab] = useState<'i_lent' | 'i_borrowed'>('i_lent');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [exportingContactId, setExportingContactId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await api.get('/contacts', { params: { direction: tab } });
    setContacts(data);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setContacts([]));
    }, [tab])
  );

  const addContact = async () => {
    if (!name || !amount) {
      Alert.alert('Error', t('loans.fillRequired'));
      return;
    }
    await api.post('/contacts', { name, nameUr: nameUr || undefined, phone, direction: tab, amount: Number(amount) });
    setModalVisible(false);
    setName('');
    setNameUr('');
    setPhone('');
    setAmount('');
    await load();
  };

  const remindViaWhatsApp = async (contact: Contact) => {
    if (!contact.phone) {
      Alert.alert(t('loans.noPhone'), t('loans.addPhoneFirst'));
      return;
    }
    const message = buildLoanReminderMessage(
      getContactName(contact, i18n.language),
      contact.balance,
      scriptLanguage(i18n.language),
      user?.currency || 'PKR'
    );
    try {
      await sendWhatsAppReminder(contact.phone, message);
    } catch {
      Alert.alert('Error', t('loans.whatsappError'));
    }
  };

  const reportLabels = () => ({
    title: t('loans.reportTitle'),
    lentTitle: t('loans.reportLent'),
    borrowedTitle: t('loans.reportBorrowed'),
    generated: t('loans.reportGenerated'),
    person: t('loans.name'),
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
    currency: user?.currency || 'PKR',
  });

  const exportPersonPdf = async (contactId: string) => {
    setExportingContactId(contactId);
    try {
      const { data } = await api.get<{ generatedAt: string; contact: LoanContactReportDetail }>(
        `/contacts/${contactId}/report`
      );
      const lang = scriptLanguage(i18n.language);
      const sectionTitle =
        data.contact.direction === 'i_lent' ? t('loans.reportLent') : t('loans.reportBorrowed');
      await exportLoansContactPdf(
        { ...data.contact, name: getContactName(data.contact, lang) },
        data.generatedAt,
        displayName,
        lang,
        reportLabels(),
        sectionTitle
      );
    } catch {
      Alert.alert(t('loans.title'), t('loans.exportFailed'));
    } finally {
      setExportingContactId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, direction: isRTL ? 'rtl' : 'ltr' }]}>
      <View style={styles.top}>
        <SegmentedTabs
          tabs={[
            { key: 'i_lent', label: t('loans.iLent') },
            { key: 'i_borrowed', label: t('loans.iBorrowed') },
          ]}
          active={tab}
          onChange={setTab}
        />
        <Button title={t('loans.addPerson')} onPress={() => setModalVisible(true)} style={styles.addBtn} />
      </View>

      <FlatList
        style={styles.list}
        data={contacts}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
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
        }
        ListEmptyComponent={<EmptyState icon="people-outline" title={t('loans.noLoans')} />}
        renderItem={({ item }) => {
          const tint = tab === 'i_lent' ? Brand.primary : Brand.danger;
          const showRemind = tab === 'i_lent' && item.balance > 0;
          return (
            <LoanContactCard
              name={getContactName(item, i18n.language)}
              phone={item.phone}
              amount={formatPKR(item.balance)}
              tint={tint}
              actions={
                <RTLRow gap={8} style={styles.actionRow}>
                  <LoanActionButton
                    label={t('loans.exportPersonPdf')}
                    icon="document-outline"
                    tint={tint}
                    onPress={() => exportPersonPdf(item._id)}
                    loading={exportingContactId === item._id}
                  />
                  {showRemind ? (
                    <LoanActionButton
                      label={t('loans.remind')}
                      icon="logo-whatsapp"
                      variant="filled"
                      onPress={() => remindViaWhatsApp(item)}
                    />
                  ) : null}
                </RTLRow>
              }
            />
          );
        }}
      />

      <BottomSheet visible={modalVisible} title={t('loans.addPerson')} onClose={() => setModalVisible(false)}>
        <TextField label={t('loans.name')} icon="person-outline" value={name} onChangeText={setName} />
        <TextField label={t('loans.nameUr')} icon="person-outline" value={nameUr} onChangeText={setNameUr} />
        <TextField label={t('loans.phone')} icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField label={t('loans.amount')} icon="cash-outline" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <RTLRow style={styles.modalActions} gap={10}>
          <Button title={t('common.cancel')} onPress={() => setModalVisible(false)} variant="outline" style={{ flex: 1 }} />
          <Button title={t('common.save')} onPress={addContact} style={{ flex: 1 }} />
        </RTLRow>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { padding: Spacing.md, paddingBottom: Spacing.sm, gap: 12 },
  list: { flex: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  addBtn: { paddingVertical: 12 },
  actionRow: { width: '100%' },
  modalActions: { marginTop: 8 },
});
