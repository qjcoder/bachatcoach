import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { Brand, Radius } from '@/constants/theme';
import { useColors } from '@/components/useColorScheme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, compact, style }: ButtonProps) {
  const colors = useColors();
  const flat = StyleSheet.flatten(style) || {};
  const outlineAccent =
    typeof flat.borderColor === 'string' ? flat.borderColor : Brand.primary;
  const variantStyle =
    variant === 'primary'
      ? styles.primary
      : variant === 'secondary'
        ? styles.secondary
        : [styles.outline, { backgroundColor: colors.field, borderColor: outlineAccent }];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        variantStyle,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <AppText
        variant="button"
        color={variant === 'outline' ? outlineAccent : '#FFFFFF'}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
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
  compact: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  primary: { backgroundColor: Brand.primary },
  secondary: { backgroundColor: Brand.secondarySoft },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Brand.primary,
  },
  buttonText: { textAlign: 'center', width: '100%' },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
});
