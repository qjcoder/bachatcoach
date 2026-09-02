import { type FlexAlignType, type TextStyle, type ViewStyle } from 'react-native';
import { useIsRTL } from '@/hooks/useIsRTL';

export function useDirection() {
  const isRTL = useIsRTL();
  // Logical start — pairs with writingDirection rtl so Urdu text sits on the right.
  const textAlign: TextStyle['textAlign'] = 'left';
  const textBlock: TextStyle = { width: '100%', textAlign };

  const accentBorder = (color: string): ViewStyle => ({
    borderStartWidth: 4,
    borderStartColor: color,
  });

  /** Logical start — respects parent `direction` (right in Urdu, left in English). */
  const alignStart: FlexAlignType = 'flex-start';

  /** Align children to reading start — safe inside flex rows (no width: 100%). */
  const contentAlign: ViewStyle = {
    alignItems: alignStart,
  };

  /** Full-width block aligned to reading start — use outside flex rows. */
  const blockAlign: ViewStyle = {
    width: '100%',
    alignItems: alignStart,
  };

  const headingBlock: TextStyle = {
    width: '100%',
    alignSelf: 'stretch',
    textAlign: 'left',
  };

  return {
    isRTL,
    textAlign,
    textBlock,
    headingBlock,
    accentBorder,
    alignStart,
    contentAlign,
    blockAlign,
    layoutDirection: isRTL ? ('rtl' as const) : ('ltr' as const),
  };
}
