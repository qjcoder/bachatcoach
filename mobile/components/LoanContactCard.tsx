import { memo } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { RTLRow } from '@/components/RTLRow';
import { Brand, Radius } from '@/constants/theme';
import { usePageChrome } from '@/hooks/usePageChrome';
import { useLayoutScale } from '@/lib/layout';

const AVATAR_COLORS = ['#10B981', '#3B82F6', '#EAB308', '#A78BFA', '#F97316', '#EC4899'] as const;

export function avatarColorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

type LoanStatus = 'active' | 'repaid' | 'overdue';

type LoanContactCardProps = {
  name: string;
  purpose?: string;
  amount: string;
  openedLabel: string;
  dueLabel?: string;
  status: LoanStatus;
  statusLabel: string;
  tint: string;
  onPress?: () => void;
  onLongPress?: () => void;
  paymentLabel?: string;
  onPaymentPress?: () => void;
  remindLabel?: string;
  onRemindPress?: () => void;
  reminding?: boolean;
};

export const LoanContactCard = memo(function LoanContactCard({
  name,
  purpose,
  amount,
  openedLabel,
  dueLabel,
  status,
  statusLabel,
  tint,
  onPress,
  onLongPress,
  paymentLabel,
  onPaymentPress,
  remindLabel,
  onRemindPress,
  reminding,
}: LoanContactCardProps) {
  const { s } = useLayoutScale();
  const { text, muted, border, onBrand } = usePageChrome();
  const avatarBg = avatarColorForName(name);
  const statusColor =
    status === 'overdue' ? Brand.danger : status === 'repaid' ? Brand.secondary : tint;
  const showPayment = Boolean(paymentLabel && onPaymentPress && status !== 'repaid');
  const showRemind = Boolean(remindLabel && onRemindPress && status !== 'repaid');

  return (
    <View style={[styles.wrap, { borderBottomColor: border }]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}>
        <View style={[styles.avatar, { backgroundColor: avatarBg, width: s(44), height: s(44) }]}>
          <AppText variant="bodySemibold" color={onBrand}>
            {initialsForName(name)}
          </AppText>
        </View>

        <View style={styles.mid}>
          <AppText variant="bodySemibold" color={text} numberOfLines={1}>
            {name}
          </AppText>
          {purpose ? (
            <AppText variant="caption" color={muted} numberOfLines={1}>
              {purpose}
            </AppText>
          ) : null}
          <AppText variant="caption" color={muted} numberOfLines={1} style={styles.metaLine}>
            {openedLabel}
          </AppText>
          {dueLabel ? (
            <RTLRow gap={4} style={styles.dueRow}>
              <Ionicons name="time-outline" size={12} color={status === 'overdue' ? Brand.danger : muted} />
              <AppText
                variant="caption"
                color={status === 'overdue' ? Brand.danger : muted}
                numberOfLines={1}>
                {dueLabel}
              </AppText>
            </RTLRow>
          ) : null}
        </View>

        <View style={styles.right}>
          <AppText variant="bodySemibold" color={text} numberOfLines={1} style={styles.amount}>
            {amount}
          </AppText>
          <View style={[styles.badge, { borderColor: `${statusColor}88` }]}>
            <AppText variant="captionBold" color={statusColor}>
              {statusLabel}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={muted} style={styles.chevron} />
        </View>
      </Pressable>

      {showPayment || showRemind ? (
        <View style={styles.actions}>
          {showPayment ? (
            <LoanActionButton
              label={paymentLabel!}
              icon={status === 'overdue' ? 'alert-circle-outline' : 'cash-outline'}
              onPress={onPaymentPress!}
              tint={tint}
              variant="outline"
            />
          ) : null}
          {showRemind ? (
            <LoanActionButton
              label={remindLabel!}
              icon="logo-whatsapp"
              onPress={onRemindPress!}
              tint={Brand.whatsapp}
              variant="outline"
              loading={reminding}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

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
  const { s } = useLayoutScale();

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
        <View style={styles.actionInner}>
          <Ionicons name={icon} size={s(14)} color={filled ? '#fff' : tint} />
          <AppText
            variant="captionBold"
            color={filled ? '#FFFFFF' : tint}
            align="center"
            shrink
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            style={styles.actionLabel}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  avatar: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mid: { flex: 1, minWidth: 0, gap: 2 },
  metaLine: { marginTop: 4 },
  dueRow: { alignItems: 'center', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6, flexShrink: 0, maxWidth: '42%' },
  amount: { writingDirection: 'ltr' },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chevron: { marginTop: 2 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    paddingStart: 56,
  },
  actionBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  actionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  actionLabel: { flexShrink: 1, minWidth: 0 },
});
