import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useIsRTL } from '@/hooks/useIsRTL';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

type AppDirectionProps = {
  children: ReactNode;
};

export function AppDirection({ children }: AppDirectionProps) {
  const isRTL = useIsRTL();
  const { resolved } = useTheme();
  const backgroundColor = Colors[resolved].background;

  return (
    <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr', backgroundColor }}>
      {children}
    </View>
  );
}
