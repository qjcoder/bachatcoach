import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { AppText } from '@/components/AppText';

export type DonutSlice = {
  value: number;
  color: string;
};

type DonutChartProps = {
  size: number;
  strokeWidth?: number;
  slices: DonutSlice[];
  centerLabel?: string;
  centerSubLabel?: string;
  trackColor?: string;
};

export function DonutChart({
  size,
  strokeWidth = 10,
  slices,
  centerLabel,
  centerSubLabel,
  trackColor = 'rgba(255,255,255,0.08)',
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0) || 1;
  const hole = Math.max(40, size - strokeWidth * 2 - 8);
  let offset = 0;

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
          {slices.map((slice, index) => {
            const portion = Math.max(0, slice.value) / total;
            const length = circumference * portion;
            const dashOffset = circumference * offset;
            offset += portion;
            if (portion <= 0) return null;
            return (
              <Circle
                key={`${slice.color}-${index}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={slice.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-dashOffset}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>
      {(centerLabel || centerSubLabel) && (
        <View style={styles.center} pointerEvents="none">
          <View style={[styles.centerInner, { maxWidth: hole }]}>
            {centerSubLabel ? (
              <AppText variant="caption" color="rgba(255,255,255,0.65)" align="center" numberOfLines={1}>
                {centerSubLabel}
              </AppText>
            ) : null}
            {centerLabel ? (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
                style={[styles.centerAmount, { maxWidth: hole }]}>
                {centerLabel}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  centerAmount: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
});
