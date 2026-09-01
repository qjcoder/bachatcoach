import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'bachatcoach_pin';
const BIOMETRIC_KEY = 'bachatcoach_biometric';
const LOCK_ENABLED_KEY = 'bachatcoach_lock_enabled';

export async function isLockEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(LOCK_ENABLED_KEY);
  return v === 'true';
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled) {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  }
}

export async function savePin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await setLockEnabled(true);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored === pin;
}

export async function hasPin(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return !!stored;
}

export async function isBiometricEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(BIOMETRIC_KEY);
  return v === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? 'true' : 'false');
}
