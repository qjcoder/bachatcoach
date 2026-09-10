import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Brand, Radius } from '@/constants/theme';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  accent?: string;
  /** Tighter padding when nested inside a card */
  compact?: boolean;
};

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  accent = Brand.primary,
  compact,
}: EmptyStateProps) {
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: `${accent}15` }]}>
        <Ionicons name={icon} size={compact ? 28 : 36} color={accent} />
      </View>
      <AppText variant="bodySemibold" color={colors.text} align="center">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="bodySmall" color={colors.muted} align="center" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: accent },
            pressed && styles.ctaPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <AppText variant="captionBold" color="#FFFFFF">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  wrapCompact: { paddingVertical: 24, paddingHorizontal: 12 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconWrapCompact: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 12,
  },
  subtitle: { marginTop: 6, lineHeight: 20 },
  cta: {
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctaPressed: { opacity: 0.88 },
});
