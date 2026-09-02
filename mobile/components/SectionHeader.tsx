import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { RTLRow } from '@/components/RTLRow';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useDirection } from '@/hooks/useDirection';
import { Brand } from '@/constants/theme';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const { headingBlock } = useDirection();

  if (!actionLabel || !onAction) {
    return (
      <View style={styles.solo}>
        <AppText variant="h3" color={colors.text} style={headingBlock}>
          {title}
        </AppText>
      </View>
    );
  }

  return (
    <RTLRow style={styles.row}>
      <View style={styles.titleArea}>
        <AppText variant="h3" color={colors.text} style={headingBlock}>
          {title}
        </AppText>
      </View>
      <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
        <AppText variant="bodySmallBold" color={Brand.primary}>{actionLabel}</AppText>
      </Pressable>
    </RTLRow>
  );
}

const styles = StyleSheet.create({
  solo: {
    width: '100%',
    marginBottom: 12,
    marginTop: 4,
  },
  row: {
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  titleArea: { flex: 1, minWidth: 0 },
  action: { marginStart: 12 },
});
