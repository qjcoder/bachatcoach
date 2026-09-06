import { useState, useLayoutEffect, useEffect } from 'react';
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
import { ensureGoogleAccessToken } from '@/lib/googleAuth';
import { uploadReceiptToDrive, hasReceipt } from '@/lib/googleDrive';
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

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

type TxnType = 'expense' | 'income' | 'savings';

function resolveType(raw?: string): TxnType {
  if (raw === 'income') return 'income';
  if (raw === 'savings') return 'savings';
  return 'expense';
}

const SAVINGS_PERCENTS = [10, 20, 30] as const;

export default function AddTransactionScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    id?: string;
    amount?: string;
    category?: string;
    customCategory?: string;
    paymentMethod?: string;
    note?: string;
    date?: string;
    receiptImage?: string;
  }>();
  const editingId = firstParam(params.id) || '';
  const isEditing = Boolean(editingId);
  const type = resolveType(firstParam(params.type));
  const isIncome = type === 'income';
  const isSavings = type === 'savings';
  const accent = isSavings ? Brand.secondary : isIncome ? Brand.primary : Brand.danger;
  const gradient = isSavings
    ? (['#FBBF24', '#F59E0B', '#D97706', '#B45309'] as const)
    : isIncome
      ? (['#34D399', '#10B981', '#059669', '#047857'] as const)
      : (['#FCA5A5', '#F87171', '#EF4444', '#DC2626'] as const);

  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { type: typeStyleFn } = useAppType();
  const currency = getCurrency(user?.currency);

  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const initialCategory = firstParam(params.category);
  const initialPayment = firstParam(params.paymentMethod);
  const initialDate = firstParam(params.date);
  const [amount, setAmount] = useState(firstParam(params.amount) || '');
  const [category, setCategory] = useState<string>(
    isSavings
      ? 'savings'
      : initialCategory && (categories as readonly string[]).includes(initialCategory)
        ? initialCategory
        : categories[0]
  );
  const [customCategory, setCustomCategory] = useState(firstParam(params.customCategory) || '');
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialPayment && (PAYMENT_METHODS as readonly string[]).includes(initialPayment)
      ? initialPayment
      : 'bank'
  );
  const [note, setNote] = useState(firstParam(params.note) || '');
  const [monthIncome, setMonthIncome] = useState(0);
  const [txnDate, setTxnDate] = useState(() => {
    if (!initialDate) return new Date();
    const parsed = new Date(initialDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  });
  const [receipt, setReceipt] = useState<{ uri: string } | null>(null);
  const [existingReceipt, setExistingReceipt] = useState(firstParam(params.receiptImage) || '');
  const [loading, setLoading] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);

  useLayoutEffect(() => {
    const title = isEditing
      ? isSavings
        ? t('expenses.editSavings')
        : isIncome
          ? t('expenses.editIncome')
          : t('expenses.editExpense')
      : isSavings
        ? t('expenses.addSavings')
        : isIncome
          ? t('expenses.addIncome')
          : t('expenses.addExpense');
    navigation.setOptions({
      title,
      headerStyle: { backgroundColor: accent },
    });
  }, [navigation, isIncome, isSavings, isEditing, t, accent]);

  useEffect(() => {
    if (!isSavings) return;
    let cancelled = false;
    api
      .get('/dashboard/summary', { params: { lang: i18n.language } })
      .then(({ data }) => {
        if (!cancelled) setMonthIncome(Number(data?.income) || 0);
      })
      .catch(() => {
        if (!cancelled) setMonthIncome(0);
      });
    return () => {
      cancelled = true;
    };
  }, [isSavings, i18n.language]);

  useEffect(() => {
    if (!editingId) return;
    // Prefer values passed from the list. Fall back to API only if amount is missing.
    if (firstParam(params.amount)) return;
    let cancelled = false;
    setLoadingEntry(true);
    (async () => {
      try {
        const { data } = await api.get(`/transactions/${editingId}`);
        if (cancelled) return;
        setAmount(String(data.amount ?? ''));
        if (data.category) setCategory(data.category);
        setCustomCategory(data.customCategory || '');
        if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
        setNote(data.note || '');
        if (data.date) setTxnDate(new Date(data.date));
        setExistingReceipt(typeof data.receiptImage === 'string' ? data.receiptImage : '');
      } catch {
        if (!cancelled) {
          showAlert({ title: t('common.error'), message: t('expenses.loadFailed'), tone: 'error' });
          router.back();
        }
      } finally {
        if (!cancelled) setLoadingEntry(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, params.amount, router, showAlert, t]);

  const applyPercent = (pct: number) => {
    if (monthIncome <= 0) return;
    setAmount(String(Math.round((monthIncome * pct) / 100)));
  };

  const save = async () => {
    if (!amount || Number(amount) <= 0) {
      showAlert({ title: t('common.error'), message: t('expenses.invalidAmount'), tone: 'error' });
      return;
    }
    if (!isSavings && isOtherCategory(category) && !customCategory.trim()) {
      showAlert({
        title: t('common.error'),
        message: t('expenses.customCategoryRequired'),
        tone: 'error',
      });
      return;
    }
    setLoading(true);
    try {
      let receiptImage: string | undefined;
      if (receipt?.uri) {
        const token = await ensureGoogleAccessToken();
        if (!token) {
          showAlert({
            title: t('expenses.receipt'),
            message: t('expenses.receiptNeedGoogle'),
            tone: 'warning',
          });
          return;
        }
        receiptImage = await uploadReceiptToDrive(receipt.uri, type);
      }
      const payload = {
        type,
        amount: Number(amount),
        category: isSavings ? 'savings' : category,
        customCategory: isSavings ? '' : isOtherCategory(category) ? customCategory.trim() : '',
        paymentMethod: isIncome ? undefined : paymentMethod,
        note,
        date: txnDate.toISOString(),
        ...(receiptImage ? { receiptImage } : {}),
      };
      if (isEditing) {
        await api.patch(`/transactions/${editingId}`, payload);
      } else {
        await api.post('/transactions', {
          ...payload,
          receiptImage: receiptImage || '',
        });
      }
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('expenses.saveFailed');
      showAlert({
        title: t('common.error'),
        message: message.includes('Drive') || message.includes('Google') ? t('expenses.receiptUploadFailed') : t('expenses.saveFailed'),
        tone: 'error',
      });
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
                name={isSavings ? 'wallet' : isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={16}
                color="#FFFFFF"
              />
              <AppText variant="captionBold" color="#FFFFFF">
                {isSavings
                  ? t('expenses.savingsTransfer')
                  : isIncome
                    ? t('expenses.income')
                    : t('expenses.expense')}
              </AppText>
            </View>
          </RTLRow>

          <AppText variant="label" color="rgba(255,255,255,0.88)" align="center" style={styles.heroLabel}>
            {t('expenses.amount')} ({currency.code})
          </AppText>
          <View style={styles.amountRow}>
            <AppText variant="h2" color="rgba(255,255,255,0.75)">{currency.symbol}</AppText>
            <TextInput
              style={[
                styles.amountInput,
                typeStyleFn('amount'),
                {
                  color: '#FFFFFF',
                  textAlign: 'center',
                  writingDirection: 'ltr',
                  letterSpacing: 0,
                },
              ]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.45)"
              selectionColor="#FFFFFF"
              textAlign="center"
              underlineColorAndroid="transparent"
            />
          </View>
        </LinearGradient>

        <View style={styles.form}>
          <FormSection title={t('expenses.when')}>
            <TransactionDateTime value={txnDate} onChange={setTxnDate} accent={accent} />
          </FormSection>

          {isSavings ? (
            <FormSection title={t('expenses.savingsPercentHint')} subtitle={t('expenses.savingsNotSpending')}>
              <View style={styles.chips}>
                {SAVINGS_PERCENTS.map((pct) => (
                  <Chip
                    key={pct}
                    label={`${pct}%`}
                    selected={
                      monthIncome > 0 &&
                      amount === String(Math.round((monthIncome * pct) / 100))
                    }
                    onPress={() => applyPercent(pct)}
                    tint={accent}
                  />
                ))}
              </View>
              {monthIncome > 0 ? (
                <AppText variant="caption" color={colors.muted} style={styles.percentHint}>
                  {t('expenses.basedOnIncome', { amount: monthIncome.toLocaleString() })}
                </AppText>
              ) : (
                <AppText variant="caption" color={colors.muted} style={styles.percentHint}>
                  {t('expenses.noIncomeYet')}
                </AppText>
              )}
            </FormSection>
          ) : (
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
          )}

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
            {isEditing && !receipt && hasReceipt(existingReceipt) ? (
              <AppText variant="caption" color={colors.muted} style={styles.receiptKept}>
                {t('expenses.receiptKept')}
              </AppText>
            ) : null}
          </FormSection>

          <FormSection title={t('expenses.note')}>
            <TextField
              icon="document-text-outline"
              value={note}
              onChangeText={setNote}
              placeholder={
                isSavings ? t('expenses.savingsNotePlaceholder') : t('expenses.notePlaceholder')
              }
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
        <Pressable onPress={save} disabled={loading || loadingEntry} style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient
            colors={[...gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, (loading || loadingEntry) && styles.saveDisabled]}>
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
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    width: '100%',
  },
  amountInput: {
    minWidth: 160,
    flexGrow: 0,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 40,
    lineHeight: 48,
    includeFontPadding: false,
  },
  form: {
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customCategory: { marginTop: Spacing.sm },
  receiptKept: { marginTop: 8 },
  percentHint: { marginTop: 10 },
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
