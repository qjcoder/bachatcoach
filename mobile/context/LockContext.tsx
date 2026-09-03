import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  isBiometricEnabled,
  isLockEnabled,
  verifyPattern,
  verifyPin,
} from '@/lib/lock';

type LockContextType = {
  isLocked: boolean;
  lockEnabled: boolean;
  biometricAvailable: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithPattern: (pattern: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  lock: () => void;
  refreshLockSettings: () => Promise<void>;
};

const LockContext = createContext<LockContextType | null>(null);

export function LockProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const appState = useRef(AppState.currentState);

  const refreshLockSettings = useCallback(async () => {
    const enabled = await isLockEnabled();
    setLockEnabledState(enabled);
    const bio = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(bio && enrolled);
    if (enabled) setIsLocked(true);
  }, []);

  useEffect(() => {
    refreshLockSettings();
  }, [refreshLockSettings]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (appState.current.match(/active/) && next.match(/inactive|background/)) {
        const enabled = await isLockEnabled();
        if (enabled) setIsLocked(true);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  const unlockWithPin = async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) setIsLocked(false);
    return ok;
  };

  const unlockWithPattern = async (pattern: string) => {
    const ok = await verifyPattern(pattern);
    if (ok) setIsLocked(false);
    return ok;
  };

  const unlockWithBiometric = async () => {
    const enabled = await isBiometricEnabled();
    if (!enabled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock BachatCoach',
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true,
    });

    if (result.success) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  return (
    <LockContext.Provider
      value={{
        isLocked,
        lockEnabled,
        biometricAvailable,
        unlockWithPin,
        unlockWithPattern,
        unlockWithBiometric,
        lock: () => setIsLocked(true),
        refreshLockSettings,
      }}>
      {children}
    </LockContext.Provider>
  );
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used within LockProvider');
  return ctx;
}
