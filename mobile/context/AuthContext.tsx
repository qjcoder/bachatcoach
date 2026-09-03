import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import api from '@/lib/api';

import { setStoredLanguage } from '@/i18n';
import { type AppLanguage } from '@/lib/language';
import { getDefaultCurrencyForLanguage } from '@/constants/languages';
import { clearGoogleTokens } from '@/lib/googleAuth';
import type { BackupFrequency } from '@/lib/googleDriveBackup';

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

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const userJson = await SecureStore.getItemAsync('user');
        if (token && userJson) {
          const userData = JSON.parse(userJson) as User;
          setUser(userData);
          try {
            const { data } = await api.get('/auth/me');
            const fresh = { ...userData, ...data.user } as User;
            await SecureStore.setItemAsync('user', JSON.stringify(fresh));
            setUser(fresh);
          } catch {
            // Keep cached user if refresh fails (offline, etc.)
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

  const persistSession = async (token: string, userData: User) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    if (userData.language) {
      await setStoredLanguage(userData.language);
    }
    setUser(userData);
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await persistSession(data.token, data.user);
  };

  const loginWithGoogle = async (idToken: string) => {
    const language = user?.language;
    const currency = language ? getDefaultCurrencyForLanguage(language) : undefined;
    const { data } = await api.post('/auth/google', { idToken, language, currency });
    await persistSession(data.token, data.user);
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
    await persistSession(data.token, data.user);
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
    setUser(updated);
  };

  const updateCurrency = async (currency: string) => {
    await updateProfile({ currency });
  };

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    if (!user) {
      setUser(data.user);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      return;
    }
    const updated = { ...user, ...data.user };
    await SecureStore.setItemAsync('user', JSON.stringify(updated));
    setUser(updated);
  };

  const deleteAccount = async () => {
    await api.delete('/auth/account');
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    await clearGoogleTokens();
    setUser(null);
    router.replace('/(auth)/login');
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    await clearGoogleTokens();
    setUser(null);
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
