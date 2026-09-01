import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useIsRTL } from '@/hooks/useIsRTL';

type AppDirectionProps = {
  children: ReactNode;
};

export function AppDirection({ children }: AppDirectionProps) {
  const isRTL = useIsRTL();
  return (
    <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      {children}
    </View>
  );
}
