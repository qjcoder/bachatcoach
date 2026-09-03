import { useTheme, type ResolvedTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export const useColorScheme = (): ResolvedTheme => {
  try {
    const { resolved } = useTheme();
    return resolved;
  } catch {
    return 'light';
  }
};

export function useColors() {
  return Colors[useColorScheme()];
}
