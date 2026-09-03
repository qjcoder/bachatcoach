import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextType = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
};

const STORAGE_KEY = '@bachatcoach_theme';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  resolved: 'light',
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    });
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void AsyncStorage.setItem(STORAGE_KEY, m);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const resolved: ResolvedTheme =
    mode === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : mode;

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
