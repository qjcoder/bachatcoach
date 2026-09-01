import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Brand } from '@/constants/theme';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

export function EmptyState({ icon = 'file-tray-outline', title, subtitle }: EmptyStateProps) {
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: `${Brand.primary}15` }]}>
        <Ionicons name={icon} size={36} color={Brand.primary} />
      </View>
      <AppText variant="bodySemibold" color={colors.text} align="center">{title}</AppText>
      {subtitle ? (
        <AppText variant="bodySmall" color={colors.muted} align="center" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  subtitle: { marginTop: 6 },
});
