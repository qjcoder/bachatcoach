import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { Brand, Radius } from '@/constants/theme';
import { useColors } from '@/components/useColorScheme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const colors = useColors();
  const variantStyle =
    variant === 'primary'
      ? styles.primary
      : variant === 'secondary'
        ? styles.secondary
        : [styles.outline, { backgroundColor: colors.field, borderColor: Brand.primary }];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <AppText
        variant="button"
        color={variant === 'outline' ? Brand.primary : '#FFFFFF'}
        style={styles.buttonText}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primary: { backgroundColor: Brand.primary },
  secondary: { backgroundColor: Brand.secondary },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Brand.primary,
  },
  buttonText: { textAlign: 'center' },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
});
