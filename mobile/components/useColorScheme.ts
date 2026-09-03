import { useTheme, type ResolvedTheme } from '@/context/ThemeContext';

export const useColorScheme = (): ResolvedTheme => {
  try {
    const { resolved } = useTheme();
    return resolved;
  } catch {
    return 'light';
  }
};
