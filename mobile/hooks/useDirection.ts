import { type FlexAlignType, type TextStyle, type ViewStyle } from 'react-native';
import { useIsRTL } from '@/hooks/useIsRTL';

export function useDirection() {
  const isRTL = useIsRTL();
  const textAlign: TextStyle['textAlign'] = isRTL ? 'right' : 'left';
  const textBlock: TextStyle = { width: '100%', textAlign };

  const accentBorder = (color: string): ViewStyle =>
    isRTL
      ? { borderRightWidth: 4, borderRightColor: color }
      : { borderLeftWidth: 4, borderLeftColor: color };

  const alignStart: FlexAlignType = isRTL ? 'flex-end' : 'flex-start';
  const contentAlign: ViewStyle = {
    width: '100%',
    alignItems: alignStart,
  };

  return {
    isRTL,
    textAlign,
    textBlock,
    accentBorder,
    alignStart,
    contentAlign,
  };
}
