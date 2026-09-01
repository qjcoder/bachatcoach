import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { Brand, Radius } from '@/constants/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipActive]}>
      <AppText variant="label" color={selected ? '#FFFFFF' : '#475569'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primaryDark,
  },
});
