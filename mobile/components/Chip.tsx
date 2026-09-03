import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { RTLRow } from '@/components/RTLRow';
import { Brand, Radius } from '@/constants/theme';
import { useColors } from '@/components/useColorScheme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tint?: string;
};

export function Chip({ label, selected, onPress, icon, tint = Brand.primary }: ChipProps) {
  const colors = useColors();
  const activeColor = selected ? '#FFFFFF' : colors.text;
  const activeBg = selected ? tint : colors.field;
  const borderColor = selected ? tint : colors.border;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: activeBg, borderColor },
        selected && styles.chipActive,
      ]}>
      <RTLRow gap={6} style={styles.inner}>
        {icon ? <Ionicons name={icon} size={15} color={selected ? '#FFFFFF' : tint} /> : null}
        <AppText variant="label" color={activeColor}>
          {label}
        </AppText>
      </RTLRow>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipActive: {
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inner: { alignItems: 'center' },
});
