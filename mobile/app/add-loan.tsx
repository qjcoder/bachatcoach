import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/lib/api';
import { AppText } from '@/components/AppText';
import { RTLRow } from '@/components/RTLRow';
import { useDialog } from '@/context/DialogContext';
import { useAuth } from '@/context/AuthContext';
import { getCurrency } from '@/constants/currencies';
import { Radius, Spacing, TxnKind, TxnKindSoft, txnKindGradientDeep } from '@/constants/theme';
import { formatAmount } from '@/lib/format';
import { getContactName } from '@/lib/contact';
import { contactMatchesQuery, phoneKey } from '@/lib/phone';

const BG = '#0A0F0E';
const CARD = '#141A19';
const CARD_BORDER = 'rgba(255,255,255,0.08)';
const MUTED = 'rgba(255,255,255,0.55)';
const H_PAD = 14;
const HEADER_SIDE = 52;
const SCREEN_H = Dimensions.get('window').height;
const COMPACT = SCREEN_H < 820;
const QUICK_AMOUNTS = [500, 1000, 5000, 10000] as const;
const KEY_H = COMPACT ? 38 : 42;
const KEY_GAP = 5;
const AMOUNT_SIZE = COMPACT ? 34 : 40;

type Direction = 'i_lent' | 'i_borrowed';

type Contact = {
  _id: string;
  name: string;
  nameUr?: string;
  phone?: string;
  direction: Direction;
  balance: number;
  isSettled?: boolean;
  dueDate?: string | null;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveDirection(raw?: string): Direction {
  return raw === 'i_borrowed' ? 'i_borrowed' : 'i_lent';
}

export default function AddLoanScreen() {
  const params = useLocalSearchParams<{
    direction?: string;
    id?: string;
  }>();
  const editingId = firstParam(params.id) || '';
  const isEditing = Boolean(editingId);
  const direction = resolveDirection(firstParam(params.direction));
  const isLent = direction === 'i_lent';
  const accent = isLent ? TxnKind.income : TxnKind.expense;
  const soft = isLent ? TxnKindSoft.income : TxnKindSoft.expense;
  const gradient = isLent ? txnKindGradientDeep('income') : txnKindGradientDeep('expense');

  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const currency = getCurrency(user?.currency);

  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<Contact[]>([]);
  const [personQuery, setPersonQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(editingId || null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    api
      .get<Contact[]>('/contacts', { params: { includeSettled: 1, direction } })
      .then(({ data }) => setPeople(data.filter((c) => c.direction === direction)))
      .catch(() => setPeople([]));
  }, [direction]);

  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/contacts/${editingId}/report`);
        if (cancelled) return;
        const c = data.contact;
        setName(c.name || '');
        setNameUr(c.nameUr || '');
        setPhone(c.phone || '');
        setAmount(String(c.balance ?? ''));
        setSelectedId(editingId);
        if (c.dueDate) {
          const d = new Date(c.dueDate);
          if (!Number.isNaN(d.getTime())) setDueDate(d);
        }
      } catch {
        if (!cancelled) {
          showAlert({ title: t('common.error'), message: t('loans.ledgerLoadFailed'), tone: 'error' });
          router.back();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, router, showAlert, t]);

  const title = isEditing
    ? t('loans.editPerson')
    : isLent
      ? t('loans.addLoanLent', { defaultValue: 'Add Loan (Lent)' })
      : t('loans.addLoanBorrowed', { defaultValue: 'Add Loan (Borrowed)' });
  const titleParts = title.replace(/[()]/g, ' ').trim().split(/\s+/);
  const titleHead = titleParts.slice(0, -1).join(' ') || 'Add';
  const titleTail = titleParts[titleParts.length - 1] || title;
  const tagline = isLent
    ? t('loans.addLentTagline', { defaultValue: 'Record money you gave to someone.' })
    : t('loans.addBorrowTagline', { defaultValue: 'Record money you borrowed from someone.' });

  const displayAmount = amount ? formatAmount(Number(amount) || 0, i18n.language) : '0';

  const dueLabel = dueDate
    ? `${String(dueDate.getDate()).padStart(2, '0')}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${dueDate.getFullYear()}`
    : t('loans.dueDateOptional', { defaultValue: 'Due date (optional)' });

  const matches = useMemo(() => {
    if (!personQuery.trim() || selectedId) return [];
    return people.filter((c) => contactMatchesQuery(c, personQuery)).slice(0, 6);
  }, [people, personQuery, selectedId]);

  const onKey = useCallback((key: string) => {
    setAmount((prev) => {
      if (key === 'back') return prev.slice(0, -1);
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev ? `${prev}.` : '0.';
      }
      if (prev === '0' && key !== '.') return key;
      if (prev.includes('.')) {
        const [, dec = ''] = prev.split('.');
        if (dec.length >= 2) return prev;
      }
      if (prev.replace('.', '').length >= 9) return prev;
      return `${prev}${key}`;
    });
  }, []);

  const bumpAmount = (n: number) => {
    setAmount(String((Number(amount) || 0) + n));
  };

  const pickExisting = (c: Contact) => {
    setSelectedId(c._id);
    setName(c.name || '');
    setNameUr(c.nameUr || '');
    setPhone(c.phone || '');
    setPersonQuery(getContactName(c, i18n.language));
    if (c.dueDate) {
      const d = new Date(c.dueDate);
      if (!Number.isNaN(d.getTime())) setDueDate(d);
    }
  };

  const clearPerson = () => {
    setSelectedId(null);
    setPersonQuery('');
    if (!isEditing) {
      setName('');
      setNameUr('');
      setPhone('');
    }
  };

  const onDueChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDuePicker(false);
    if (date) setDueDate(date);
  };

  const save = async () => {
    if (!name.trim() || !phoneKey(phone)) {
      showAlert({ title: t('common.error'), message: t('loans.fillPersonRequired'), tone: 'error' });
      return;
    }
    const amt = Number(amount);
    if (!isEditing && (!amount || !(amt > 0))) {
      showAlert({ title: t('common.error'), message: t('loans.amountRequired'), tone: 'error' });
      return;
    }
    if (amount && !(amt > 0)) {
      showAlert({ title: t('common.error'), message: t('loans.amountRequired'), tone: 'error' });
      return;
    }

    setLoading(true);
    try {
      const dueIso = dueDate ? dueDate.toISOString() : null;
      if (isEditing && editingId) {
        await api.patch(`/contacts/${editingId}`, {
          name: name.trim(),
          nameUr: nameUr.trim() || '',
          phone: phone.trim(),
          amount: amount === '' ? undefined : amt,
          dueDate: dueIso,
        });
      } else if (selectedId && !isEditing) {
        await api.post(`/contacts/${selectedId}/entry`, {
          type: isLent ? 'lent' : 'received',
          amount: amt,
          note: note.trim(),
        });
        if (dueIso) await api.patch(`/contacts/${selectedId}`, { dueDate: dueIso });
      } else {
        await api.post('/contacts', {
          name: name.trim(),
          nameUr: nameUr.trim() || undefined,
          phone: phone.trim(),
          direction,
          amount: amt,
          note: note.trim() || undefined,
          dueDate: dueIso || undefined,
        });
      }
      router.back();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { code?: string; direction?: string } } })?.response
        ?.data;
      if (data?.code === 'PHONE_REQUIRED') {
        showAlert({ title: t('loans.title'), message: t('loans.phoneRequired'), tone: 'error' });
      } else if (data?.code === 'PHONE_TAKEN') {
        const list = data.direction === 'i_borrowed' ? t('loans.iBorrowed') : t('loans.iLent');
        showAlert({
          title: t('loans.title'),
          message: t('loans.phoneTaken', { list }),
          tone: 'error',
        });
      } else {
        showAlert({ title: t('loans.title'), message: t('loans.updateFailed'), tone: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={{ paddingTop: Math.max(insets.top, 6) }}>
        <View style={[styles.topBar, { direction: 'ltr' }]}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/loans'))}
            hitSlop={10}
            style={styles.headerBackBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.topCenter} pointerEvents="none">
            <View style={styles.headerTitleRow}>
              <AppText variant="h3" color="#FFFFFF" shrink>
                {titleHead}{' '}
              </AppText>
              <AppText variant="h3" color={accent} shrink>
                {titleTail}
              </AppText>
            </View>
            <AppText
              variant="caption"
              color={MUTED}
              numberOfLines={1}
              align="center"
              style={styles.headerSubtitle}>
              {tagline}
            </AppText>
          </View>
          <View style={styles.topSideSpacer} />
        </View>
      </View>

      <View style={styles.content}>
        <LinearGradient
          colors={
            isLent
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
            <Ionicons name="calculator-outline" size={18} color="rgba(255,255,255,0.85)" />
          </RTLRow>
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map((n) => (
              <Pressable key={n} onPress={() => bumpAmount(n)} style={styles.quickPill}>
                <AppText variant="captionBold" color="#FFFFFF">
                  +{n >= 1000 ? `${n / 1000}k` : n}
                </AppText>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        <View style={[styles.panel, { borderColor: `${soft}28` }]}>
          {!isEditing ? (
            <>
              <View style={[styles.fieldRow, styles.fieldRowTight, { borderColor: CARD_BORDER }]}>
                <Ionicons name="search-outline" size={16} color={MUTED} />
                <TextInput
                  value={personQuery}
                  onChangeText={(v) => {
                    setPersonQuery(v);
                    if (selectedId) clearPerson();
                  }}
                  placeholder={t('loans.searchPersonPlaceholder')}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.fieldInput}
                />
                {selectedId || personQuery ? (
                  <Pressable onPress={clearPerson} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={MUTED} />
                  </Pressable>
                ) : null}
              </View>
              {selectedId ? (
                <View style={[styles.selectedCard, { backgroundColor: `${accent}14`, borderColor: `${accent}40` }]}>
                  <Ionicons name="checkmark-circle" size={16} color={accent} />
                  <AppText variant="captionBold" color={soft} style={{ flex: 1 }} numberOfLines={1}>
                    {t('loans.existingPerson', { defaultValue: 'Adding to existing person' })}
                  </AppText>
                </View>
              ) : null}
              {matches.length > 0 ? (
                <View style={styles.suggestBox}>
                  {matches.slice(0, 3).map((person) => (
                    <Pressable
                      key={person._id}
                      onPress={() => pickExisting(person)}
                      style={[styles.suggestRow, { borderBottomColor: CARD_BORDER }]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText variant="captionBold" color="#FFFFFF" numberOfLines={1}>
                          {getContactName(person, i18n.language)}
                        </AppText>
                        <AppText variant="caption" color={MUTED} numberOfLines={1}>
                          {person.phone || t('loans.noPhone')}
                        </AppText>
                      </View>
                      <AppText variant="captionBold" color={accent}>
                        {currency.symbol} {formatAmount(person.balance || 0, i18n.language)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          <View style={styles.fieldGrid}>
            <Field
              label={t('loans.name')}
              icon="person-outline"
              value={name}
              onChangeText={setName}
              accent={accent}
              editable={!selectedId || isEditing}
              style={styles.fieldHalf}
            />
            <Field
              label={t('loans.phone')}
              icon="call-outline"
              value={phone}
              onChangeText={setPhone}
              accent={accent}
              keyboardType="phone-pad"
              editable={!selectedId || isEditing}
              style={styles.fieldHalf}
            />
          </View>

          {!COMPACT ? (
            <Field
              label={t('loans.nameUr')}
              icon="person-outline"
              value={nameUr}
              onChangeText={setNameUr}
              accent={accent}
              editable={!selectedId || isEditing}
            />
          ) : null}

          <View style={styles.fieldGrid}>
            {!isEditing ? (
              <Field
                label={t('loans.reportNote')}
                icon="document-text-outline"
                value={note}
                onChangeText={setNote}
                accent={accent}
                style={styles.fieldHalf}
              />
            ) : (
              <View style={styles.fieldHalf} />
            )}
            <View style={[styles.fieldWrap, styles.fieldHalf]}>
              <AppText variant="label" color={MUTED} style={styles.fieldLabel}>
                {t('loans.dueDate', { defaultValue: 'Due date' })}
              </AppText>
              <Pressable
                onPress={() => setShowDuePicker(true)}
                style={[styles.fieldRow, styles.fieldRowTight, { borderColor: CARD_BORDER }]}>
                <Ionicons name="calendar-outline" size={16} color={soft} />
                <AppText
                  variant="caption"
                  color={dueDate ? '#FFFFFF' : MUTED}
                  numberOfLines={1}
                  style={{ flex: 1 }}>
                  {dueDate
                    ? dueLabel
                    : t('loans.dueDateOptional', { defaultValue: 'Optional' })}
                </AppText>
                {dueDate ? (
                  <Pressable onPress={() => setDueDate(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={MUTED} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-forward" size={14} color={MUTED} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.flexSpacer} />

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
                    <Ionicons name="backspace-outline" size={18} color="#E2E8F0" />
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

        <Pressable onPress={save} disabled={loading} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
          <LinearGradient
            colors={[...gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveBtn, loading && { opacity: 0.65 }]}>
            <RTLRow gap={8} style={{ justifyContent: 'center' }}>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <AppText variant="button" color="#FFFFFF">
                {loading ? t('common.loading') : t('common.save')}
              </AppText>
            </RTLRow>
          </LinearGradient>
        </Pressable>
      </View>

      {showDuePicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display="default"
          onChange={onDueChange}
        />
      ) : null}

      {showDuePicker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setShowDuePicker(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowDuePicker(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
            <RTLRow style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <AppText variant="bodySemibold" color="#FFFFFF">
                {t('loans.dueDate', { defaultValue: 'Due date' })}
              </AppText>
              <Pressable onPress={() => setShowDuePicker(false)}>
                <AppText variant="bodySemibold" color={accent}>
                  {t('common.done')}
                </AppText>
              </Pressable>
            </RTLRow>
            <DateTimePicker
              value={dueDate || new Date()}
              mode="date"
              display="spinner"
              themeVariant="dark"
              onChange={onDueChange}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function Field({
  label,
  icon,
  value,
  onChangeText,
  accent,
  keyboardType,
  editable = true,
  style,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  accent: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  editable?: boolean;
  style?: object;
}) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <AppText variant="label" color={MUTED} style={styles.fieldLabel}>
        {label}
      </AppText>
      <View
        style={[
          styles.fieldRow,
          styles.fieldRowTight,
          { borderColor: CARD_BORDER, opacity: editable ? 1 : 0.65 },
        ]}>
        <Ionicons name={icon} size={16} color={accent} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          keyboardType={keyboardType}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.fieldInput}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    height: 52,
    paddingHorizontal: H_PAD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 2,
  },
  topSideSpacer: { width: HEADER_SIDE },
  topCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: HEADER_SIDE + 4,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerSubtitle: { marginTop: 1 },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    zIndex: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: H_PAD,
    paddingTop: 4,
    gap: COMPACT ? 8 : 10,
  },
  amountCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: COMPACT ? 12 : 14,
    paddingBottom: COMPACT ? 10 : 12,
    overflow: 'hidden',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  amountGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -50,
    right: -30,
  },
  amountTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  },
  currencySym: { marginTop: 4, fontSize: 16 },
  amountValue: {
    fontSize: AMOUNT_SIZE,
    lineHeight: AMOUNT_SIZE + 6,
    fontWeight: '700',
    letterSpacing: -1,
    maxWidth: '72%',
    textAlign: 'center',
  },
  caret: { width: 2.5, height: AMOUNT_SIZE * 0.7, borderRadius: 1 },
  quickRow: { flexDirection: 'row', gap: 6 },
  quickPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: COMPACT ? 7 : 8,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  panel: {
    backgroundColor: CARD,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: COMPACT ? 10 : 12,
  },
  fieldGrid: {
    flexDirection: 'row',
    gap: 8,
    direction: 'ltr',
  },
  fieldHalf: { flex: 1, minWidth: 0 },
  fieldWrap: { marginBottom: COMPACT ? 8 : 10 },
  fieldLabel: { marginBottom: 4, fontSize: 12 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
  },
  fieldRowTight: { minHeight: COMPACT ? 40 : 44 },
  fieldInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14.5,
    paddingVertical: 8,
  },
  selectedCard: {
    marginTop: 6,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  suggestBox: { marginTop: 4, marginBottom: 4 },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flexSpacer: { flex: 1, minHeight: 4 },
  keypadTray: { gap: KEY_GAP },
  keyRow: { flexDirection: 'row', gap: KEY_GAP },
  key: {
    flex: 1,
    height: KEY_H,
    borderRadius: 11,
    backgroundColor: '#151C1A',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  keyText: { fontWeight: '600', fontSize: 18 },
  saveBtn: {
    marginTop: 2,
    borderRadius: Radius.md,
    minHeight: COMPACT ? 46 : 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: CARD,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.md,
  },
});
