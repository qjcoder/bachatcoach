import { PixelRatio, useWindowDimensions } from 'react-native';

/** Design baseline (iPhone 14 / typical 390pt width). */
const BASE_WIDTH = 390;

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Scale factor from current window. Compact Android phones sit ~0.82–0.92. */
export function layoutFactor(width: number, height: number) {
  const shortest = Math.min(width, height);
  return clamp(shortest / BASE_WIDTH, 0.82, 1.12);
}

export function roundPx(n: number) {
  return Math.round(PixelRatio.roundToNearestPixel(n));
}

export function useLayoutScale() {
  const { width, height } = useWindowDimensions();
  const factor = layoutFactor(width, height);
  const isNarrow = width < 380;
  const isCompact = Math.min(width, height) < 360;

  const s = (size: number) => roundPx(size * factor);

  return { width, height, factor, isNarrow, isCompact, s };
}
