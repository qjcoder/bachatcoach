import { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, type GestureResponderEvent } from 'react-native';
import { Brand } from '@/constants/theme';
import { MIN_PATTERN_NODES } from '@/lib/lock';
import { useColors } from '@/components/useColorScheme';

const COLS = 3;
const HIT_RATIO = 0.38;

function cellCenter(index: number, size: number) {
  const cell = size / COLS;
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return { x: cell * col + cell / 2, y: cell * row + cell / 2 };
}

function skippedNode(from: number, to: number) {
  const ar = Math.floor(from / COLS);
  const ac = from % COLS;
  const br = Math.floor(to / COLS);
  const bc = to % COLS;
  if ((ar + br) % 2 !== 0 || (ac + bc) % 2 !== 0) return null;
  const mid = ((ar + br) / 2) * COLS + (ac + bc) / 2;
  return mid === from || mid === to ? null : mid;
}

function nodeAt(x: number, y: number, size: number) {
  const cell = size / COLS;
  const col = Math.floor(x / cell);
  const row = Math.floor(y / cell);
  if (col < 0 || col >= COLS || row < 0 || row >= COLS) return null;
  const cx = cell * col + cell / 2;
  const cy = cell * row + cell / 2;
  if (Math.hypot(x - cx, y - cy) > cell * HIT_RATIO) return null;
  return row * COLS + col;
}

type PatternLockProps = {
  onComplete: (nodes: number[]) => void;
  status?: 'idle' | 'error';
};

export function PatternLock({ onComplete, status = 'idle' }: PatternLockProps) {
  const colors = useColors();
  const [size, setSize] = useState(280);
  const [nodes, setNodes] = useState<number[]>([]);
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  const nodesRef = useRef<number[]>([]);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const lineColor = status === 'error' ? Brand.danger : Brand.primary;

  const addNode = (index: number) => {
    const current = nodesRef.current;
    if (current.includes(index)) return;
    const next = [...current];
    if (next.length) {
      const skip = skippedNode(next[next.length - 1], index);
      if (skip != null && !next.includes(skip)) next.push(skip);
    }
    if (next.includes(index)) return;
    next.push(index);
    nodesRef.current = next;
    setNodes(next);
  };

  const location = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    return { x: locationX, y: locationY };
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (evt) => {
          nodesRef.current = [];
          setNodes([]);
          const point = location(evt);
          setFinger(point);
          const hit = nodeAt(point.x, point.y, size);
          if (hit != null) addNode(hit);
        },
        onPanResponderMove: (evt) => {
          const point = location(evt);
          setFinger(point);
          const hit = nodeAt(point.x, point.y, size);
          if (hit != null) addNode(hit);
        },
        onPanResponderRelease: () => {
          setFinger(null);
          const result = nodesRef.current;
          if (result.length >= MIN_PATTERN_NODES) {
            completeRef.current(result);
          } else {
            nodesRef.current = [];
            setNodes([]);
          }
        },
        onPanResponderTerminate: () => {
          setFinger(null);
          nodesRef.current = [];
          setNodes([]);
        },
      }),
    [size]
  );

  const pairs = nodes.slice(1).map((to, i) => ({ from: nodes[i], to }));

  return (
    <View
      style={styles.board}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - size) > 1) setSize(w);
      }}
      {...pan.panHandlers}>
      {pairs.map(({ from, to }) => {
        const a = cellCenter(from, size);
        const b = cellCenter(to, size);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <View
            key={`${from}-${to}`}
            pointerEvents="none"
            style={[
              styles.line,
              {
                left: (a.x + b.x) / 2 - len / 2,
                top: (a.y + b.y) / 2 - 2,
                width: len,
                backgroundColor: lineColor,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
      {finger && nodes.length ? (
        (() => {
          const a = cellCenter(nodes[nodes.length - 1], size);
          const dx = finger.x - a.x;
          const dy = finger.y - a.y;
          const len = Math.hypot(dx, dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View
              pointerEvents="none"
              style={[
                styles.line,
                {
                  left: (a.x + finger.x) / 2 - len / 2,
                  top: (a.y + finger.y) / 2 - 2,
                  width: len,
                  backgroundColor: lineColor,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })()
      ) : null}
      {Array.from({ length: 9 }, (_, i) => {
        const selected = nodes.includes(i);
        const center = cellCenter(i, size);
        return (
          <View
            key={i}
            pointerEvents="none"
            style={[
              styles.dotOuter,
              {
                left: center.x - 16,
                top: center.y - 16,
                borderColor: selected ? lineColor : colors.border,
                backgroundColor: colors.field,
              },
            ]}>
            {selected ? <View style={[styles.dotInner, { backgroundColor: lineColor }]} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
    direction: 'ltr',
  },
  line: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
  dotOuter: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
