import { useRef, useState } from 'react';
import { View, StyleSheet, TextInput, Pressable } from 'react-native';
import { Brand } from '@/constants/theme';
import { useColors, useColorScheme } from '@/components/useColorScheme';

type PinBoxesProps = {
  value: string;
  onChange: (value: string) => void;
  length: number;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
};

export function PinBoxes({
  value,
  onChange,
  length,
  onComplete,
  autoFocus = true,
}: PinBoxesProps) {
  const colors = useColors();
  const scheme = useColorScheme() ?? 'light';
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(autoFocus);
  const caretIndex = Math.min(value.length, Math.max(length - 1, 0));
  const complete = value.length >= length;

  const handleChange = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.wrap}>
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => {
          const filled = Boolean(value[i]);
          const isCaret = focused && !complete && i === caretIndex;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                {
                  backgroundColor: colors.field,
                  borderColor: isCaret ? Brand.primary : colors.border,
                },
              ]}>
              {filled ? (
                <View style={[styles.dot, { backgroundColor: colors.text }]} />
              ) : isCaret ? (
                <View style={[styles.caret, { backgroundColor: Brand.primary }]} />
              ) : null}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        caretHidden
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardAppearance={scheme === 'dark' ? 'dark' : 'light'}
        style={styles.hiddenInput}
        textContentType="oneTimeCode"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.9,
    maxHeight: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  caret: {
    width: 2,
    height: 22,
    borderRadius: 1,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    color: 'transparent',
  },
});
