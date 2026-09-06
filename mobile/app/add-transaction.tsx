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
import { isOtherCategory } from '@/lib/category';
import { useAuth } from '@/context/AuthContext';
import { getCurrency } from '@/constants/currencies';
import { ensureGoogleAccessToken } from '@/lib/googleAuth';
import { uploadReceiptToDrive } from '@/lib/googleDrive';
import { formatAmount, formatTransactionTime } from '@/lib/format';
import { localeForLanguage, scriptLanguage } from '@/lib/language';
import { getDailyQuote } from '@/lib/dailyQuotes';

const BG = '#0A0F0E';
const CARD = '#141A19';
const CARD_BORDER = 'rgba(255,255,255,0.08)';
const MUTED = 'rgba(255,255,255,0.55)';
const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const H_PAD = 14;
/** Equal left/right header slots so title stays true-center (Scan vs back). */
const HEADER_SIDE = 84;
const GRID_COLS = 5;
const GRID_GAP = 6;
const CAT_SIZE = Math.floor((SCREEN_W - H_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);
/** Scale down below the amount card so the form stays on one screen */
const COMPACT = SCREEN_H < 820;
const KEY_H = COMPACT ? 40 : 44;
const KEY_GAP = 6;
const KEYPAD_INSET = 8;
const ATTACH_H = COMPACT ? 64 : 72;
/** Amount card stays full-size (never compacted) */
const AMOUNT_SIZE = 44;
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
  jazzcash: 'phone-portrait',
  easypaisa: 'phone-portrait',
  card: 'card',
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
  const { showAlert } = useDialog();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialPayment && (PAYMENT_METHODS as readonly string[]).includes(initialPayment)
      ? initialPayment
      : 'cash'
  );
  const [note, setNote] = useState(firstParam(params.note) || '');
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

  const scanReceipt = useCallback(async () => {
    const result = await pickReceiptImage('camera');
    if (!result) {
      showAlert({
        title: t('expenses.receipt'),
        message: t('expenses.photoPermission'),
        tone: 'warning',
      });
      return;
    }
    if (result.canceled || !result.assets[0]?.uri) return;
    setReceipt({ uri: result.assets[0].uri });
  }, [showAlert, t]);

  const pickGallery = useCallback(async () => {
    const result = await pickReceiptImage('library');
    if (!result) {
      showAlert({
        title: t('expenses.receipt'),
        message: t('expenses.photoPermission'),
        tone: 'warning',
      });
      return;
    }
    if (result.canceled || !result.assets[0]?.uri) return;
    setReceipt({ uri: result.assets[0].uri });
  }, [showAlert, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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
  const titleTagline = isSavings
    ? t('expenses.savingsNotSpending')
    : isIncome
      ? t('expenses.incomeTagline')
      : t('expenses.simpleTagline');
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
        note: note.slice(0, NOTE_MAX),
        tags,
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
        message:
          message.includes('Drive') || message.includes('Google')
            ? t('expenses.receiptUploadFailed')
            : t('expenses.saveFailed'),
        tone: 'error',
      });
    } finally {
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

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* In-screen header — title absolute-centered on screen */}
      <View style={{ paddingTop: Math.max(insets.top, 8) }}>
        <View style={styles.topBar}>
          <View style={styles.topCenter} pointerEvents="none">
            <View style={styles.headerTitleRow}>
              <AppText variant="h3" color="#FFFFFF" shrink>
                {titleHead}{' '}
              </AppText>
              <AppText variant="h3" color={accent} shrink>
                {titleTail}
              </AppText>
            </View>
            <AppText variant="caption" color={MUTED} numberOfLines={1} align="center" style={styles.headerSubtitle}>
              {titleTagline}
            </AppText>
          </View>
          <View style={styles.topSide}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              hitSlop={10}
              style={styles.headerBackBtn}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={[styles.topSide, styles.topSideEnd]}>
            {!isSavings ? (
              <Pressable onPress={scanReceipt} hitSlop={8} style={[styles.scanChip, { borderColor: `${accent}66` }]}>
                <Ionicons name="document-text-outline" size={15} color={accent} />
                <AppText variant="captionBold" color={accent} shrink>
                  {t('expenses.scanShort')}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Amount */}
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
              <AppText variant="captionBold" color="#FFFFFF">
                {currency.code}
              </AppText>
            </View>
            <View style={styles.amountValueRow}>
              <AppText variant="h3" color="rgba(255,255,255,0.7)" style={styles.currencySym}>
                {currency.symbol}
              </AppText>
              <AppText
                variant="h1"
                color="#FFFFFF"
                style={styles.amountValue}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {displayAmount}
              </AppText>
              <View style={[styles.caret, { backgroundColor: '#FFFFFF' }]} />
            </View>
            <Ionicons name="calculator-outline" size={20} color="rgba(255,255,255,0.85)" />
          </RTLRow>
          <View style={styles.quickRow}>
            {(isSavings ? SAVINGS_PERCENTS : QUICK_AMOUNTS).map((n) => (
              <Pressable
                key={n}
                onPress={() => (isSavings ? applyPercent(n) : bumpAmount(n))}
                style={[styles.quickPill, isSavings && monthIncome <= 0 && styles.quickPillDisabled]}>
                <AppText variant="label" color="#FFFFFF" style={styles.quickPillText}>
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

        {/* Categories — filled tiles */}
        {!isSavings ? (
          <View style={styles.catGrid}>
            {categories.map((cat) => {
              const selected = category === cat;
              const color = CATEGORY_COLORS[cat] || accent;
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setCategory(cat);
                    if (!isOtherCategory(cat)) setCustomCategory('');
                  }}
                  style={[
                    styles.catCell,
                    {
                      width: CAT_SIZE,
                      borderColor: selected ? accent : 'transparent',
                      backgroundColor: selected ? `${accent}18` : '#171E1C',
                    },
                  ]}>
                  {selected ? (
                    <View style={[styles.checkBadge, { backgroundColor: accent }]}>
                      <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                    </View>
                  ) : null}
                  <View style={[styles.catIcon, { backgroundColor: `${color}28` }]}>
                    <Ionicons name={CATEGORY_ICONS[cat] || 'ellipse'} size={16} color={color} />
                  </View>
                  <AppText
                    variant="captionBold"
                    color={selected ? '#FFFFFF' : MUTED}
                    align="center"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    style={styles.catLabel}>
                    {t(`categoriesShort.${cat}`, { defaultValue: t(`categories.${cat}`) })}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!isSavings && isOtherCategory(category) ? (
          <TextInput
            style={styles.customInput}
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder={t('expenses.customCategoryPlaceholder')}
            placeholderTextColor={MUTED}
          />
        ) : null}

        {/* Date / Time / Payment — outlined pills on strip */}
        <View style={styles.metaStrip}>
          <RTLRow style={styles.metaRow} gap={6}>
            <Pressable onPress={() => setPickerMode('date')} style={styles.metaChip}>
              <View style={[styles.metaIconWrap, { backgroundColor: `${accent}22` }]}>
                <Ionicons name="calendar-outline" size={13} color={accent} />
              </View>
              <View style={styles.metaCopy}>
                <AppText variant="caption" color={MUTED} numberOfLines={1} style={styles.metaHint}>
                  {t('expenses.date')}
                </AppText>
                <AppText variant="captionBold" color="#FFFFFF" numberOfLines={1}>
                  {dateLabel}
                </AppText>
              </View>
            </Pressable>
            <Pressable onPress={() => setPickerMode('time')} style={styles.metaChip}>
              <View style={[styles.metaIconWrap, { backgroundColor: `${accent}22` }]}>
                <Ionicons name="time-outline" size={13} color={accent} />
              </View>
              <View style={styles.metaCopy}>
                <AppText variant="caption" color={MUTED} numberOfLines={1} style={styles.metaHint}>
                  {t('expenses.time')}
                </AppText>
                <AppText variant="captionBold" color="#FFFFFF" numberOfLines={1}>
                  {timeLabel}
                </AppText>
              </View>
            </Pressable>
            {!isIncome ? (
              <Pressable onPress={() => setPayOpen(true)} style={styles.metaChip}>
                <View style={[styles.metaIconWrap, { backgroundColor: `${accent}22` }]}>
                  <Ionicons name={PAYMENT_ICONS[paymentMethod] || 'wallet'} size={13} color={accent} />
                </View>
                <View style={styles.metaCopy}>
                  <AppText variant="caption" color={MUTED} numberOfLines={1} style={styles.metaHint}>
                    {isSavings ? t('expenses.fromShort') : t('expenses.payShort')}
                  </AppText>
                  <AppText variant="captionBold" color="#FFFFFF" numberOfLines={1}>
                    {t(`paymentMethods.${paymentMethod}`)}
                  </AppText>
                </View>
              </Pressable>
            ) : null}
          </RTLRow>
        </View>

        {/* Photo + Note — dashed attach + inset field */}
        {!isSavings ? (
          <RTLRow style={styles.attachRow} gap={8}>
            {receipt?.uri ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: receipt.uri }} style={styles.photoImg} />
                <Pressable onPress={() => setReceipt(null)} style={styles.photoRemove}>
                  <Ionicons name="close" size={11} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickGallery}
                onLongPress={scanReceipt}
                style={[styles.addPhoto, { borderColor: `${accent}55` }]}>
                <Ionicons name="camera-outline" size={20} color={accent} />
              </Pressable>
            )}
            <View style={styles.noteBox}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={(v) => setNote(v.slice(0, NOTE_MAX))}
                placeholder={t('expenses.noteShort')}
                placeholderTextColor={MUTED}
                multiline
                maxLength={NOTE_MAX}
              />
            </View>
          </RTLRow>
        ) : (
          <View style={[styles.noteBox, styles.savingsNote]}>
            <Ionicons name="bookmark-outline" size={16} color={accent} style={styles.savingsNoteIcon} />
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={(v) => setNote(v.slice(0, NOTE_MAX))}
              placeholder={t('expenses.savingsNotePlaceholder')}
              placeholderTextColor={MUTED}
              maxLength={NOTE_MAX}
              returnKeyType="done"
              blurOnSubmit
            />
          </View>
        )}

        {/* Daily savings quote fills leftover space */}
        {isSavings && savingsQuote ? (
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
                numberOfLines={4}>
                “{savingsQuote.text}”
              </AppText>
              {savingsQuote.source ? (
                <AppText variant="caption" color="rgba(255,255,255,0.45)" align="center" style={styles.quoteSource} numberOfLines={1}>
                  — {savingsQuote.source}
                </AppText>
              ) : null}
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.flexSpacer} />
        )}

        {/* Keypad — fixed size (same on all types) */}
        <View style={styles.keypadTray}>
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
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
                  {key === 'back' ? (
                    <Ionicons name="backspace-outline" size={20} color="#E2E8F0" />
                  ) : (
                    <AppText variant="h3" color="#F8FAFC" style={styles.keyText}>
                      {key}
                    </AppText>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <Pressable
          onPress={save}
          disabled={loading || loadingEntry}
          style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
          <LinearGradient
            colors={[...gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, (loading || loadingEntry) && { opacity: 0.65 }]}>
            <RTLRow gap={8} style={{ justifyContent: 'center' }}>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <AppText variant="button" color="#FFFFFF">
                {saveLabel}
              </AppText>
            </RTLRow>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Date / time picker */}
      {pickerMode && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setPickerMode(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerMode(null)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
            <RTLRow style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <AppText variant="bodySemibold" color="#FFFFFF">
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
              themeVariant="dark"
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
        <View style={[styles.paySheet, { paddingBottom: insets.bottom + 16 }]}>
          <AppText variant="bodySemibold" color="#FFFFFF" style={{ marginBottom: 12 }}>
            {t('expenses.paymentMethod')}
          </AppText>
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method;
            return (
              <Pressable
                key={method}
                onPress={() => {
                  setPaymentMethod(method);
                  setPayOpen(false);
                }}
                style={[styles.payRow, selected && { borderColor: accent, backgroundColor: `${accent}14` }]}>
                <Ionicons name={PAYMENT_ICONS[method]} size={18} color={selected ? accent : MUTED} />
                <AppText variant="bodySemibold" color={selected ? '#FFFFFF' : MUTED} style={{ flex: 1 }}>
                  {t(`paymentMethods.${method}`)}
                </AppText>
                {selected ? <Ionicons name="checkmark-circle" size={18} color={accent} /> : null}
              </Pressable>
            );
          })}
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
    paddingHorizontal: 8,
    paddingBottom: 6,
    minHeight: 56,
    position: 'relative',
    zIndex: 2,
  },
  topSide: {
    width: HEADER_SIDE,
    justifyContent: 'center',
    zIndex: 2,
  },
  topSideEnd: {
    alignItems: 'flex-end',
  },
  topCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: HEADER_SIDE,
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: H_PAD,
    paddingTop: 4,
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
  headerBackBtn: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  amountCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  amountGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -55,
    right: -35,
  },
  amountTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    minHeight: 52,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
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
    marginTop: 6,
    fontSize: 20,
  },
  amountValue: {
    fontSize: AMOUNT_SIZE,
    lineHeight: AMOUNT_SIZE + 8,
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
    gap: 8,
  },
  quickPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  quickPillText: {
    fontSize: 13,
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
    marginBottom: 10,
    height: 52,
  },
  savingsNoteIcon: {
    marginRight: 8,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 10,
  },
  catCell: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  catIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  catLabel: { fontSize: 9, width: '100%' },
  customInput: {
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#0F172A',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    marginBottom: 8,
    fontSize: 13,
  },
  metaStrip: {
    backgroundColor: '#101614',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 6,
    marginBottom: 10,
  },
  metaRow: {
    alignItems: 'stretch',
  },
  metaChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  metaIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCopy: {
    flex: 1,
    minWidth: 0,
  },
  metaHint: { fontSize: 9, marginBottom: 1 },
  attachRow: {
    marginBottom: 10,
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
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  photoPreview: {
    width: ATTACH_H,
    height: ATTACH_H,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER,
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
    borderBottomColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: 'top',
    padding: 0,
  },
  flexSpacer: {
    flex: 1,
    minHeight: 4,
  },
  quoteArea: {
    flex: 1,
    minHeight: 72,
    justifyContent: 'center',
    marginBottom: 8,
  },
  quoteCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    backgroundColor: '#020617',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: KEYPAD_INSET,
    marginBottom: 8,
    gap: KEY_GAP,
  },
  keyRow: {
    flexDirection: 'row',
    gap: KEY_GAP,
  },
  key: {
    flex: 1,
    height: KEY_H,
    borderRadius: 12,
    backgroundColor: '#1A2220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: '#24302D',
  },
  keyText: {
    fontSize: 22,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 2,
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
    backgroundColor: '#121816',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  paySheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#121816',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    marginBottom: 8,
  },
});
