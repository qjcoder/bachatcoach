import { type ReactNode, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useLock } from '@/context/LockContext';
import LockScreen from '@/components/LockScreen';

export function LockGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isLocked, lockEnabled, refreshLockSettings } = useLock();

  useEffect(() => {
    if (user) refreshLockSettings();
  }, [user, refreshLockSettings]);

  if (authLoading) return null;

  const showLock = !!user && lockEnabled && isLocked;

  return (
    <View style={styles.root}>
      {children}
      {showLock && (
        <View style={styles.overlay}>
          <LockScreen />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
});
