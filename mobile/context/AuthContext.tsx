import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import api from '@/lib/api';

import { setStoredLanguage } from '@/i18n';
import { type AppLanguage } from '@/lib/language';
import { getDefaultCurrencyForLanguage } from '@/constants/languages';

type User = {
  id: string;
  name: string;
  nameUr?: string;
  email: string;
  language: AppLanguage;
  currency: string;
  salaryDay: number;
  avatar?: string;
};

type ProfilePatch = Partial<Pick<User, 'currency' | 'avatar' | 'name' | 'nameUr' | 'language'>>;

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    language?: AppLanguage,
    nameUr?: string
  ) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  logout: () => Promise<void>;
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

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateProfile, updateCurrency, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
