import { useMemo } from 'react';
import { useColors, useColorScheme } from '@/components/useColorScheme';

/**
 * Shared page chrome for tab/form screens — follows light/dark tokens.
 * Use instead of hardcoded #020617 / #0F172A / white text.
 */
export function usePageChrome() {
  const colors = useColors();
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';

  return useMemo(
    () => ({
      colors,
      isDark,
      bg: colors.background,
      card: colors.card,
      field: colors.field,
      border: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      text: colors.text,
      muted: colors.muted,
      /** Soft label on cards */
      soft: isDark ? 'rgba(255,255,255,0.8)' : colors.muted,
      /** Icon well / chip background */
      well: isDark ? 'rgba(255,255,255,0.06)' : colors.field,
      /** Empty chart placeholder slice */
      chartEmpty: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
      /** On solid brand/gradient surfaces — always white */
      onBrand: '#FFFFFF' as const,
    }),
    [colors, isDark]
  );
}
