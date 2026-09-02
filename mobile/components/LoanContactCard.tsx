import { View, StyleSheet, Pressable, ActivityIndicator, type ReactNode } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { RTLRow } from '@/components/RTLRow';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius } from '@/constants/theme';

type LoanContactCardProps = {
  name: string;
  phone?: string;
  amount: string;
  tint: string;
  actions: ReactNode;
};

export function LoanContactCard({ name, phone, amount, tint, actions }: LoanContactCardProps) {
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <Card variant="elevated" style={styles.card}>
      <RTLRow style={styles.topRow} gap={12}>
        <View style={[styles.iconWrap, { backgroundColor: `${tint}12` }]}>
          <Ionicons name="person" size={24} color={tint} />
        </View>

        <View style={styles.info}>
          <AppText variant="bodySemibold" color={colors.text} style={styles.name}>
            {name}
          </AppText>
          {phone ? (
            <AppText variant="bodySmall" color={colors.muted} style={styles.phone}>
              {phone}
            </AppText>
          ) : null}
        </View>

        <View style={styles.amountCol}>
          <AppText variant="amountMd" color={tint} style={styles.amount}>
            {amount}
          </AppText>
        </View>
      </RTLRow>

      <View style={styles.actions}>{actions}</View>
    </Card>
  );
}

type LoanActionButtonProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tint?: string;
  variant?: 'filled' | 'outline';
  loading?: boolean;
};

export function LoanActionButton({
  label,
  icon,
  onPress,
  tint = Brand.primary,
  variant = 'outline',
  loading,
}: LoanActionButtonProps) {
  const filled = variant === 'filled';

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[
        styles.actionBtn,
        filled
          ? { backgroundColor: tint === Brand.primary ? Brand.whatsapp : tint }
          : { borderColor: `${tint}45`, backgroundColor: `${tint}10`, borderWidth: 1 },
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={filled ? '#fff' : tint} />
      ) : (
        <RTLRow gap={6} style={styles.actionInner}>
          <Ionicons name={icon} size={16} color={filled ? '#fff' : tint} />
          <AppText
            variant="captionBold"
            color={filled ? '#FFFFFF' : tint}
            align="center"
            style={styles.actionLabel}>
            {label}
          </AppText>
        </RTLRow>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, padding: 16 },
  topRow: { alignItems: 'flex-start', width: '100%' },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    paddingTop: 2,
  },
  name: {
    width: '100%',
    flexWrap: 'wrap',
  },
  phone: {
    marginTop: 4,
    width: '100%',
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  amountCol: {
    flexShrink: 0,
    maxWidth: '38%',
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  amount: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  actions: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionInner: {
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  actionLabel: {
    flexShrink: 1,
  },
});
