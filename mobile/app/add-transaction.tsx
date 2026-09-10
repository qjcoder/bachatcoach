import { useState, useLayoutEffect, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Dimensions,
  Image,
  Modal,
  Keyboard,
  ScrollView,
  InteractionManager,
  Linking,
  type KeyboardEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/lib/api';
import { AppText } from '@/components/AppText';
import { pickReceiptImage } from '@/components/ReceiptUpload';
import { RTLRow } from '@/components/RTLRow';
import { useDialog } from '@/context/DialogContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, CategoryTints } from '@/constants/theme';
import { Brand, Radius, TxnKind, txnKindGradientDeep } from '@/constants/theme';
import {
  isOtherCategory,
  hasCategorySubtypes,
  isKnownSubcategory,
  getCategorySubtypeConfig,
} from '@/lib/category';
import { useAuth } from '@/context/AuthContext';
import { getCurrency } from '@/constants/currencies';
import { useGoogleDriveConnect } from '@/lib/googleAuth';
import { uploadReceiptToDrive } from '@/lib/googleDrive';
import { formatAmount, formatTransactionTime } from '@/lib/format';
import { localeForLanguage, scriptLanguage } from '@/lib/language';
import { getDailyQuote } from '@/lib/dailyQuotes';
import { usePageChrome } from '@/hooks/usePageChrome';
import { BankLogo } from '@/components/BankLogo';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const H_PAD = 14;
const GRID_COLS = 5;
const GRID_GAP = 6;
const CAT_SIZE = Math.floor((SCREEN_W - H_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
/** Compact layout so amount + categories + date/pay fit above keypad in one view. */
const COMPACT = SCREEN_H < 820;
const KEY_H = COMPACT ? 36 : 40;
const KEY_GAP = 5;
const KEYPAD_INSET = 6;
const ATTACH_H = COMPACT ? 48 : 52;
const AMOUNT_SIZE = COMPACT ? 36 : 42;
const QUICK_AMOUNTS = [100, 500, 1000, 5000] as const;
const NOTE_MAX = 200;
const SAVINGS_PERCENTS = [10, 20, 30] as const;

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: 'restaurant',
  transport: 'car',
  bills: 'flash',
  rent: 'home',
  shopping: 'bag-handle',
  health: 'heart',
  entertainment: 'game-controller',
  education: 'school',
  subscriptions: 'sync',
  personal: 'person',
  other: 'ellipsis-horizontal',
  salary: 'cash',
  freelance: 'laptop',
  gift: 'gift',
  investment: 'trending-up',
  other_income: 'add-circle',
};

const CATEGORY_COLORS: Record<string, string> = CategoryTints;

const PAYMENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: 'wallet',
  bank: 'business',
};

function normalizePaymentMethod(raw?: string) {
  if (raw === 'cash' || raw === 'bank') return raw;
  // JazzCash / EasyPaisa / Card → pick a bank account instead
  if (raw === 'jazzcash' || raw === 'easypaisa' || raw === 'card') return 'bank';
  return '';
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

type TxnType = 'expense' | 'income' | 'savings';

function resolveType(raw?: string): TxnType {
  if (raw === 'income') return 'income';
  if (raw === 'savings') return 'savings';
  return 'expense';
}

function parseTagsParam(raw?: string) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : [];
  } catch {
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AddTransactionScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    id?: string;
    amount?: string;
    category?: string;
    customCategory?: string;
    paymentMethod?: string;
    note?: string;
    tags?: string;
    date?: string;
    receiptImage?: string;
  }>();
  const editingId = firstParam(params.id) || '';
  const isEditing = Boolean(editingId);
  const paramType = resolveType(firstParam(params.type));

  const [type, setType] = useState<TxnType>(paramType);
  const isIncome = type === 'income';
  const isSavings = type === 'savings';
  const accent = isSavings ? TxnKind.savings : isIncome ? TxnKind.income : TxnKind.expense;
  const gradient = isSavings
    ? txnKindGradientDeep('savings')
    : isIncome
      ? txnKindGradientDeep('income')
      : txnKindGradientDeep('expense');

  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { connectDrive } = useGoogleDriveConnect();
  const { bg, card, border, text, muted, soft, well, field, onBrand, isDark } = usePageChrome();
  const currency = getCurrency(user?.currency);

  const categories = useMemo(() => {
    if (isIncome) return [...INCOME_CATEGORIES];
    // Simple grid: drop personal to match clean 5×2 layout
    return EXPENSE_CATEGORIES.filter((c) => c !== 'personal');
  }, [isIncome]);

  const initialCategory = firstParam(params.category);
  const initialPayment = firstParam(params.paymentMethod);
  const initialDate = firstParam(params.date);

  const [amount, setAmount] = useState(firstParam(params.amount) || '');
  const [category, setCategory] = useState<string>(() => {
    if (isSavings) return 'savings';
    if (initialCategory && (categories as string[]).includes(initialCategory)) return initialCategory;
    return categories[0];
  });
  const [customCategory, setCustomCategory] = useState(firstParam(params.customCategory) || '');
  const [subtypeOther, setSubtypeOther] = useState(() => {
    const cat = firstParam(params.category) || '';
    const initial = firstParam(params.customCategory) || '';
    return hasCategorySubtypes(cat) && !!initial && !isKnownSubcategory(cat, initial);
  });
  const [paymentMethod, setPaymentMethod] = useState<string>(() => {
    const normalized = normalizePaymentMethod(initialPayment);
    if (normalized) return normalized;
    return editingId ? 'cash' : '';
  });
  const [note, setNote] = useState(firstParam(params.note) || '');
  const [recurringMonthly, setRecurringMonthly] = useState(
    firstParam(params.recurringMonthly) === '1' || firstParam(params.recurringMonthly) === 'true'
  );
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [tags] = useState<string[]>(() => parseTagsParam(firstParam(params.tags)));
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
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [incomeDestOpen, setIncomeDestOpen] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<Array<{ _id: string; name: string }>>([]);
  const [bankAccountId, setBankAccountId] = useState(firstParam(params.bankAccount) || '');

  const handleReceiptDenied = useCallback(
    (reason: 'permission' | 'settings') => {
      if (reason === 'settings') {
        showConfirm({
          title: t('expenses.receipt'),
          message: t('expenses.photoPermissionSettings'),
          confirmLabel: t('expenses.openSettings'),
          cancelLabel: t('common.cancel'),
          tone: 'warning',
          onConfirm: () => {
            void Linking.openSettings();
          },
        });
        return;
      }
      showAlert({
        title: t('expenses.receipt'),
        message: t('expenses.photoPermission'),
        tone: 'warning',
      });
    },
    [showAlert, showConfirm, t]
  );

  const scanReceipt = useCallback(() => {
    showConfirm({
      title: t('expenses.photoPermissionTitle'),
      message: t('expenses.photoPermissionCamera'),
      confirmLabel: t('common.continue'),
      cancelLabel: t('common.cancel'),
      tone: 'info',
      onConfirm: async () => {
        const result = await pickReceiptImage('camera');
        if (result.ok) {
          setReceipt({ uri: result.uri });
          return;
        }
        if (result.reason === 'canceled') return;
        handleReceiptDenied(result.reason);
      },
    });
  }, [handleReceiptDenied, showConfirm, t]);

  const pickGallery = useCallback(() => {
    showConfirm({
      title: t('expenses.photoPermissionTitle'),
      message: t('expenses.photoPermissionLibrary'),
      confirmLabel: t('common.continue'),
      cancelLabel: t('common.cancel'),
      tone: 'info',
      onConfirm: async () => {
        const result = await pickReceiptImage('library');
        if (result.ok) {
          setReceipt({ uri: result.uri });
          return;
        }
        if (result.reason === 'canceled') return;
        handleReceiptDenied(result.reason);
      },
    });
  }, [handleReceiptDenied, showConfirm, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    };
    const onHide = () => setKeyboardHeight(0);
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, onShow);
    const hideSub = Keyboard.addListener(hideEvt, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const keyboardOpen = keyboardHeight > 0;

  const goBackAfterSave = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      try {
        if (router.canDismiss()) {
          router.dismiss();
          return;
        }
      } catch {
        /* older router */
      }
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/expenses');
    });
  }, [router]);

  const closeScreen = useCallback(() => {
    Keyboard.dismiss();
    try {
      if (router.canDismiss()) {
        router.dismiss();
        return;
      }
    } catch {
      /* older router */
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  }, [router]);

  const titleKey = isEditing
    ? isSavings
      ? 'expenses.editSavings'
      : isIncome
        ? 'expenses.editIncome'
        : 'expenses.editExpense'
    : isSavings
      ? 'expenses.addSavings'
      : isIncome
        ? 'expenses.addIncome'
        : 'expenses.addExpense';

  const title = t(titleKey);
  const titleParts = title.split(' ');
  const titleHead = titleParts.slice(0, -1).join(' ') || 'Add';
  const titleTail = titleParts[titleParts.length - 1] || title;
  const savingsQuote = useMemo(
    () => (isSavings ? getDailyQuote(scriptLanguage(i18n.language)) : null),
    [isSavings, i18n.language]
  );

  useEffect(() => {
    setType(paramType);
    if (paramType === 'savings') {
      setCategory('savings');
      return;
    }
    const nextCats =
      paramType === 'income'
        ? INCOME_CATEGORIES
        : EXPENSE_CATEGORIES.filter((c) => c !== 'personal');
    if (!(nextCats as readonly string[]).includes(category)) {
      setCategory(nextCats[0]);
      setCustomCategory('');
    }
  }, [paramType]);

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
    let cancelled = false;
    api
      .get('/bank-accounts')
      .then(({ data }) => {
        if (!cancelled) setBankAccounts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setBankAccounts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (paymentMethod !== 'bank') {
      setBankAccountId('');
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (!editingId) return;
    if (firstParam(params.amount)) return;
    let cancelled = false;
    setLoadingEntry(true);
    (async () => {
      try {
        const { data } = await api.get(`/transactions/${editingId}`);
        if (cancelled) return;
        setAmount(String(data.amount ?? ''));
        if (data.type) setType(resolveType(data.type));
        if (data.category) setCategory(data.category === 'personal' ? 'other' : data.category);
        const custom = data.customCategory || '';
        setCustomCategory(custom);
        setSubtypeOther(
          hasCategorySubtypes(data.category) &&
            !!custom &&
            !isKnownSubcategory(data.category, custom)
        );
        if (data.paymentMethod) setPaymentMethod(normalizePaymentMethod(data.paymentMethod) || 'cash');
        else setPaymentMethod('cash');
        if (data.bankAccount) setBankAccountId(String(data.bankAccount));
        else setBankAccountId('');
        setNote(data.note || '');
        setRecurringMonthly(Boolean(data.recurringMonthly));
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

  const selectedBankName =
    bankAccounts.find((a) => a._id === bankAccountId)?.name ||
    firstParam(params.bankAccountName) ||
    '';
  const subtypeConfig = getCategorySubtypeConfig(category);

  const displayAmount = amount
    ? formatAmount(Number(amount) || 0, i18n.language)
    : '0';

  const dateLabel = (() => {
    const now = new Date();
    if (isSameDay(txnDate, now)) return t('expenses.today');
    return txnDate.toLocaleDateString(localeForLanguage(i18n.language), {
      day: 'numeric',
      month: 'short',
    });
  })();

  const timeLabel = formatTransactionTime(txnDate, i18n.language);

  const onKey = (key: string) => {
    if (key === 'back') {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (amount.includes('.')) return;
      setAmount((prev) => (prev ? `${prev}.` : '0.'));
      return;
    }
    if (amount.replace('.', '').length >= 10) return;
    setAmount((prev) => {
      if (prev === '0' && key !== '.') return key;
      return `${prev}${key}`;
    });
  };

  const bumpAmount = (delta: number) => {
    const current = Number(amount) || 0;
    setAmount(String(current + delta));
  };

  const applyPercent = (pct: number) => {
    if (monthIncome <= 0) return;
    setAmount(String(Math.round((monthIncome * pct) / 100)));
  };

  const onPickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerMode(null);
    if (!selected) return;
    const next = new Date(txnDate);
    if (pickerMode === 'date') {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    setTxnDate(next);
  };

  const save = async () => {
    if (!amount || Number(amount) <= 0) {
      showAlert({ title: t('common.error'), message: t('expenses.invalidAmount'), tone: 'error' });
      return;
    }
    if (!txnDate || Number.isNaN(txnDate.getTime())) {
      showAlert({
        title: t('common.error'),
        message: t('expenses.dateTimeRequired'),
        tone: 'warning',
      });
      setPickerMode('date');
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
    if (!isSavings && hasCategorySubtypes(category)) {
      const config = getCategorySubtypeConfig(category)!;
      if (subtypeOther ? !customCategory.trim() : !isKnownSubcategory(category, customCategory)) {
        showAlert({
          title: t('common.error'),
          message: t(config.requiredKey),
          tone: 'warning',
        });
        return;
      }
    }
    if (!paymentMethod || !(PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
      showAlert({
        title: t('common.error'),
        message: isIncome ? t('expenses.toRequired') : t('expenses.payRequired'),
        tone: 'warning',
      });
      if (isIncome) setIncomeDestOpen(true);
      else setPayOpen(true);
      return;
    }
    if (paymentMethod === 'bank' && !bankAccountId) {
      showAlert({
        title: t('banks.title'),
        message: bankAccounts.length ? t('banks.selectRequired') : t('banks.addFirst'),
        tone: 'warning',
      });
      if (bankAccounts.length) {
        if (isIncome) setIncomeDestOpen(true);
        else setBankOpen(true);
      }
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    try {
      let receiptImage: string | undefined;
      if (receipt?.uri) {
        const token = await connectDrive();
        if (!token) {
          showAlert({
            title: t('expenses.receipt'),
            message: t('expenses.receiptNeedGoogle'),
            tone: 'warning',
          });
          setLoading(false);
          return;
        }
        receiptImage = await uploadReceiptToDrive(receipt.uri, type);
      }
      const payload = {
        type,
        amount: Number(amount),
        category: isSavings ? 'savings' : category,
        customCategory: isSavings
          ? ''
          : isOtherCategory(category) || hasCategorySubtypes(category)
            ? customCategory.trim()
            : '',
        paymentMethod,
        bankAccount: paymentMethod === 'bank' ? bankAccountId : null,
        note: note.slice(0, NOTE_MAX),
        tags,
        date: txnDate.toISOString(),
        recurringMonthly: isSavings ? false : recurringMonthly,
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
      goBackAfterSave();
    } catch (err) {
      const apiMessage =
        (err as { response?: { data?: { message?: string }; status?: number } })?.response?.data
          ?.message || '';
      const status = (err as { response?: { status?: number } })?.response?.status;
      const raw = err instanceof Error ? err.message : '';
      let message = t('expenses.saveFailed');
      if (apiMessage) {
        message = apiMessage;
      } else if (status === 401) {
        message = t('auth.sessionExpired', { defaultValue: 'Please sign in again.' });
      } else if (raw.includes('Drive') || raw.includes('Google') || apiMessage.includes('Drive')) {
        message = t('expenses.receiptUploadFailed');
      } else if (raw.includes('Network') || raw.includes('timeout')) {
        message = t('common.networkError', { defaultValue: 'Network error. Check your connection.' });
      }
      showAlert({
        title: t('common.error'),
        message,
        tone: 'error',
      });
      setLoading(false);
    }
  };

  const saveLabel = loading
    ? t('common.loading')
    : isSavings
      ? t('expenses.addSavings')
      : isIncome
        ? t('expenses.saveIncome')
        : t('expenses.saveExpense');

  const deleteEntry = () => {
    if (!editingId) return;
    const kindLabel = isSavings
      ? t('expenses.savings')
      : isIncome
        ? t('expenses.income')
        : t('expenses.expense');
    showConfirm({
      title: t('expenses.deleteTitle'),
      message: t('expenses.deleteConfirm', { kind: kindLabel }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      tone: 'error',
      destructive: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          await api.delete(`/transactions/${editingId}`);
          goBackAfterSave();
        } catch {
          setLoading(false);
          showAlert({
            title: t('common.error'),
            message: t('expenses.deleteFailed'),
            tone: 'error',
          });
        }
      },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Clears Dynamic Island / status bar on full-screen slide presentation. */}
      <View style={{ paddingTop: insets.top + 6 }}>
        <View style={[styles.topBar, styles.topBarCompact]}>
          <View style={styles.topCenter} pointerEvents="none">
            <View style={styles.headerTitleRow}>
              <AppText variant="h3" color={text} shrink>
                {titleHead}{' '}
              </AppText>
              <AppText variant="h3" color={accent} shrink>
                {titleTail}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentInner,
          {
            paddingBottom: keyboardOpen ? 8 : Math.max(insets.bottom, 16),
            marginBottom: keyboardOpen ? keyboardHeight : 0,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Amount — compact strip while typing a note */}
        {!keyboardOpen ? (
        <LinearGradient
          colors={
            isSavings
              ? ['#3F2E14', '#78350F', '#451A03']
              : isIncome
                ? ['#064E3B', '#047857', '#0F766E']
                : ['#4C0519', '#9F1239', '#BE123C']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.amountCard, { borderColor: `${accent}55`, shadowColor: accent }]}>
          <View style={styles.amountGlow} />
          <RTLRow style={styles.amountTop} gap={8}>
            <View
              style={[
                styles.currencyChip,
                { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.22)' },
              ]}>
              <AppText variant="captionBold" color={onBrand}>
                {currency.code}
              </AppText>
            </View>
            <View style={styles.amountValueRow}>
              <AppText variant="h3" color="rgba(255,255,255,0.7)" style={styles.currencySym}>
                {currency.symbol}
              </AppText>
              <AppText
                variant="h1"
                color={onBrand}
                style={styles.amountValue}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {displayAmount}
              </AppText>
              <View style={[styles.caret, { backgroundColor: onBrand }]} />
            </View>
            <Ionicons name="calculator-outline" size={20} color="rgba(255,255,255,0.85)" />
          </RTLRow>
          <View style={styles.quickRow}>
            {(isSavings ? SAVINGS_PERCENTS : QUICK_AMOUNTS).map((n) => (
              <Pressable
                key={n}
                onPress={() => (isSavings ? applyPercent(n) : bumpAmount(n))}
                style={[styles.quickPill, isSavings && monthIncome <= 0 && styles.quickPillDisabled]}>
                <AppText variant="label" color={onBrand} style={styles.quickPillText}>
                  {isSavings ? `${n}%` : `+${n >= 1000 ? `${n / 1000}k` : n}`}
                </AppText>
              </Pressable>
            ))}
          </View>
          {isSavings ? (
            <AppText variant="caption" color="rgba(255,255,255,0.72)" align="center" style={styles.savingsHint}>
              {monthIncome > 0
                ? t('expenses.basedOnIncome', {
                    amount: `${currency.symbol} ${formatAmount(monthIncome, i18n.language)}`,
                  })
                : t('expenses.noIncomeYet')}
            </AppText>
          ) : null}
        </LinearGradient>
        ) : (
          <RTLRow
            style={[styles.amountMini, { backgroundColor: card, borderColor: `${accent}40` }]}
            gap={8}>
            <AppText variant="captionBold" color={accent}>
              {currency.symbol} {displayAmount}
            </AppText>
            {!isSavings ? (
              <AppText variant="caption" color={muted} numberOfLines={1} style={{ flex: 1 }}>
                {t(`categoriesShort.${category}`, { defaultValue: t(`categories.${category}`) })}
                {' · '}
                {dateLabel}
              </AppText>
            ) : (
              <AppText variant="caption" color={muted} style={{ flex: 1 }}>
                {t('expenses.addSavings')}
              </AppText>
            )}
          </RTLRow>
        )}

        {/* Categories — filled tiles */}
        {!isSavings && !keyboardOpen ? (
          <View style={styles.catBlock}>
            <View style={styles.catGrid}>
              {categories.map((cat) => {
                const selected = category === cat;
                const color = CATEGORY_COLORS[cat] || accent;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      Keyboard.dismiss();
                      setCategory(cat);
                      setSubtypeOther(false);
                      setCustomCategory('');
                    }}
                    style={[
                      styles.catCell,
                      {
                        width: CAT_SIZE,
                        borderColor: selected ? accent : 'transparent',
                        backgroundColor: selected ? `${accent}18` : field,
                      },
                    ]}>
                    {selected ? (
                      <View style={[styles.checkBadge, { backgroundColor: accent }]}>
                        <Ionicons name="checkmark" size={8} color={onBrand} />
                      </View>
                    ) : null}
                    <View style={[styles.catIcon, { backgroundColor: `${color}28` }]}>
                      <Ionicons name={CATEGORY_ICONS[cat] || 'ellipse'} size={14} color={color} />
                    </View>
                    <AppText
                      variant="captionBold"
                      color={text}
                      align="center"
                      numberOfLines={1}
                      style={styles.catLabel}>
                      {t(`categoriesShort.${cat}`, { defaultValue: t(`categories.${cat}`) })}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {subtypeConfig ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.billChipRow}
                keyboardShouldPersistTaps="handled">
                {subtypeConfig.options.map((sub) => {
                  const selected = !subtypeOther && customCategory === sub;
                  return (
                    <Pressable
                      key={sub}
                      onPress={() => {
                        setSubtypeOther(false);
                        setCustomCategory(sub);
                      }}
                      style={[
                        styles.billChip,
                        {
                          borderColor: selected ? accent : border,
                          backgroundColor: selected ? `${accent}18` : field,
                        },
                      ]}>
                      <AppText
                        variant="captionBold"
                        color={selected ? accent : soft}
                        numberOfLines={1}
                        style={styles.billChipText}>
                        {t(`${subtypeConfig.i18nKey}.${sub}`)}
                      </AppText>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => {
                    setSubtypeOther(true);
                    if (isKnownSubcategory(category, customCategory)) setCustomCategory('');
                  }}
                  style={[
                    styles.billChip,
                    {
                      borderColor: subtypeOther ? accent : border,
                      backgroundColor: subtypeOther ? `${accent}18` : field,
                    },
                  ]}>
                  <AppText
                    variant="captionBold"
                    color={subtypeOther ? accent : soft}
                    numberOfLines={1}
                    style={styles.billChipText}>
                    {t(`${subtypeConfig.i18nKey}.other`)}
                  </AppText>
                </Pressable>
              </ScrollView>
            ) : null}

            {subtypeConfig && subtypeOther ? (
              <TextInput
                style={[styles.customInput, { borderColor: border, backgroundColor: field, color: text }]}
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder={t(subtypeConfig.otherPlaceholderKey)}
                placeholderTextColor={muted}
              />
            ) : null}

            {isOtherCategory(category) ? (
              <TextInput
                style={[styles.customInput, { borderColor: border, backgroundColor: field, color: text }]}
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder={t('expenses.customCategoryPlaceholder')}
                placeholderTextColor={muted}
              />
            ) : null}
          </View>
        ) : null}

        {/* Date / Time / Payment — outlined pills on strip */}
        {!keyboardOpen ? (
        <View style={[styles.metaStrip, { backgroundColor: card, borderColor: border }]}>
          <RTLRow style={styles.metaRow} gap={4}>
            <Pressable
              onPress={() => setPickerMode('date')}
              style={[styles.metaChip, { borderColor: border }]}>
              <View style={[styles.metaIconWrap, { backgroundColor: `${accent}22` }]}>
                <Ionicons name="calendar-outline" size={11} color={accent} />
              </View>
              <View style={styles.metaCopy}>
                <AppText variant="caption" color={muted} numberOfLines={1} style={styles.metaHint}>
                  {t('expenses.date')} *
                </AppText>
                <AppText variant="captionBold" color={text} numberOfLines={1} style={styles.metaValue}>
                  {dateLabel}
                </AppText>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setPickerMode('time')}
              style={[styles.metaChip, { borderColor: border }]}>
              <View style={[styles.metaIconWrap, { backgroundColor: `${accent}22` }]}>
                <Ionicons name="time-outline" size={11} color={accent} />
              </View>
              <View style={styles.metaCopy}>
                <AppText variant="caption" color={muted} numberOfLines={1} style={styles.metaHint}>
                  {t('expenses.time')} *
                </AppText>
                <AppText variant="captionBold" color={text} numberOfLines={1} style={styles.metaValue}>
                  {timeLabel}
                </AppText>
              </View>
            </Pressable>
            {isIncome ? (
              <Pressable
                onPress={() => setIncomeDestOpen(true)}
                style={[
                  styles.metaChip,
                  { borderColor: paymentMethod ? border : accent },
                ]}>
                <View style={[styles.metaIconWrap, { backgroundColor: `${accent}22`, overflow: 'hidden' }]}>
                  {paymentMethod === 'bank' && selectedBankName ? (
                    <BankLogo name={selectedBankName} size={18} />
                  ) : paymentMethod === 'cash' ? (
                    <Ionicons name="wallet" size={11} color={accent} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={11} color={accent} />
                  )}
                </View>
                <View style={styles.metaCopy}>
                  <AppText variant="caption" color={muted} numberOfLines={1} style={styles.metaHint}>
                    {t('expenses.toShort')} *
                  </AppText>
                  <AppText variant="captionBold" color={text} numberOfLines={1} style={styles.metaValue}>
                    {paymentMethod === 'bank'
                      ? selectedBankName || t('banks.selectShort')
                      : paymentMethod === 'cash'
                        ? t('paymentMethods.cash')
                        : t('expenses.selectRequired')}
                  </AppText>
                </View>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={() => setPayOpen(true)}
                  style={[
                    styles.metaChip,
                    { borderColor: paymentMethod ? border : accent },
                  ]}>
                  <View style={[styles.metaIconWrap, { backgroundColor: `${accent}22` }]}>
                    <Ionicons name={PAYMENT_ICONS[paymentMethod] || 'wallet'} size={11} color={accent} />
                  </View>
                  <View style={styles.metaCopy}>
                    <AppText variant="caption" color={muted} numberOfLines={1} style={styles.metaHint}>
                      {isSavings ? t('expenses.fromShort') : t('expenses.payShort')} *
                    </AppText>
                    <AppText variant="captionBold" color={text} numberOfLines={1} style={styles.metaValue}>
                      {paymentMethod
                        ? t(`paymentMethods.${paymentMethod}`)
                        : t('expenses.selectRequired')}
                    </AppText>
                  </View>
                </Pressable>
                {paymentMethod === 'bank' ? (
                  <Pressable
                    onPress={() => {
                      if (!bankAccounts.length) {
                        showAlert({
                          title: t('banks.title'),
                          message: t('banks.addFirst'),
                          tone: 'warning',
                        });
                        return;
                      }
                      setBankOpen(true);
                    }}
                    style={[
                      styles.metaChip,
                      { borderColor: selectedBankName ? border : accent },
                    ]}>
                    <View style={[styles.metaIconWrap, { backgroundColor: `${accent}22`, overflow: 'hidden' }]}>
                      {selectedBankName ? (
                        <BankLogo name={selectedBankName} size={18} />
                      ) : (
                        <Ionicons name="business-outline" size={11} color={accent} />
                      )}
                    </View>
                    <View style={styles.metaCopy}>
                      <AppText variant="caption" color={muted} numberOfLines={1} style={styles.metaHint}>
                        {t('banks.account')} *
                      </AppText>
                      <AppText variant="captionBold" color={text} numberOfLines={1} style={styles.metaValue}>
                        {selectedBankName || t('banks.selectShort')}
                      </AppText>
                    </View>
                  </Pressable>
                ) : null}
              </>
            )}
          </RTLRow>
        </View>
        ) : null}

        {/* Savings tip — compact, no flex fill */}
        {isSavings && savingsQuote && !keyboardOpen ? (
          <View style={styles.quoteArea}>
            <LinearGradient
              colors={['#3F2E14', '#78350F', '#451A03']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quoteCard}>
              <View style={styles.quoteIcon}>
                <Ionicons name="sparkles" size={14} color="#FDE68A" />
              </View>
              <AppText variant="captionBold" color="#FDE68A" style={styles.quoteLabel}>
                {t('dashboard.motivation')}
              </AppText>
              <AppText
                variant="caption"
                color="rgba(255,255,255,0.9)"
                align="center"
                style={styles.quoteText}
                numberOfLines={3}>
                “{savingsQuote.text}”
              </AppText>
              {savingsQuote.source ? (
                <AppText variant="caption" color="rgba(255,255,255,0.45)" align="center" style={styles.quoteSource} numberOfLines={1}>
                  — {savingsQuote.source}
                </AppText>
              ) : null}
            </LinearGradient>
          </View>
        ) : null}

        {!isSavings ? (
          <RTLRow style={styles.attachRow} gap={8}>
            {receipt?.uri ? (
              <View style={[styles.photoPreview, { borderColor: border }]}>
                <Image source={{ uri: receipt.uri }} style={styles.photoImg} />
                <Pressable onPress={() => setReceipt(null)} style={styles.photoRemove}>
                  <Ionicons name="close" size={11} color={onBrand} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickGallery}
                onLongPress={scanReceipt}
                style={[styles.addPhoto, { borderColor: `${accent}55`, backgroundColor: well }]}>
                <Ionicons name="camera-outline" size={18} color={accent} />
              </Pressable>
            )}
            <View style={[styles.noteBox, { borderBottomColor: border, backgroundColor: field }]}>
              <TextInput
                style={[styles.noteInput, { color: text }]}
                value={note}
                onChangeText={(v) => setNote(v.slice(0, NOTE_MAX))}
                placeholder={t('expenses.noteShort')}
                placeholderTextColor={muted}
                multiline
                maxLength={NOTE_MAX}
                blurOnSubmit
                returnKeyType="done"
              />
            </View>
          </RTLRow>
        ) : (
          <View style={[styles.noteBox, styles.savingsNote, { borderBottomColor: border, backgroundColor: field }]}>
            <Ionicons name="bookmark-outline" size={14} color={accent} style={styles.savingsNoteIcon} />
            <TextInput
              style={[styles.noteInput, { color: text }]}
              value={note}
              onChangeText={(v) => setNote(v.slice(0, NOTE_MAX))}
              placeholder={t('expenses.savingsNotePlaceholder')}
              placeholderTextColor={muted}
              maxLength={NOTE_MAX}
              returnKeyType="done"
              blurOnSubmit
            />
          </View>
        )}

        {!isSavings ? (
          <Pressable
            onPress={() => setRecurringMonthly((v) => !v)}
            style={[styles.recurringRow, { borderColor: border, backgroundColor: field }]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: recurringMonthly }}>
            <View style={[styles.recurringCheck, { borderColor: accent, backgroundColor: recurringMonthly ? accent : 'transparent' }]}>
              {recurringMonthly ? <Ionicons name="checkmark" size={14} color={onBrand} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodySemibold" color={text}>
                {t('expenses.repeatMonthly')}
              </AppText>
              <AppText variant="caption" color={muted}>
                {t('expenses.repeatMonthlyHint')}
              </AppText>
            </View>
          </Pressable>
        ) : null}

        {!keyboardOpen ? (
          <View style={[styles.keypadTray, { backgroundColor: card, borderColor: border }]}>
            {(
              [
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['.', '0', 'back'],
              ] as const
            ).map((row) => (
              <View key={row.join('-')} style={styles.keyRow}>
                {row.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => onKey(key)}
                    style={({ pressed }) => [
                      styles.key,
                      { backgroundColor: field },
                      pressed && { backgroundColor: well },
                    ]}>
                    {key === 'back' ? (
                      <Ionicons name="backspace-outline" size={18} color={soft} />
                    ) : (
                      <AppText variant="h3" color={text} style={styles.keyText}>
                        {key}
                      </AppText>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footerActions}>
          <Pressable
            onPress={closeScreen}
            disabled={loading || loadingEntry}
            style={({ pressed }) => [
              styles.cancelBtn,
              { borderColor: border, backgroundColor: field, opacity: pressed ? 0.88 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}>
            <AppText variant="button" color={text}>
              {t('common.cancel')}
            </AppText>
          </Pressable>
          <Pressable
            onPress={save}
            disabled={loading || loadingEntry}
            style={({ pressed }) => [{ flex: 1.4, opacity: pressed ? 0.9 : 1 }]}>
            <LinearGradient
              colors={[...gradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.saveBtn, (loading || loadingEntry) && { opacity: 0.65 }]}>
              <RTLRow gap={6} style={{ justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle" size={16} color={onBrand} />
                <AppText variant="button" color={onBrand} style={styles.saveBtnLabel}>
                  {saveLabel}
                </AppText>
              </RTLRow>
            </LinearGradient>
          </Pressable>
        </View>
        {isEditing ? (
          <Pressable
            onPress={deleteEntry}
            disabled={loading || loadingEntry}
            style={({ pressed }) => [
              styles.deleteBtn,
              { borderColor: Brand.danger },
              pressed && { opacity: 0.85 },
              (loading || loadingEntry) && { opacity: 0.5 },
            ]}>
            <RTLRow gap={8} style={{ justifyContent: 'center' }}>
              <Ionicons name="trash-outline" size={18} color={Brand.danger} />
              <AppText variant="button" color={Brand.danger}>
                {t('common.delete')}
              </AppText>
            </RTLRow>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Date / time picker */}
      {pickerMode && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setPickerMode(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerMode(null)} />
          <View style={[styles.modalSheet, { backgroundColor: card, paddingBottom: insets.bottom + 12 }]}>
            <RTLRow style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <AppText variant="bodySemibold" color={text}>
                {pickerMode === 'date' ? t('expenses.date') : t('expenses.time')}
              </AppText>
              <Pressable onPress={() => setPickerMode(null)} hitSlop={10}>
                <AppText variant="captionBold" color={accent}>
                  {t('common.done')}
                </AppText>
              </Pressable>
            </RTLRow>
            <DateTimePicker
              value={txnDate}
              mode={pickerMode}
              display="spinner"
              onChange={onPickerChange}
              themeVariant={isDark ? 'dark' : 'light'}
              maximumDate={pickerMode === 'date' ? new Date() : undefined}
            />
          </View>
        </Modal>
      ) : null}
      {pickerMode && Platform.OS === 'android' ? (
        <DateTimePicker
          value={txnDate}
          mode={pickerMode}
          display="default"
          onChange={onPickerChange}
          maximumDate={pickerMode === 'date' ? new Date() : undefined}
        />
      ) : null}

      {/* Payment picker */}
      <Modal transparent animationType="fade" visible={payOpen} onRequestClose={() => setPayOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPayOpen(false)} />
        <View style={[styles.paySheet, { backgroundColor: card, borderColor: border, paddingBottom: insets.bottom + 16 }]}>
          <RTLRow style={styles.sheetHeader} gap={8}>
            <AppText variant="bodySemibold" color={text} style={{ flex: 1 }}>
              {t('expenses.paymentMethod')}
            </AppText>
            <Pressable
              onPress={() => setPayOpen(false)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}>
              <Ionicons name="close" size={22} color={muted} />
            </Pressable>
          </RTLRow>
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method;
            return (
              <Pressable
                key={method}
                onPress={() => {
                  setPaymentMethod(method);
                  setPayOpen(false);
                  if (method === 'bank') {
                    if (!bankAccounts.length) {
                      showAlert({
                        title: t('banks.title'),
                        message: t('banks.addFirst'),
                        tone: 'warning',
                      });
                      return;
                    }
                    setBankOpen(true);
                  }
                }}
                style={[
                  styles.payRow,
                  { borderColor: border },
                  selected && { borderColor: accent, backgroundColor: `${accent}14` },
                ]}>
                <Ionicons name={PAYMENT_ICONS[method]} size={18} color={selected ? accent : muted} />
                <AppText variant="bodySemibold" color={selected ? text : muted} style={{ flex: 1 }}>
                  {t(`paymentMethods.${method}`)}
                </AppText>
                {selected ? <Ionicons name="checkmark-circle" size={18} color={accent} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>

      <Modal transparent animationType="fade" visible={bankOpen} onRequestClose={() => setBankOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setBankOpen(false)} />
        <View style={[styles.paySheet, { backgroundColor: card, borderColor: border, paddingBottom: insets.bottom + 16 }]}>
          <RTLRow style={styles.sheetHeader} gap={8}>
            <AppText variant="bodySemibold" color={text} style={{ flex: 1 }}>
              {t('banks.select')}
            </AppText>
            <Pressable
              onPress={() => setBankOpen(false)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}>
              <Ionicons name="close" size={22} color={muted} />
            </Pressable>
          </RTLRow>
          {bankAccounts.map((account) => {
            const selected = bankAccountId === account._id;
            return (
              <Pressable
                key={account._id}
                onPress={() => {
                  setBankAccountId(account._id);
                  setBankOpen(false);
                }}
                style={[
                  styles.payRow,
                  { borderColor: border },
                  selected && { borderColor: accent, backgroundColor: `${accent}14` },
                ]}>
                <BankLogo name={account.name} size={28} />
                <AppText variant="bodySemibold" color={selected ? text : muted} style={{ flex: 1 }}>
                  {account.name}
                </AppText>
                {selected ? <Ionicons name="checkmark-circle" size={18} color={accent} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={incomeDestOpen}
        onRequestClose={() => setIncomeDestOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIncomeDestOpen(false)} />
        <View style={[styles.paySheet, { backgroundColor: card, borderColor: border, paddingBottom: insets.bottom + 16 }]}>
          <RTLRow style={styles.sheetHeader} gap={8}>
            <AppText variant="bodySemibold" color={text} style={{ flex: 1 }}>
              {t('expenses.receivedIn')}
            </AppText>
            <Pressable
              onPress={() => setIncomeDestOpen(false)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}>
              <Ionicons name="close" size={22} color={muted} />
            </Pressable>
          </RTLRow>
          <Pressable
            onPress={() => {
              setPaymentMethod('cash');
              setBankAccountId('');
              setIncomeDestOpen(false);
            }}
            style={[
              styles.payRow,
              { borderColor: border },
              paymentMethod === 'cash' && { borderColor: accent, backgroundColor: `${accent}14` },
            ]}>
            <BankLogo name="Cash" size={28} cash />
            <AppText
              variant="bodySemibold"
              color={paymentMethod === 'cash' ? text : muted}
              style={{ flex: 1 }}>
              {t('paymentMethods.cash')}
            </AppText>
            {paymentMethod === 'cash' ? <Ionicons name="checkmark-circle" size={18} color={accent} /> : null}
          </Pressable>
          {bankAccounts.length === 0 ? (
            <AppText variant="caption" color={muted} style={{ marginTop: 4, marginBottom: 8 }}>
              {t('banks.addFirst')}
            </AppText>
          ) : (
            bankAccounts.map((account) => {
              const selected = paymentMethod === 'bank' && bankAccountId === account._id;
              return (
                <Pressable
                  key={account._id}
                  onPress={() => {
                    setPaymentMethod('bank');
                    setBankAccountId(account._id);
                    setIncomeDestOpen(false);
                  }}
                  style={[
                    styles.payRow,
                    { borderColor: border },
                    selected && { borderColor: accent, backgroundColor: `${accent}14` },
                  ]}>
                  <BankLogo name={account.name} size={28} />
                  <AppText variant="bodySemibold" color={selected ? text : muted} style={{ flex: 1 }}>
                    {account.name}
                  </AppText>
                  {selected ? <Ionicons name="checkmark-circle" size={18} color={accent} /> : null}
                </Pressable>
              );
            })
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 4,
    minHeight: 44,
    position: 'relative',
    zIndex: 2,
  },
  topBarCompact: {
    minHeight: 40,
    paddingBottom: 2,
  },
  topCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: H_PAD,
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: H_PAD,
  },
  contentInner: {
    flexGrow: 1,
    justifyContent: 'space-evenly',
    paddingTop: 2,
  },
  amountMini: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  headerSubtitle: {
    marginTop: 2,
    width: '100%',
    textAlign: 'center',
  },
  amountCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 0,
    minHeight: COMPACT ? 108 : 120,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  amountGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -60,
    right: -40,
  },
  amountTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 44,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  amountValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: AMOUNT_SIZE + 4,
  },
  currencySym: {
    marginTop: 4,
    fontSize: 18,
  },
  amountValue: {
    fontSize: AMOUNT_SIZE,
    lineHeight: AMOUNT_SIZE + 6,
    fontWeight: '700',
    letterSpacing: -1,
    maxWidth: '72%',
    textAlign: 'center',
  },
  caret: {
    width: 2.5,
    height: AMOUNT_SIZE * 0.72,
    borderRadius: 1,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickPillDisabled: {
    opacity: 0.45,
  },
  savingsHint: {
    marginTop: 10,
    fontSize: 11,
  },
  savingsNote: {
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    height: ATTACH_H,
  },
  savingsNoteIcon: {
    marginRight: 8,
  },
  catBlock: {
    gap: 8,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 0,
  },
  catCell: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 2,
    alignItems: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  catIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  catLabel: { fontSize: 11, lineHeight: 13, width: '100%', fontWeight: '700' },
  billChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  billChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  billChipText: {
    fontSize: 12,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 13,
  },
  metaStrip: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    marginBottom: 0,
  },
  metaRow: {
    alignItems: 'stretch',
  },
  metaChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  metaIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCopy: {
    flex: 1,
    minWidth: 0,
  },
  metaHint: { fontSize: 8, lineHeight: 10, marginBottom: 0 },
  metaValue: { fontSize: 10, lineHeight: 12 },
  attachRow: {
    marginBottom: 0,
    alignItems: 'stretch',
  },
  addPhoto: {
    width: ATTACH_H,
    height: ATTACH_H,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    width: ATTACH_H,
    height: ATTACH_H,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBox: {
    flex: 1,
    height: ATTACH_H,
    borderRadius: 14,
    borderWidth: 0,
    borderBottomWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteInput: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: 'top',
    padding: 0,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  recurringCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexSpacer: {
    height: 0,
  },
  quoteArea: {
    marginBottom: 4,
  },
  quoteCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.22)',
  },
  quoteIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(251,191,36,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quoteLabel: {
    marginBottom: 4,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  quoteText: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  quoteSource: {
    marginTop: 6,
    fontSize: 10,
  },
  keypadTray: {
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: 16,
    borderWidth: 1,
    padding: KEYPAD_INSET,
    marginBottom: 0,
    gap: KEY_GAP,
  },
  keyRow: {
    flexDirection: 'row',
    gap: KEY_GAP,
  },
  key: {
    flex: 1,
    height: KEY_H,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 18,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 10,
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveBtnLabel: {
    fontSize: 15,
  },
  deleteBtn: {
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  paySheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
});
