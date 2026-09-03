import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR } from '@/lib/format';
import { buildLoanReminderMessage, sendWhatsAppReminder } from '@/lib/whatsapp';
import {
  exportLoansContactPdf,
  type LoanContactReportDetail,
} from '@/lib/loansReportPdf';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { LoanContactCard, LoanActionButton } from '@/components/LoanContactCard';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { BottomSheet } from '@/components/BottomSheet';
import { RTLRow } from '@/components/RTLRow';
import { EmptyState } from '@/components/EmptyState';
import { TextField } from '@/components/TextField';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { getContactName } from '@/lib/contact';
import { contactMatchesQuery, phoneKey } from '@/lib/phone';
import { scriptLanguage } from '@/lib/language';

type Contact = {
  _id: string;
  name: string;
  nameUr?: string;
  phone?: string;
  direction: 'i_lent' | 'i_borrowed';
  balance: number;
  isSettled?: boolean;
};

export default function LoansScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const displayName = useUserDisplayName('User');
  const formatPKR = useFormatPKR();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [tab, setTab] = useState<'i_lent' | 'i_borrowed'>('i_lent');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [people, setPeople] = useState<Contact[]>([]);
  const [personModal, setPersonModal] = useState(false);
  const [ledgerModal, setLedgerModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingContactId, setExportingContactId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = async (fresh = false) => {
    const headers = fresh ? { 'X-Bypass-Cache': '1' } : undefined;
    // One request for both tabs — filter client-side for instant lent/borrowed switch
    const { data } = await api.get<Contact[]>('/contacts', {
      params: { includeSettled: 1 },
      headers,
    });
    setPeople(data);
    setContacts(data.filter((c) => !c.isSettled));
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {
        /* keep previous people/contacts */
      });
    }, [])
  );

  const listData = useMemo(
    () => contacts.filter((c) => c.direction === tab),
    [contacts, tab]
  );

  const peopleForTab = useMemo(
    () => people.filter((c) => c.direction === tab),
    [people, tab]
  );

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setNameUr('');
    setPhone('');
    setAmount('');
    setNote('');
    setPersonQuery('');
    setSelectedPerson(null);
  };

  const openAddPerson = () => {
    resetForm();
    setPersonModal(true);
  };

  const openAddLedger = () => {
    resetForm();
    setLedgerModal(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingId(contact._id);
    setName(contact.name || '');
    setNameUr(contact.nameUr || '');
    setPhone(contact.phone || '');
    setAmount(String(contact.balance ?? ''));
    setPersonModal(true);
  };

  const closePersonModal = () => {
    setPersonModal(false);
    resetForm();
  };

  const closeLedgerModal = () => {
    setLedgerModal(false);
    resetForm();
  };

  const visibleContacts = useMemo(
    () => listData.filter((c) => contactMatchesQuery(c, query)),
    [listData, query]
  );

  const personMatches = useMemo(() => {
    const matches = peopleForTab.filter((c) => contactMatchesQuery(c, personQuery));
    return matches.slice(0, 12);
  }, [peopleForTab, personQuery]);

  const savePerson = async () => {
    if (!name.trim() || !phoneKey(phone)) {
      showAlert({ title: t('common.error'), message: t('loans.fillPersonRequired'), tone: 'error' });
      return;
    }
    if (amount && Number(amount) <= 0) {
      showAlert({ title: t('common.error'), message: t('loans.amountRequired'), tone: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/contacts/${editingId}`, {
          name: name.trim(),
          nameUr: nameUr.trim() || '',
          phone: phone.trim(),
          amount: amount === '' ? undefined : Number(amount),
        });
      } else {
        await api.post('/contacts', {
          name: name.trim(),
          nameUr: nameUr.trim() || undefined,
          phone: phone.trim(),
          direction: tab,
          amount: amount ? Number(amount) : undefined,
        });
      }
      closePersonModal();
      await load();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { code?: string; direction?: string } } })?.response?.data;
      if (data?.code === 'PHONE_REQUIRED') {
        showAlert({ title: t('loans.title'), message: t('loans.phoneRequired'), tone: 'error' });
      } else if (data?.code === 'PHONE_TAKEN') {
        const list =
          data.direction === 'i_borrowed' ? t('loans.iBorrowed') : t('loans.iLent');
        showAlert({ title: t('loans.title'), message: t('loans.phoneTaken', { list }), tone: 'error' });
      } else {
        showAlert({ title: t('loans.title'), message: t('loans.updateFailed'), tone: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const saveLedger = async () => {
    if (!selectedPerson) {
      showAlert({ title: t('common.error'), message: t('loans.personRequired'), tone: 'error' });
      return;
    }
    if (!amount || Number(amount) <= 0) {
      showAlert({ title: t('common.error'), message: t('loans.amountRequired'), tone: 'error' });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/contacts/${selectedPerson._id}/entry`, {
        type: tab === 'i_lent' ? 'lent' : 'received',
        amount: Number(amount),
        note: note.trim(),
      });
      closeLedgerModal();
      await load();
    } catch {
      showAlert({ title: t('loans.title'), message: t('loans.updateFailed'), tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remindViaWhatsApp = async (contact: Contact) => {
    if (!contact.phone) {
      showAlert({ title: t('loans.noPhone'), message: t('loans.addPhoneFirst'), tone: 'info' });
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
      showAlert({ title: t('common.error'), message: t('loans.whatsappError'), tone: 'error' });
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
      showAlert({ title: t('loans.title'), message: t('loans.exportFailed'), tone: 'error' });
    } finally {
      setExportingContactId(null);
    }
  };

  const tint = tab === 'i_lent' ? Brand.primary : Brand.danger;
  const ledgerTitle = tab === 'i_lent' ? t('loans.addLent') : t('loans.addBorrow');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <SegmentedTabs
          tabs={[
            { key: 'i_lent', label: t('loans.iLent') },
            { key: 'i_borrowed', label: t('loans.iBorrowed') },
          ]}
          active={tab}
          onChange={setTab}
        />
        <RTLRow gap={10}>
          <Pressable
            onPress={openAddPerson}
            style={[styles.iconBtn, { backgroundColor: Brand.primary }]}>
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
            <AppText variant="captionBold" color="#FFFFFF" numberOfLines={1} style={styles.iconBtnLabel}>
              {t('loans.addNewPerson')}
            </AppText>
          </Pressable>
          <Pressable
            onPress={openAddLedger}
            style={[styles.iconBtn, styles.iconBtnOutline, { borderColor: tint, backgroundColor: `${tint}12` }]}>
            <Ionicons name="cash-outline" size={18} color={tint} />
            <AppText variant="captionBold" color={tint} numberOfLines={1} style={styles.iconBtnLabel}>
              {ledgerTitle}
            </AppText>
          </Pressable>
        </RTLRow>
        <TextField
          icon="search-outline"
          value={query}
          onChangeText={setQuery}
          placeholder={t('loans.searchPlaceholder')}
        />
      </View>

      <FlatList
        style={styles.list}
        data={visibleContacts}
        keyExtractor={(item) => item._id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        updateCellsBatchingPeriod={50}
        contentContainerStyle={[
          styles.listContent,
          visibleContacts.length === 0 && styles.listContentEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load(true);
              setRefreshing(false);
            }}
            tintColor={Brand.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={query.trim() ? t('loans.noSearchResults') : t('loans.noLoans')}
          />
        }
        renderItem={({ item }) => {
          const showRemind = tab === 'i_lent' && item.balance > 0;
          return (
            <LoanContactCard
              name={getContactName(item, i18n.language)}
              phone={item.phone}
              amount={formatPKR(item.balance)}
              tint={tint}
              onPress={() =>
                router.push({ pathname: '/loan-ledger', params: { id: item._id } })
              }
              actions={
                <View style={styles.actionRow}>
                  <LoanActionButton
                    label={t('loans.edit')}
                    icon="create-outline"
                    tint={tint}
                    onPress={() => openEdit(item)}
                  />
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
                </View>
              }
            />
          );
        }}
      />

      <BottomSheet
        visible={personModal}
        title={editingId ? t('loans.editPerson') : t('loans.addNewPerson')}
        onClose={closePersonModal}>
        <TextField label={t('loans.name')} icon="person-outline" value={name} onChangeText={setName} />
        <TextField label={t('loans.nameUr')} icon="person-outline" value={nameUr} onChangeText={setNameUr} />
        <TextField label={t('loans.phone')} icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField
          label={editingId ? t('loans.balance') : t('loans.amountOptional')}
          icon="cash-outline"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <RTLRow style={styles.modalActions} gap={10}>
          <Button title={t('common.cancel')} onPress={closePersonModal} variant="outline" style={{ flex: 1 }} />
          <Button title={t('common.save')} onPress={savePerson} disabled={saving} style={{ flex: 1 }} />
        </RTLRow>
      </BottomSheet>

      <BottomSheet visible={ledgerModal} title={ledgerTitle} onClose={closeLedgerModal}>
        <TextField
          label={t('loans.searchPerson')}
          icon="search-outline"
          value={personQuery}
          onChangeText={(value) => {
            setPersonQuery(value);
            setSelectedPerson(null);
          }}
          placeholder={t('loans.searchPersonPlaceholder')}
        />
        {selectedPerson ? (
          <View style={[styles.selectedCard, { backgroundColor: `${tint}12`, borderColor: `${tint}40` }]}>
            <AppText variant="bodySemibold" color={colors.text}>
              {getContactName(selectedPerson, i18n.language)}
            </AppText>
            {selectedPerson.phone ? (
              <AppText variant="caption" color={colors.muted}>{selectedPerson.phone}</AppText>
            ) : null}
            <AppText variant="caption" color={tint}>
              {t('loans.balance')}: {formatPKR(selectedPerson.balance ?? 0)}
            </AppText>
          </View>
        ) : peopleForTab.length === 0 ? (
          <AppText variant="bodySmall" color={colors.muted} style={styles.hint}>
            {t('loans.noPeopleYet')}
          </AppText>
        ) : (
          <ScrollView style={styles.suggestList} keyboardShouldPersistTaps="handled">
            {personMatches.map((person) => (
              <Pressable
                key={person._id}
                onPress={() => {
                  setSelectedPerson(person);
                  setPersonQuery(getContactName(person, i18n.language));
                }}
                style={[styles.suggestRow, { borderBottomColor: colors.border }]}>
                <View style={styles.suggestText}>
                  <AppText variant="bodySemibold" color={colors.text} numberOfLines={1}>
                    {getContactName(person, i18n.language)}
                  </AppText>
                  <AppText variant="caption" color={colors.muted} numberOfLines={1}>
                    {person.phone || t('loans.noPhone')}
                    {person.isSettled ? ` · ${t('loans.settled')}` : ''}
                  </AppText>
                </View>
                <AppText variant="captionBold" color={tint}>
                  {formatPKR(person.balance ?? 0)}
                </AppText>
              </Pressable>
            ))}
            {personMatches.length === 0 ? (
              <AppText variant="bodySmall" color={colors.muted} style={styles.hint}>
                {t('loans.noSearchResults')}
              </AppText>
            ) : null}
          </ScrollView>
        )}
        <TextField
          label={t('loans.amount')}
          icon="cash-outline"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <TextField
          label={t('loans.reportNote')}
          icon="document-text-outline"
          value={note}
          onChangeText={setNote}
        />
        <RTLRow style={styles.modalActions} gap={10}>
          <Button title={t('common.cancel')} onPress={closeLedgerModal} variant="outline" style={{ flex: 1 }} />
          <Button title={t('common.save')} onPress={saveLedger} disabled={saving} style={{ flex: 1 }} />
        </RTLRow>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { padding: Spacing.md, paddingBottom: Spacing.sm, gap: 12 },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  iconBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  iconBtnOutline: {
    borderWidth: 1.5,
  },
  iconBtnLabel: {
    flexShrink: 1,
  },
  actionRow: { flexDirection: 'row', width: '100%', gap: 6 },
  modalActions: { marginTop: 8 },
  hint: { marginTop: 8, marginBottom: 8 },
  selectedCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    gap: 2,
  },
  suggestList: {
    maxHeight: 180,
    marginTop: 4,
    marginBottom: 8,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestText: { flex: 1, minWidth: 0 },
});
