import { useState, useLayoutEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { AppText } from '@/components/AppText';
import { useAppType } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '@/constants/theme';
import { Brand, Radius, Spacing } from '@/constants/theme';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function AddTransactionScreen() {
  const { type: paramType } = useLocalSearchParams<{ type?: string }>();
  const type = paramType === 'income' ? 'income' : 'expense';
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { type: typeStyleFn, isRTL } = useAppType();

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(categories[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: type === 'income' ? t('expenses.addIncome') : t('expenses.addExpense'),
    });
  }, [navigation, type, t]);

  const save = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      await api.post('/transactions', {
        type,
        amount: Number(amount),
        category,
        paymentMethod: type === 'expense' ? paymentMethod : undefined,
        note,
        date: new Date().toISOString(),
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={[styles.amountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AppText variant="label" color={colors.muted} style={styles.amountLabel}>
          {t('expenses.amount')} (PKR)
        </AppText>
        <TextInput
          style={[
            styles.amountInput,
            typeStyleFn('amount'),
            { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' },
          ]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.muted}
        />
      </View>

      <AppText variant="bodySemibold" color={colors.text} style={styles.label}>
        {t('expenses.category')}
      </AppText>
      <View style={styles.chips}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={t(`categories.${cat}`)}
            selected={category === cat}
            onPress={() => setCategory(cat)}
          />
        ))}
      </View>

      {type === 'expense' && (
        <>
          <AppText variant="bodySemibold" color={colors.text} style={styles.label}>
            {t('expenses.paymentMethod')}
          </AppText>
          <View style={styles.chips}>
            {PAYMENT_METHODS.map((method) => (
              <Chip
                key={method}
                label={t(`paymentMethods.${method}`)}
                selected={paymentMethod === method}
                onPress={() => setPaymentMethod(method)}
              />
            ))}
          </View>
        </>
      )}

      <TextField
        label={t('expenses.note')}
        icon="document-text-outline"
        value={note}
        onChangeText={setNote}
        placeholder="Optional"
      />

      <Button
        title={loading ? t('common.loading') : t('common.save')}
        onPress={save}
        disabled={loading}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 40 },
  amountCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  amountLabel: { marginBottom: 4 },
  amountInput: {
    textAlign: 'center',
    paddingVertical: 8,
    width: '100%',
  },
  label: { marginBottom: 10, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  saveBtn: { marginTop: Spacing.md },
});
