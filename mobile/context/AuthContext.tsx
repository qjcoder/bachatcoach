import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import i18n, { setStoredLanguage } from '@/i18n';
import api, { clearApiCache, prefetchCriticalData, setAuthToken } from '@/lib/api';

import { type AppLanguage, normalizeLanguage } from '@/lib/language';
import { getDefaultCurrencyForLanguage } from '@/constants/languages';
import { clearGoogleTokens } from '@/lib/googleAuth';
import { clearLockSettings } from '@/lib/lock';
import type { BackupFrequency } from '@/lib/googleDriveBackup';
import { showAppAlert } from '@/context/DialogContext';

type User = {
  id: string;
  name: string;
  nameUr?: string;
  email: string;
  language: AppLanguage;
  currency: string;
  salaryDay: number;
  avatar?: string;
  googleLinked?: boolean;
  backupEnabled?: boolean;
  backupFrequency?: BackupFrequency;
  lastBackupAt?: string | null;
};

type ProfilePatch = Partial<Pick<User, 'currency' | 'avatar' | 'name' | 'nameUr' | 'language'>>;

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  sendEmailOtp: (email: string, purpose: 'login' | 'register') => Promise<{ message: string; retryAfterSec?: number; devCode?: string }>;
  loginWithEmailOtp: (params: {
    email: string;
    code: string;
    purpose: 'login' | 'register';
    name?: string;
    nameUr?: string;
    language?: AppLanguage;
  }) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    language?: AppLanguage,
    nameUr?: string
  ) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const applyAccountLanguage = async (language?: string) => {
    if (!language) return;
    await setStoredLanguage(normalizeLanguage(language));
  };

  /** Clear only device-local session data. Server account data is never deleted here. */
  const clearLocalSession = async () => {
    clearApiCache();
    setAuthToken(null);
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    await clearGoogleTokens();
    await clearLockSettings();
    setUser(null);
  };

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const userJson = await SecureStore.getItemAsync('user');
        if (token && userJson) {
          setAuthToken(token);
          const userData = JSON.parse(userJson) as User;
          setUser(userData);
          try {
            const { data } = await api.get('/auth/me');
            const fresh = { ...userData, ...data.user } as User;
            await SecureStore.setItemAsync('user', JSON.stringify(fresh));
            // Keep language in sync with the cloud account across devices.
            await applyAccountLanguage(fresh.language);
            setUser(fresh);
            void prefetchCriticalData(fresh.language || 'en');
          } catch {
            // Keep cached user if refresh fails (offline, etc.)
            void prefetchCriticalData(userData.language || 'en');
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  const persistSession = async (token: string, userData: User, restoredFromDeletion?: boolean) => {
    clearApiCache();
    setAuthToken(token);
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    await applyAccountLanguage(userData.language);
    setUser(userData);
    void prefetchCriticalData(userData.language || 'en');
    if (restoredFromDeletion) {
      showAppAlert(
        i18n.t('settings.accountRestoredTitle'),
        i18n.t('settings.accountRestoredMsg'),
        'success'
      );
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await persistSession(data.token, data.user, data.restoredFromDeletion);
  };

  const loginWithGoogle = async (idToken: string) => {
    const language = user?.language;
    const currency = language ? getDefaultCurrencyForLanguage(language) : undefined;
    const { data } = await api.post('/auth/google', { idToken, language, currency });
    await persistSession(data.token, data.user, data.restoredFromDeletion);
  };

  const sendEmailOtp = async (email: string, purpose: 'login' | 'register') => {
    const { data } = await api.post('/auth/otp/send', {
      email: email.trim().toLowerCase(),
      purpose,
    });
    return data as { message: string; retryAfterSec?: number; devCode?: string };
  };

  const loginWithEmailOtp = async (params: {
    email: string;
    code: string;
    purpose: 'login' | 'register';
    name?: string;
    nameUr?: string;
    language?: AppLanguage;
  }) => {
    const language = params.language || 'en';
    const currency = getDefaultCurrencyForLanguage(language);
    const { data } = await api.post('/auth/otp/verify', {
      email: params.email.trim().toLowerCase(),
      code: params.code.trim(),
      purpose: params.purpose,
      name: params.name,
      nameUr: params.nameUr,
      language,
      currency,
    });
    await persistSession(data.token, data.user, data.restoredFromDeletion);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    language: AppLanguage = 'en',
    nameUr?: string
  ) => {
    const currency = getDefaultCurrencyForLanguage(language);
    const { data } = await api.post('/auth/register', { name, nameUr, email, password, language, currency });
    await persistSession(data.token, data.user);
  };

  const updateProfile = async (patch: ProfilePatch) => {
    const { data } = await api.patch('/auth/profile', patch);
    if (!user) return;
    const updated = { ...user, ...data.user };
    await SecureStore.setItemAsync('user', JSON.stringify(updated));
    if (patch.language || data.user?.language) {
      await applyAccountLanguage(updated.language);
    }
    setUser(updated);
  };

  const updateCurrency = async (currency: string) => {
    await updateProfile({ currency });
  };

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    if (!user) {
      await applyAccountLanguage(data.user?.language);
      setUser(data.user);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      return;
    }
    const updated = { ...user, ...data.user };
    await applyAccountLanguage(updated.language);
    await SecureStore.setItemAsync('user', JSON.stringify(updated));
    setUser(updated);
  };

  const deleteAccount = async () => {
    // Schedules deletion with a 7-day recovery window. Sign-in within 7 days cancels it.
    await api.delete('/auth/account');
    await clearLocalSession();
    router.replace('/(auth)/login');
  };

  const logout = async () => {
    // Leaves all server data intact for other devices / reinstall.
    await clearLocalSession();
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithGoogle,
        sendEmailOtp,
        loginWithEmailOtp,
        register,
        updateProfile,
        updateCurrency,
        refreshUser,
        logout,
        deleteAccount,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
