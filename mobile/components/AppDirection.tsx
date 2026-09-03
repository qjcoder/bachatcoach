import { type ReactNode } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
}
