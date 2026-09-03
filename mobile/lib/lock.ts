import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'bachatcoach_pin';
const PATTERN_KEY = 'bachatcoach_pattern';
const METHOD_KEY = 'bachatcoach_lock_method';
const BIOMETRIC_KEY = 'bachatcoach_biometric';
const LOCK_ENABLED_KEY = 'bachatcoach_lock_enabled';

export const MIN_PIN_LENGTH = 4;
export const MAX_PIN_LENGTH = 6;
export const MIN_PATTERN_NODES = 4;

export type LockMethod = 'pin' | 'pattern';

export function encodePattern(nodes: number[]): string {
  return nodes.join('-');
}

export async function getStoredPinLength(): Promise<number> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  if (stored && stored.length >= MIN_PIN_LENGTH && stored.length <= MAX_PIN_LENGTH) {
    return stored.length;
  }
  return MIN_PIN_LENGTH;
}

export async function getLockMethod(): Promise<LockMethod> {
  const method = await SecureStore.getItemAsync(METHOD_KEY);
  if (method === 'pattern') {
    const pattern = await SecureStore.getItemAsync(PATTERN_KEY);
    if (pattern) return 'pattern';
  }
  return 'pin';
}

export async function isLockEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(LOCK_ENABLED_KEY);
  return v === 'true';
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled) {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(PATTERN_KEY);
    await SecureStore.deleteItemAsync(METHOD_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  }
}

export async function savePin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await SecureStore.deleteItemAsync(PATTERN_KEY);
  await SecureStore.setItemAsync(METHOD_KEY, 'pin');
  await setLockEnabled(true);
}

export async function savePatternLock(pattern: string, backupPin: string): Promise<void> {
  await SecureStore.setItemAsync(PATTERN_KEY, pattern);
  await SecureStore.setItemAsync(PIN_KEY, backupPin);
  await SecureStore.setItemAsync(METHOD_KEY, 'pattern');
  await setLockEnabled(true);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored === pin;
}

export async function verifyPattern(pattern: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PATTERN_KEY);
  return stored === pattern;
}

export async function hasPin(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return !!stored;
}

export async function hasLockSecret(): Promise<boolean> {
  const pin = await SecureStore.getItemAsync(PIN_KEY);
  const pattern = await SecureStore.getItemAsync(PATTERN_KEY);
  return !!(pin || pattern);
}

export async function isBiometricEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(BIOMETRIC_KEY);
  return v === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? 'true' : 'false');
}

/** Clear device lock so another account on this install is not blocked by the previous PIN. */
export async function clearLockSettings(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await SecureStore.deleteItemAsync(PATTERN_KEY);
  await SecureStore.deleteItemAsync(METHOD_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  await SecureStore.deleteItemAsync(LOCK_ENABLED_KEY);
}
