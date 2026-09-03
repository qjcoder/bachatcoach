import { type ReactNode } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { RTLRow } from '@/components/RTLRow';
import { Brand } from '@/constants/theme';

type SettingsMenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
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
  const content = (
    <RTLRow style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor }]}>
      <View style={[styles.iconBox, { backgroundColor: `${Brand.primary}14` }]}>
        <Ionicons name={icon} size={18} color={danger ? Brand.danger : Brand.primary} />
      </View>
      <View style={styles.copy}>
        {value ? (
          <>
            <AppText variant="caption" color={mutedColor} numberOfLines={1}>{label}</AppText>
            <AppText variant="bodySemibold" color={danger ? Brand.danger : textColor} numberOfLines={1}>
              {value}
            </AppText>
          </>
        ) : (
          <AppText variant="body" color={danger ? Brand.danger : textColor} numberOfLines={1}>
            {label}
          </AppText>
        )}
      </View>
      {detail ? (
        <AppText variant="bodySmall" color={mutedColor} numberOfLines={1} style={styles.detail}>
          {detail}
        </AppText>
      ) : null}
      {actionLabel ? (
        <AppText variant="bodySmallBold" color={Brand.primary}>{actionLabel}</AppText>
      ) : right ? right : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={mutedColor} />
      ) : null}
    </RTLRow>
  );

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
  detail: { marginEnd: 4, maxWidth: 120 },
  pressed: { opacity: 0.6 },
});
