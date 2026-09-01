import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable, Alert } from 'react-native';
import { AppText } from '@/components/AppText';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useFormatPKR } from '@/lib/format';
import { buildLoanReminderMessage, sendWhatsAppReminder } from '@/lib/whatsapp';
import { Button } from '@/components/Button';
import { ListCard } from '@/components/Card';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { BottomSheet } from '@/components/BottomSheet';
import { RTLRow } from '@/components/RTLRow';
import { EmptyState } from '@/components/EmptyState';
import { TextField } from '@/components/TextField';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Spacing } from '@/constants/theme';

type Contact = {
  _id: string;
  name: string;
  phone?: string;
  direction: 'i_lent' | 'i_borrowed';
  balance: number;
};

export default function LoansScreen() {
  const { t, i18n } = useTranslation();
  const formatPKR = useFormatPKR();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [tab, setTab] = useState<'i_lent' | 'i_borrowed'>('i_lent');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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
    await api.post('/contacts', { name, phone, direction: tab, amount: Number(amount) });
    setModalVisible(false);
    setName('');
    setPhone('');
    setAmount('');
    await load();
  };

  const remindViaWhatsApp = async (contact: Contact) => {
    if (!contact.phone) {
      Alert.alert(t('loans.noPhone'), t('loans.addPhoneFirst'));
      return;
    }
    const message = buildLoanReminderMessage(contact.name, contact.balance, i18n.language as 'en' | 'ur');
    try {
      await sendWhatsAppReminder(contact.phone, message);
    } catch {
      Alert.alert('Error', t('loans.whatsappError'));
    }
  };

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
          return (
            <ListCard
              icon="person-outline"
              iconColor={tint}
              iconBg={`${tint}12`}
              title={item.name}
              subtitle={item.phone || undefined}
              trailing={
                <View style={styles.trailingCol}>
                  <AppText variant="amountMd" color={tint}>{formatPKR(item.balance)}</AppText>
                  {tab === 'i_lent' && item.balance > 0 && (
                    <Pressable style={styles.waBtn} onPress={() => remindViaWhatsApp(item)}>
                      <RTLRow gap={6}>
                        <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                        <AppText variant="captionBold" color="#FFFFFF">{t('loans.remind')}</AppText>
                      </RTLRow>
                    </Pressable>
                  )}
                </View>
              }
            />
          );
        }}
      />

      <BottomSheet visible={modalVisible} title={t('loans.addPerson')} onClose={() => setModalVisible(false)}>
        <TextField label={t('loans.name')} icon="person-outline" value={name} onChangeText={setName} />
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
  trailingCol: { gap: 8 },
  waBtn: {
    backgroundColor: Brand.whatsapp,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    marginStart: 8,
  },
  modalActions: { marginTop: 8 },
});
