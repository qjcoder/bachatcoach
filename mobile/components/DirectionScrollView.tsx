import { ScrollView, type ScrollViewProps } from 'react-native';

export function DirectionScrollView({ style, contentContainerStyle, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      {...props}
    />
  );
}
