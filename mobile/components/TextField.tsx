import { View, TextInput, StyleSheet, Platform, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { useAppType } from '@/components/AppText';
import { useIsRTL } from '@/hooks/useIsRTL';
import { Brand, Radius } from '@/constants/theme';
import { getFontFamily } from '@/constants/typography';

type TextFieldProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function TextField({ label, icon, style, ...props }: TextFieldProps) {
  const { lang } = useAppType();
  const isRTL = useIsRTL();

  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label" style={styles.label}>{label}</AppText> : null}
      <View style={[styles.inputRow, isRTL && styles.inputRowRTL]}>
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
            {
              fontFamily: getFontFamily(lang, 400),
              fontSize: 16,
              writingDirection: isRTL ? 'rtl' : 'ltr',
              textAlign: 'left',
            },
            style,
          ]}
          placeholderTextColor="#94A3B8"
          textAlignVertical="center"
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Radius.md,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  inputRowRTL: {
    flexDirection: 'row-reverse',
  },
  iconLTR: {
    marginRight: 10,
  },
  iconRTL: {
    marginLeft: 10,
  },
  input: {
    flex: 1,
    color: Brand.text,
    // Avoid large lineHeight + padding — on iOS that pushes text to the bottom.
    ...(Platform.OS === 'ios'
      ? { paddingVertical: 14, lineHeight: 20 }
      : { paddingVertical: 12, textAlignVertical: 'center' as const }),
  },
});
