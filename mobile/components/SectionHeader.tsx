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
  const { textBlock, contentAlign } = useDirection();

  return (
    <RTLRow style={styles.row}>
      <View style={[styles.titleWrap, contentAlign]}>
        <AppText variant="h3" color={colors.text} style={textBlock}>{title}</AppText>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText variant="bodySmallBold" color={Brand.primary}>{actionLabel}</AppText>
        </Pressable>
      ) : null}
    </RTLRow>
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  titleWrap: { flex: 1, minWidth: 0 },
});
