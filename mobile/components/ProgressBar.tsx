import { View, StyleSheet } from 'react-native';
import { Brand } from '@/constants/theme';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type ProgressBarProps = {
  progress: number;
  height?: number;
  color?: string;
};

export function ProgressBar({ progress, height = 10, color = Brand.primary }: ProgressBarProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const pct = Math.min(100, Math.max(0, progress));
  const radius = height / 2;

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
          flexDirection: 'row',
        },
      ]}>
      <View
        style={{
          flex: pct,
          height,
          backgroundColor: color,
          borderRadius: radius,
        }}
      />
      <View style={{ flex: 100 - pct }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
});
