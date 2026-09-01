import { View, type ViewProps } from 'react-native';

/** Plain wrapper — RTL is applied explicitly via useDirection().row on each row. */
export function DirectionView({ style, ...props }: ViewProps) {
  return <View style={style} {...props} />;
}
