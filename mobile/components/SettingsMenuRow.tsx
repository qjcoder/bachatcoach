import { type ReactNode } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { RTLRow } from '@/components/RTLRow';
import { Brand } from '@/constants/theme';

type SettingsMenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Muted line under the label (mockup-style). */
  subtitle?: string;
  /** @deprecated Prefer subtitle — kept for older call sites. */
  value?: string;
  detail?: string;
  actionLabel?: string;
  onPress?: () => void;
  right?: ReactNode;
  last?: boolean;
  danger?: boolean;
  textColor: string;
  mutedColor: string;
  borderColor: string;
};

export function SettingsMenuRow({
  icon,
  label,
  subtitle,
  value,
  detail,
  actionLabel,
  onPress,
  right,
  last,
  danger,
  textColor,
  mutedColor,
  borderColor,
}: SettingsMenuRowProps) {
  const under = subtitle ?? value;
  const content = (
    <RTLRow style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor }]}>
      <View style={[styles.iconBox, { backgroundColor: danger ? `${Brand.danger}14` : `${Brand.primary}14` }]}>
        <Ionicons name={icon} size={18} color={danger ? Brand.danger : Brand.primary} />
      </View>
      <View style={styles.copy}>
        <AppText
          variant="body"
          color={danger ? Brand.danger : textColor}
          numberOfLines={1}
          style={styles.label}>
          {label}
        </AppText>
        {under ? (
          <AppText variant="caption" color={mutedColor} numberOfLines={1}>
            {under}
          </AppText>
        ) : null}
      </View>
      {detail ? (
        <AppText variant="bodySmall" color={mutedColor} numberOfLines={1} style={styles.detail}>
          {detail}
        </AppText>
      ) : null}
      {actionLabel ? (
        <AppText variant="bodySmallBold" color={Brand.primary}>{actionLabel}</AppText>
      ) : right ? right : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={danger ? Brand.danger : mutedColor} />
      ) : null}
    </RTLRow>
  );

  if (!onPress && !right) return content;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { fontWeight: '600' },
  detail: { marginEnd: 4, maxWidth: 120 },
  pressed: { opacity: 0.6 },
});
