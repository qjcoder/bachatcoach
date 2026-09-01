import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '@/constants/theme';

export type GoalIconKey =
  | 'target'
  | 'shield'
  | 'bike'
  | 'gift'
  | 'home'
  | 'phone'
  | 'travel'
  | 'education'
  | 'wedding'
  | 'car'
  | 'mosque'
  | 'savings';

export const GOAL_ICON_OPTIONS: {
  key: GoalIconKey;
  ion: keyof typeof Ionicons.glyphMap;
  emoji: string;
}[] = [
  { key: 'target', ion: 'flag-outline', emoji: '🎯' },
  { key: 'shield', ion: 'shield-checkmark-outline', emoji: '🛡️' },
  { key: 'bike', ion: 'bicycle-outline', emoji: '🚲' },
  { key: 'gift', ion: 'gift-outline', emoji: '🎁' },
  { key: 'home', ion: 'home-outline', emoji: '🏠' },
  { key: 'phone', ion: 'phone-portrait-outline', emoji: '📱' },
  { key: 'travel', ion: 'airplane-outline', emoji: '✈️' },
  { key: 'education', ion: 'school-outline', emoji: '🎓' },
  { key: 'wedding', ion: 'diamond-outline', emoji: '💍' },
  { key: 'car', ion: 'car-outline', emoji: '🚗' },
  { key: 'mosque', ion: 'moon-outline', emoji: '🕌' },
  { key: 'savings', ion: 'wallet-outline', emoji: '💰' },
];

const ICON_LOOKUP = Object.fromEntries(GOAL_ICON_OPTIONS.map((o) => [o.key, o])) as Record<
  GoalIconKey,
  (typeof GOAL_ICON_OPTIONS)[number]
>;

function resolveIcon(icon?: string) {
  if (!icon) return ICON_LOOKUP.target;
  if (ICON_LOOKUP[icon as GoalIconKey]) return ICON_LOOKUP[icon as GoalIconKey];
  const byEmoji = GOAL_ICON_OPTIONS.find((o) => o.emoji === icon);
  if (byEmoji) return byEmoji;
  return { key: 'target' as GoalIconKey, ion: 'flag-outline' as const, emoji: icon };
}

type GoalIconProps = {
  icon?: string;
  size?: number;
  variant?: 'circle' | 'plain';
};

export function GoalIcon({ icon, size = 24, variant = 'circle' }: GoalIconProps) {
  const meta = resolveIcon(icon);
  const iconSize = variant === 'circle' ? size * 0.55 : size;

  const glyph = (
    <Ionicons name={meta.ion} size={iconSize} color={Brand.primary} />
  );

  if (variant === 'plain') return glyph;

  const box = size * 1.8;
  return (
    <View style={[styles.circle, { width: box, height: box, borderRadius: box / 3 }]}>
      {glyph}
    </View>
  );
}

/** For icon picker — show emoji in chips */
export function GoalIconEmoji({ icon }: { icon: string }) {
  const meta = resolveIcon(icon);
  return <Text style={styles.emoji}>{meta.emoji}</Text>;
}

export function normalizeGoalIcon(icon?: string): string {
  const meta = resolveIcon(icon);
  return meta.key;
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: `${Brand.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
});
