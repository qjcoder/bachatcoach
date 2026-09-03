import { View, StyleSheet, Pressable, ActivityIndicator, type ReactNode } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { RTLRow } from '@/components/RTLRow';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius } from '@/constants/theme';
import { useLayoutScale } from '@/lib/layout';

type LoanContactCardProps = {
  name: string;
  phone?: string;
  amount: string;
  tint: string;
  actions: ReactNode;
  onPress?: () => void;
};

export function LoanContactCard({ name, phone, amount, tint, actions, onPress }: LoanContactCardProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const { s } = useLayoutScale();
  const iconSize = s(44);

  const body = (
    <>
      <RTLRow style={styles.topRow} gap={10}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: `${tint}12`, width: iconSize, height: iconSize, borderRadius: s(14) },
          ]}>
          <Ionicons name="person" size={s(20)} color={tint} />
        </View>
        <View style={styles.info}>
          <AppText variant="bodySemibold" color={colors.text} shrink numberOfLines={1} style={styles.name}>
            {name}
          </AppText>
          {phone ? (
            <AppText variant="caption" color={colors.muted} shrink numberOfLines={1} style={styles.phone}>
              {phone}
            </AppText>
          ) : null}
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={s(18)} color={colors.muted} /> : null}
      </RTLRow>

      <AppText
        variant="amountMd"
        color={tint}
        shrink
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={styles.amount}>
        {amount}
      </AppText>
    </>
  );

  return (
    <Card variant="elevated" style={styles.card}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button">
          {body}
        </Pressable>
      ) : (
        body
      )}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>{actions}</View>
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
  card: { marginBottom: 12, padding: 12, width: '100%', overflow: 'hidden' },
  topRow: { alignItems: 'center', width: '100%' },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: { width: '100%' },
  phone: {
    marginTop: 2,
    width: '100%',
    writingDirection: 'ltr',
  },
  amount: {
    marginTop: 10,
    width: '100%',
    writingDirection: 'ltr',
  },
  actions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
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
  actionLabel: {
    flexShrink: 1,
    minWidth: 0,
  },
});
