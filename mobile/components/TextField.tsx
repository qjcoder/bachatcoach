import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { useAppType } from '@/components/AppText';
import { useIsRTL } from '@/hooks/useIsRTL';
import { Brand, Radius } from '@/constants/theme';

type TextFieldProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function TextField({ label, icon, style, ...props }: TextFieldProps) {
  const { type } = useAppType();
  const isRTL = useIsRTL();

  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label" style={styles.label}>{label}</AppText> : null}
      <View style={styles.inputRow}>
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={Brand.textMuted}
            style={isRTL ? styles.iconRTL : styles.iconLTR}
          />
        ) : null}
        <TextInput
          style={[
            styles.input,
            type('body'),
            { writingDirection: isRTL ? 'rtl' : 'ltr', textAlign: 'left' },
            icon ? (isRTL ? styles.inputWithIconRTL : styles.inputWithIconLTR) : null,
            style,
          ]}
          placeholderTextColor="#94A3B8"
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { marginBottom: 8, color: Brand.text },
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
    minHeight: 52,
  },
  iconLTR: {
    position: 'absolute',
    left: 14,
    top: 16,
    zIndex: 1,
  },
  iconRTL: {
    position: 'absolute',
    right: 14,
    top: 16,
    zIndex: 1,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: Brand.text,
  },
  inputWithIconLTR: { paddingLeft: 44 },
  inputWithIconRTL: { paddingRight: 44 },
});
