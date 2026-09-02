import { ScrollView, type ScrollViewProps } from 'react-native';
import { useIsRTL } from '@/hooks/useIsRTL';

export function DirectionScrollView({ style, contentContainerStyle, ...props }: ScrollViewProps) {
  const isRTL = useIsRTL();
  const direction = isRTL ? 'rtl' : 'ltr';

  return (
    <ScrollView
      style={[style, { direction }]}
      contentContainerStyle={[contentContainerStyle, { direction }]}
      {...props}
    />
  );
}
