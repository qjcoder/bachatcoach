import { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useFormatPKR } from '@/lib/format';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { TextField } from '@/components/TextField';
import { GoalIcon, GoalIconEmoji, GOAL_ICON_OPTIONS } from '@/components/GoalIcon';
import { RTLRow } from '@/components/RTLRow';
import { useDirection } from '@/hooks/useDirection';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius, Spacing } from '@/constants/theme';

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

export default function GoalsScreen() {
  const { t, i18n } = useTranslation();
  const formatPKR = useFormatPKR();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [contributeModal, setContributeModal] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [titleUr, setTitleUr] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [contributeAmount, setContributeAmount] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('target');

  const load = async () => {
    const { data } = await api.get('/goals');
    setGoals(data);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setGoals([]));
    }, [])
  );

  const createGoal = async () => {
    if (!title || !targetAmount) {
      Alert.alert('Error', t('goals.fillRequired'));
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
    i18n.language === 'ur' && goal.titleUr ? goal.titleUr : goal.title;

  const { textBlock } = useDirection();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Button title={t('goals.addGoal')} onPress={() => setModalVisible(true)} style={styles.addBtn} />
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
              await load();
              setRefreshing(false);
            }}
            tintColor={Brand.primary}
          />
        }
        ListEmptyComponent={<EmptyState icon="flag-outline" title={t('goals.noGoals')} />}
        renderItem={({ item }) => {
          const pct = Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100));
          return (
            <Card variant="elevated" style={styles.goalCard}>
              <RTLRow style={styles.goalHeader} gap={12}>
                <GoalIcon icon={item.icon} size={22} />
                <View style={styles.goalInfo}>
                  <AppText variant="bodySemibold" color={colors.text} style={textBlock}>{getTitle(item)}</AppText>
                  <AppText variant="bodySmall" color={colors.muted} style={styles.goalAmount}>
                    {formatPKR(item.currentAmount)} / {formatPKR(item.targetAmount)}
                  </AppText>
                </View>
                <AppText variant="amountMd" color={Brand.primary}>{pct}%</AppText>
              </RTLRow>
              <ProgressBar progress={pct} height={12} />
              <Pressable onPress={() => setContributeModal(item)} style={styles.contributeBtn}>
                <AppText variant="bodySmallBold" color={Brand.primary}>+ {t('goals.contribute')}</AppText>
              </Pressable>
            </Card>
          );
        }}
      />

      <BottomSheet visible={modalVisible} title={t('goals.addGoal')} onClose={() => setModalVisible(false)}>
        <RTLRow style={styles.iconRow} gap={8}>
          {GOAL_ICONS.map((iconKey) => (
            <Pressable
              key={iconKey}
              onPress={() => setSelectedIcon(iconKey)}
              style={[styles.iconChip, selectedIcon === iconKey && styles.iconChipActive]}>
              <GoalIconEmoji icon={iconKey} />
            </Pressable>
          ))}
        </RTLRow>
        <TextField label={t('goals.titleEn')} icon="flag-outline" value={title} onChangeText={setTitle} />
        <TextField label={t('goals.titleUr')} icon="language-outline" value={titleUr} onChangeText={setTitleUr} />
        <TextField label={t('goals.targetAmount')} icon="cash-outline" value={targetAmount} onChangeText={setTargetAmount} keyboardType="numeric" />
        <RTLRow style={styles.modalActions} gap={10}>
          <Button title={t('common.cancel')} onPress={() => setModalVisible(false)} variant="outline" style={{ flex: 1 }} />
          <Button title={t('common.save')} onPress={createGoal} style={{ flex: 1 }} />
        </RTLRow>
      </BottomSheet>

      <BottomSheet
        visible={!!contributeModal}
        title={t('goals.contribute')}
        onClose={() => setContributeModal(null)}>
        <TextField
          label={t('goals.amount')}
          icon="add-circle-outline"
          value={contributeAmount}
          onChangeText={setContributeAmount}
          keyboardType="numeric"
          autoFocus
        />
        <RTLRow style={styles.modalActions} gap={10}>
          <Button title={t('common.cancel')} onPress={() => setContributeModal(null)} variant="outline" style={{ flex: 1 }} />
          <Button title={t('common.save')} onPress={contribute} style={{ flex: 1 }} />
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
  goalHeader: { marginBottom: 12 },
  goalInfo: { flex: 1 },
  goalAmount: { marginTop: 3 },
  contributeBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: `${Brand.primary}10`,
  },
  iconRow: { flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  iconChip: { padding: 10, borderRadius: Radius.sm, backgroundColor: '#E2E8F0' },
  iconChipActive: { backgroundColor: `${Brand.primary}25`, borderWidth: 2, borderColor: Brand.primary },
  modalActions: { marginTop: 8 },
});
