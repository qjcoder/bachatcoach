import { View, StyleSheet } from 'react-native';
import { Brand } from '@/constants/theme';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useDirection } from '@/hooks/useDirection';

type ProgressBarProps = {
  progress: number;
  height?: number;
  color?: string;
};

export function ProgressBar({ progress, height = 10, color = Brand.primary }: ProgressBarProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const { isRTL } = useDirection();
  const width = `${Math.min(100, Math.max(0, progress))}%`;

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: colors.border },
      ]}>
      <View
        style={[
          styles.fill,
          {
            width: width as `${number}%`,
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            alignSelf: isRTL ? 'flex-end' : 'flex-start',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
  fill: {},
});
