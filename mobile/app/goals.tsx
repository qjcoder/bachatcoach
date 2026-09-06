import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useFormatPKR } from '@/lib/format';
import { useDialog } from '@/context/DialogContext';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { TextField } from '@/components/TextField';
import { GoalIcon, GoalIconEmoji, GOAL_ICON_OPTIONS } from '@/components/GoalIcon';
import { RTLRow } from '@/components/RTLRow';
import { useIsRTL } from '@/hooks/useIsRTL';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { normalizeLanguage } from '@/lib/language';

type Goal = {
  _id: string;
  title: string;
  titleUr?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  isCompleted: boolean;
  icon?: string;
};

const GOAL_ICONS = GOAL_ICON_OPTIONS.map((o) => o.key);

const SAVINGS = Brand.secondary;
const SAVINGS_BTN = Brand.secondarySoft;

export default function GoalsScreen() {
  const { t, i18n } = useTranslation();
  const { showAlert } = useDialog();
  const formatPKR = useFormatPKR();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const isRTL = useIsRTL();
  const layoutDirection = isRTL ? 'rtl' : 'ltr';
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [contributeModal, setContributeModal] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [titleUr, setTitleUr] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [contributeAmount, setContributeAmount] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('target');

  const load = async (fresh = false) => {
    const { data } = await api.get('/goals', {
      headers: fresh ? { 'X-Bypass-Cache': '1' } : undefined,
    });
    setGoals(data);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setGoals([]));
    }, [])
  );

  const createGoal = async () => {
    if (!title || !targetAmount) {
      showAlert({ title: t('common.error'), message: t('goals.fillRequired'), tone: 'error' });
      return;
    }
    await api.post('/goals', {
      title,
      titleUr: titleUr || undefined,
      targetAmount: Number(targetAmount),
      icon: selectedIcon,
    });
    setModalVisible(false);
    setTitle('');
    setTitleUr('');
    setTargetAmount('');
    setSelectedIcon('target');
    await load();
  };

  const contribute = async () => {
    if (!contributeModal || !contributeAmount) return;
    await api.patch(`/goals/${contributeModal._id}/contribute`, { amount: Number(contributeAmount) });
    setContributeModal(null);
    setContributeAmount('');
    await load();
  };

  const getTitle = (goal: Goal) =>
    normalizeLanguage(i18n.language) === 'ur' && goal.titleUr ? goal.titleUr : goal.title;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, direction: layoutDirection }]}>
      <View style={styles.header}>
        <Button
          title={t('goals.addGoal')}
          onPress={() => setModalVisible(true)}
          variant="secondary"
          style={{ ...styles.addBtn, backgroundColor: SAVINGS_BTN }}
        />
      </View>

      <FlatList
        data={goals}
        keyExtractor={(g) => g._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load(true);
              setRefreshing(false);
            }}
            tintColor={SAVINGS}
          />
        }
        ListEmptyComponent={<EmptyState icon="flag-outline" title={t('goals.noGoals')} />}
        renderItem={({ item }) => {
          const pct = Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100));
          return (
            <Card variant="elevated" style={styles.goalCard}>
              <RTLRow style={styles.goalHeader} gap={12}>
                <View style={styles.goalIconSlot}>
                  <GoalIcon icon={item.icon} size={22} />
                </View>
                <View style={styles.goalInfo}>
                  <AppText variant="bodySemibold" color={colors.text} numberOfLines={2} style={styles.goalTitle}>
                    {getTitle(item)}
                  </AppText>
                  <AppText variant="bodySmall" color={colors.muted} numberOfLines={1} style={styles.goalAmount}>
                    {formatPKR(item.currentAmount)} / {formatPKR(item.targetAmount)}
                  </AppText>
                </View>
                <AppText variant="amountMd" color={SAVINGS} align="center" shrink style={styles.goalPct}>
                  {pct}%
                </AppText>
              </RTLRow>
              <ProgressBar progress={pct} height={12} color={SAVINGS} />
              <Pressable onPress={() => setContributeModal(item)} style={styles.contributeBtn}>
                <AppText variant="bodySmallBold" color={SAVINGS}>
                  + {t('goals.contribute')}
                </AppText>
              </Pressable>
            </Card>
          );
        }}
      />

      <BottomSheet
        visible={modalVisible}
        title={t('goals.addGoal')}
        onClose={() => setModalVisible(false)}
        accentColor={SAVINGS}>
        <RTLRow style={styles.iconRow} gap={8}>
          {GOAL_ICONS.map((iconKey) => (
            <Pressable
              key={iconKey}
              onPress={() => setSelectedIcon(iconKey)}
              style={[
                styles.iconChip,
                { backgroundColor: colors.field },
                selectedIcon === iconKey && styles.iconChipActive,
              ]}>
              <GoalIconEmoji icon={iconKey} />
            </Pressable>
          ))}
        </RTLRow>
        <TextField
          label={t('goals.titleEn')}
          icon="flag-outline"
          value={title}
          onChangeText={setTitle}
          accent={SAVINGS}
        />
        <TextField
          label={t('goals.titleUr')}
          icon="language-outline"
          value={titleUr}
          onChangeText={setTitleUr}
          accent={SAVINGS}
        />
        <TextField
          label={t('goals.targetAmount')}
          icon="cash-outline"
          value={targetAmount}
          onChangeText={setTargetAmount}
          keyboardType="numeric"
          accent={SAVINGS}
        />
        <RTLRow style={styles.modalActions} gap={10}>
          <Button
            title={t('common.cancel')}
            onPress={() => setModalVisible(false)}
            variant="outline"
            style={{ flex: 1, borderColor: SAVINGS }}
          />
          <Button title={t('common.save')} onPress={createGoal} variant="secondary" style={{ flex: 1 }} />
        </RTLRow>
      </BottomSheet>

      <BottomSheet
        visible={!!contributeModal}
        title={t('goals.contribute')}
        onClose={() => setContributeModal(null)}
        accentColor={SAVINGS}>
        <TextField
          label={t('goals.amount')}
          icon="add-circle-outline"
          value={contributeAmount}
          onChangeText={setContributeAmount}
          keyboardType="numeric"
          autoFocus
          accent={SAVINGS}
        />
        <RTLRow style={styles.modalActions} gap={10}>
          <Button
            title={t('common.cancel')}
            onPress={() => setContributeModal(null)}
            variant="outline"
            style={{ flex: 1, borderColor: SAVINGS }}
          />
          <Button title={t('common.save')} onPress={contribute} variant="secondary" style={{ flex: 1 }} />
        </RTLRow>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.md, paddingBottom: Spacing.sm },
  addBtn: { paddingVertical: 12 },
  list: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xl },
  goalCard: { marginBottom: 12 },
  goalHeader: { marginBottom: 12, alignItems: 'center', width: '100%' },
  goalIconSlot: { flexShrink: 0 },
  goalInfo: { flex: 1, minWidth: 0, alignItems: 'flex-start', alignSelf: 'stretch' },
  goalTitle: { width: '100%' },
  goalAmount: { marginTop: 3, width: '100%' },
  goalPct: { flexShrink: 0, minWidth: 44, textAlign: 'center' },
  contributeBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: `${Brand.secondary}18`,
  },
  iconRow: { flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  iconChip: { padding: 10, borderRadius: Radius.sm },
  iconChipActive: {
    backgroundColor: `${Brand.secondary}25`,
    borderWidth: 2,
    borderColor: Brand.secondary,
  },
  modalActions: { marginTop: 8 },
});
