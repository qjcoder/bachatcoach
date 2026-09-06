import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useColorScheme } from '@/components/useColorScheme';
import { DarkChrome } from '@/constants/Colors';

const BlurTargetContext = createContext<RefObject<View | null> | null>(null);
const FrostRegistrarContext = createContext<(active: boolean) => void>(() => {});

/** Portal nodes live outside React state so updating an overlay does not re-render the app tree. */
const portalNodes = new Map<string, ReactNode>();
const portalListeners = new Set<() => void>();
let portalSeq = 0;

function emitPortals() {
  portalListeners.forEach((listener) => listener());
}

function PortalHost({
  onCountChange,
  showContent,
}: {
  onCountChange: (count: number) => void;
  showContent: boolean;
}) {
  const [, setTick] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const onChange = () => {
      setTick((n) => n + 1);
      const next = portalNodes.size;
      if (countRef.current !== next) {
        countRef.current = next;
        onCountChange(next);
      }
    };
    portalListeners.add(onChange);
    onChange();
    return () => {
      portalListeners.delete(onChange);
    };
  }, [onCountChange]);

  if (!showContent) return null;

  return (
    <>
      {[...portalNodes.entries()].map(([id, node]) => (
        <View key={id} style={styles.portal} pointerEvents="box-none">
          {node}
        </View>
      ))}
    </>
  );
}

type SnapshotFrostProps = {
  active: boolean;
  uri: string | null;
  isDark: boolean;
};

/**
 * Real frosted backdrop: blurred screenshot + cool slate glass veil.
 * Veil stays navy/slate (matches Settings) — never green-tinted.
 */
function SnapshotFrost({ active, uri, isDark }: SnapshotFrostProps) {
  if (!active || !uri) return null;

  return (
    <View style={styles.frost} pointerEvents="none">
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        blurRadius={Platform.OS === 'ios' ? 40 : 26}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? DarkChrome.frostVeil : 'rgba(15, 23, 42, 0.32)',
          },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? DarkChrome.frostHighlight : 'rgba(255, 255, 255, 0.16)',
          },
        ]}
      />
    </View>
  );
}

/**
 * Wraps app content and hosts full-screen portals. Frost uses a captured,
 * blurred snapshot so the backdrop is a real blur with the right color.
 */
export function BlurOverlayProvider({
  children,
  overlay,
}: {
  children: ReactNode;
  overlay?: ReactNode;
}) {
  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';
  const captureViewRef = useRef<View | null>(null);
  const blurTargetRef = useRef<View | null>(null);
  const frostCountRef = useRef(0);
  const [frosted, setFrosted] = useState(false);
  const [portalCount, setPortalCount] = useState(0);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [frostReady, setFrostReady] = useState(false);
  const capturingRef = useRef(false);

  const registerFrost = useCallback((active: boolean) => {
    frostCountRef.current = Math.max(0, frostCountRef.current + (active ? 1 : -1));
    setFrosted(frostCountRef.current > 0);
  }, []);

  const showFrost = frosted || portalCount > 0;

  useEffect(() => {
    if (!showFrost) {
      setSnapshotUri(null);
      setFrostReady(false);
      capturingRef.current = false;
      return;
    }

    let cancelled = false;
    const failSafe = setTimeout(() => {
      if (!cancelled) setFrostReady(true);
    }, 450);

    const run = async () => {
      if (capturingRef.current || !captureViewRef.current) {
        if (!cancelled) setFrostReady(true);
        return;
      }
      capturingRef.current = true;
      try {
        const uri = await captureRef(captureViewRef, {
          format: 'jpg',
          quality: 0.75,
          result: 'tmpfile',
        });
        if (!cancelled) {
          setSnapshotUri(uri);
          setFrostReady(true);
        }
      } catch {
        if (!cancelled) {
          setSnapshotUri(null);
          setFrostReady(true);
        }
      } finally {
        capturingRef.current = false;
      }
    };

    const t = requestAnimationFrame(() => {
      void run();
    });

    return () => {
      cancelled = true;
      clearTimeout(failSafe);
      cancelAnimationFrame(t);
    };
  }, [showFrost]);

  const revealOverlay = !showFrost || frostReady;

  return (
    <BlurTargetContext.Provider value={blurTargetRef}>
      <FrostRegistrarContext.Provider value={registerFrost}>
        <View style={styles.root}>
          <View
            ref={(node) => {
              captureViewRef.current = node;
              blurTargetRef.current = node;
            }}
            style={[styles.root, showFrost && snapshotUri ? styles.contentHidden : null]}
            collapsable={false}
            pointerEvents={showFrost ? 'none' : 'auto'}>
            {children}
          </View>
          <SnapshotFrost active={showFrost} uri={snapshotUri} isDark={isDark} />
          {overlay}
          <PortalHost onCountChange={setPortalCount} showContent={revealOverlay} />
        </View>
      </FrostRegistrarContext.Provider>
    </BlurTargetContext.Provider>
  );
}

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}

/** Keep root frost on while a non-portal overlay (e.g. AppDialog) is visible. */
export function useFrostedOverlay(visible: boolean) {
  const register = useContext(FrostRegistrarContext);
  useEffect(() => {
    if (!visible) return;
    register(true);
    return () => register(false);
  }, [visible, register]);
}

/**
 * Renders children into the root overlay host when `visible`.
 */
export function AppPortal({ visible, children }: { visible: boolean; children: ReactNode }) {
  const idRef = useRef(`portal-${++portalSeq}`);
  const hasPortalContext = useContext(BlurTargetContext) != null;

  useLayoutEffect(() => {
    const id = idRef.current;
    if (!visible) {
      if (portalNodes.delete(id)) emitPortals();
      return;
    }
    portalNodes.set(id, children);
    emitPortals();
    return () => {
      if (portalNodes.delete(id)) emitPortals();
    };
  }, [visible, children]);

  if (!hasPortalContext && visible) {
    return (
      <View style={styles.portal} pointerEvents="box-none">
        {children}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frost: {
    ...StyleSheet.absoluteFill,
    zIndex: 9000,
    elevation: 9000,
  },
  portal: {
    ...StyleSheet.absoluteFill,
    zIndex: 10000,
    elevation: 10000,
  },
  contentHidden: {
    opacity: 0,
  },
});
