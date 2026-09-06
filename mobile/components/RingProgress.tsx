import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { AppText } from '@/components/AppText';

type RingProgressProps = {
  size: number;
  progress: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label: string;
  subLabel: string;
};

export function RingProgress({
  size,
  progress,
  strokeWidth = 9,
  color = '#34D399',
  trackColor = 'rgba(255,255,255,0.15)',
  label,
  subLabel,
}: RingProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const length = (clamped / 100) * circumference;
  const innerPad = strokeWidth + 6;
  const textMaxWidth = size - innerPad * 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <AppText
          variant="h3"
          color="#FFFFFF"
          align="center"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[styles.value, { maxWidth: textMaxWidth }]}>
          {label}
        </AppText>
        <AppText
          variant="caption"
          color="rgba(255,255,255,0.72)"
          align="center"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          style={[styles.sub, { maxWidth: textMaxWidth }]}>
          {subLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  value: {
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  sub: {
    marginTop: 1,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
