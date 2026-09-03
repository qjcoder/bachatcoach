import { useState } from 'react';
import { View, TextInput, StyleSheet, Platform, Pressable, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { useAppType } from '@/components/AppText';
import { useIsRTL } from '@/hooks/useIsRTL';
import { Brand, Radius } from '@/constants/theme';
import { getFontFamily } from '@/constants/typography';

type TextFieldProps = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onTrailingPress?: () => void;
};

export function TextField({
  label,
  icon,
  trailingIcon,
  onTrailingPress,
  style,
  secureTextEntry,
  placeholder,
  ...props
}: TextFieldProps) {
  const { lang } = useAppType();
  const isRTL = useIsRTL();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);

  const borderColor = focused ? Brand.primary : Brand.border;
  const iconColor = focused ? Brand.primary : Brand.textMuted;
  const bgColor = focused ? '#F0FDF4' : '#F8FAFC';

  return (
    <View style={[styles.wrap, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      {label ? (
        <AppText variant="label" style={[styles.label, focused && styles.labelFocused]}>
          {label}
        </AppText>
      ) : null}

      <View style={[styles.inputRow, { borderColor, backgroundColor: bgColor }]}>
        {icon ? (
          <Ionicons name={icon} size={19} color={iconColor} style={styles.leadingIcon} />
        ) : null}

        <TextInput
          style={[
            styles.input,
            {
              fontFamily: getFontFamily(lang, 400),
              fontSize: 15.5,
              writingDirection: isRTL ? 'rtl' : 'ltr',
              textAlign: 'left',
            },
            style,
          ]}
          // English placeholders mis-align under Urdu RTL — omit them.
          placeholder={isRTL ? undefined : placeholder}
          placeholderTextColor="#94A3B8"
          textAlignVertical="center"
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />

        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} style={styles.trailingBtn} hitSlop={10}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={Brand.textMuted} />
          </Pressable>
        ) : trailingIcon ? (
          <Pressable onPress={onTrailingPress} style={styles.trailingBtn} hitSlop={10}>
            <Ionicons name={trailingIcon} size={20} color={Brand.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14, width: '100%' },
  label: { marginBottom: 6, color: '#475569', fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  labelFocused: { color: Brand.primary },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    minHeight: 52,
    paddingHorizontal: 14,
    overflow: 'hidden',
    width: '100%',
  },

  leadingIcon: { marginEnd: 10, flexShrink: 0 },
  trailingBtn: { marginStart: 8, flexShrink: 0 },

  input: {
    flex: 1,
    minWidth: 0,
    color: Brand.text,
    ...(Platform.OS === 'ios'
      ? { paddingVertical: 14, lineHeight: 20 }
      : { paddingVertical: 12, textAlignVertical: 'center' as const }),
  },
});
