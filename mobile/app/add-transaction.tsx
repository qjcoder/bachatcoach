import { useState, useLayoutEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/lib/api';
import { AppText } from '@/components/AppText';
import { useAppType } from '@/components/AppText';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { FormSection } from '@/components/FormSection';
import { TransactionDateTime } from '@/components/TransactionDateTime';
import { ReceiptUpload } from '@/components/ReceiptUpload';
import { RTLRow } from '@/components/RTLRow';
import { useDialog } from '@/context/DialogContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '@/constants/theme';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { isOtherCategory } from '@/lib/category';
import { useAuth } from '@/context/AuthContext';
import { getCurrency } from '@/constants/currencies';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

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
  other: 'ellipsis-horizontal-circle-outline',
  salary: 'cash-outline',
  freelance: 'laptop-outline',
  gift: 'gift-outline',
  investment: 'trending-up-outline',
  other_income: 'add-circle-outline',
};

const PAYMENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: 'cash-outline',
  bank: 'business-outline',
  jazzcash: 'phone-portrait-outline',
  easypaisa: 'phone-portrait-outline',
  card: 'card-outline',
};

export default function AddTransactionScreen() {
  const { type: paramType } = useLocalSearchParams<{ type?: string }>();
  const type = paramType === 'income' ? 'income' : 'expense';
  const isIncome = type === 'income';
  const accent = isIncome ? Brand.primary : Brand.danger;
  const gradient = isIncome
    ? (['#34D399', '#10B981', '#059669', '#047857'] as const)
    : (['#FCA5A5', '#F87171', '#EF4444', '#DC2626'] as const);

  const { t } = useTranslation();
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { type: typeStyleFn, isRTL } = useAppType();
  const currency = getCurrency(user?.currency);

  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(categories[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [note, setNote] = useState('');
  const [txnDate, setTxnDate] = useState(new Date());
  const [receipt, setReceipt] = useState<{ uri: string; base64: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isIncome ? t('expenses.addIncome') : t('expenses.addExpense'),
      headerStyle: { backgroundColor: accent },
    });
  }, [navigation, isIncome, t, accent]);

  const save = async () => {
    if (!amount || Number(amount) <= 0) {
      showAlert({ title: t('common.error'), message: t('expenses.invalidAmount'), tone: 'error' });
      return;
    }
    if (isOtherCategory(category) && !customCategory.trim()) {
      showAlert({
        title: t('common.error'),
        message: t('expenses.customCategoryRequired'),
        tone: 'error',
      });
      return;
    }
    setLoading(true);
    try {
      await api.post('/transactions', {
        type,
        amount: Number(amount),
        category,
        customCategory: isOtherCategory(category) ? customCategory.trim() : '',
        paymentMethod: isIncome ? undefined : paymentMethod,
        note,
        date: txnDate.toISOString(),
        receiptImage: receipt?.base64 || '',
      });
      router.back();
    } catch {
      showAlert({ title: t('common.error'), message: t('expenses.saveFailed'), tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[...gradient]} style={styles.hero}>
          <View style={styles.heroPattern}>
            <View style={styles.heroCircleA} />
            <View style={styles.heroCircleB} />
          </View>

          <RTLRow style={styles.typeBadgeRow} gap={8}>
            <View style={styles.typeBadge}>
              <Ionicons
                name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={16}
                color="#FFFFFF"
              />
              <AppText variant="captionBold" color="#FFFFFF">
                {isIncome ? t('expenses.income') : t('expenses.expense')}
              </AppText>
            </View>
          </RTLRow>

          <AppText variant="label" color="rgba(255,255,255,0.88)" align="center" style={styles.heroLabel}>
            {t('expenses.amount')} ({currency.code})
          </AppText>
          <RTLRow style={styles.amountRow} gap={4}>
            <AppText variant="h2" color="rgba(255,255,255,0.75)">{currency.symbol}</AppText>
            <TextInput
              style={[
                styles.amountInput,
                typeStyleFn('amount'),
                { color: '#FFFFFF', writingDirection: isRTL ? 'rtl' : 'ltr' },
              ]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.45)"
              selectionColor="#FFFFFF"
            />
          </RTLRow>
        </LinearGradient>

        <View style={styles.form}>
          <FormSection title={t('expenses.when')}>
            <TransactionDateTime value={txnDate} onChange={setTxnDate} accent={accent} />
          </FormSection>

          <FormSection title={t('expenses.category')}>
            <View style={styles.chips}>
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={t(`categories.${cat}`)}
                  icon={CATEGORY_ICONS[cat]}
                  selected={category === cat}
                  onPress={() => {
                    setCategory(cat);
                    if (!isOtherCategory(cat)) setCustomCategory('');
                  }}
                  tint={accent}
                />
              ))}
            </View>
            {isOtherCategory(category) && (
              <View style={styles.customCategory}>
                <TextField
                  label={t('expenses.customCategory')}
                  icon="create-outline"
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder={t('expenses.customCategoryPlaceholder')}
                  autoFocus
                />
              </View>
            )}
          </FormSection>

          {!isIncome && (
            <FormSection title={t('expenses.paymentMethod')}>
              <View style={styles.chips}>
                {PAYMENT_METHODS.map((method) => (
                  <Chip
                    key={method}
                    label={t(`paymentMethods.${method}`)}
                    icon={PAYMENT_ICONS[method]}
                    selected={paymentMethod === method}
                    onPress={() => setPaymentMethod(method)}
                    tint={accent}
                  />
                ))}
              </View>
            </FormSection>
          )}

          <FormSection title={t('expenses.receipt')}>
            <ReceiptUpload previewUri={receipt?.uri ?? null} onChange={setReceipt} accent={accent} />
          </FormSection>

          <FormSection title={t('expenses.note')}>
            <TextField
              icon="document-text-outline"
              value={note}
              onChangeText={setNote}
              placeholder={t('expenses.notePlaceholder')}
            />
          </FormSection>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}>
        <Pressable onPress={save} disabled={loading} style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient
            colors={[...gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, loading && styles.saveDisabled]}>
            <RTLRow gap={10} style={styles.saveInner}>
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
              <AppText variant="button" color="#FFFFFF">
                {loading ? t('common.loading') : t('common.save')}
              </AppText>
            </RTLRow>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  hero: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
    ...Shadow.elevated,
  },
  heroPattern: { ...StyleSheet.absoluteFill },
  heroCircleA: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -50,
    right: -30,
  },
  heroCircleB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -40,
    left: -20,
  },
  typeBadgeRow: { justifyContent: 'center', marginBottom: 20 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  heroLabel: { marginBottom: 8 },
  amountRow: { justifyContent: 'center', alignItems: 'center' },
  amountInput: {
    minWidth: 120,
    textAlign: 'center',
    paddingVertical: 4,
    fontSize: 40,
    lineHeight: 48,
  },
  form: {
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customCategory: { marginTop: Spacing.sm },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadow.card,
  },
  saveBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 16,
    ...Shadow.elevated,
  },
  saveDisabled: { opacity: 0.65 },
  saveInner: { justifyContent: 'center' },
  pressed: { opacity: 0.92 },
});
