import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  onPress?: () => void;
  children?: ReactNode;
  /** Kept for call-site compatibility; frost dim is handled at root. */
  dimOpacity?: number;
};

/**
 * Full-screen dismiss target for overlays.
 * Actual blur/dim is painted by BlurOverlayProvider (RootFrost) so it sits
 * directly above app content in the same window.
 */
export function ModalBackdrop({ onPress, children }: Props) {
  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable
        style={styles.hit}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
  },
  hit: {
    ...StyleSheet.absoluteFill,
  },
});
