import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AuthProvider } from '@/context/AuthContext';
import { DialogProvider } from '@/context/DialogContext';
import { LockProvider } from '@/context/LockContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LockGate } from '@/components/LockGate';
import { SplashView } from '@/components/SplashView';
import { AppDirection } from '@/components/AppDirection';
import { useAppFonts } from '@/hooks/useAppFonts';
import { Brand } from '@/constants/theme';
import { getFontFamily, Type } from '@/constants/typography';
import { configureNativeDirection } from '@/lib/rtl';
import { normalizeLanguage } from '@/lib/language';
import { HeaderTitle, headerTitleContainerStyle } from '@/components/HeaderTitle';
import '@/i18n';
import { getStoredLanguage } from '@/i18n';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useAppFonts();
  const [langReady, setLangReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    getStoredLanguage()
      .then((lang) => {
        configureNativeDirection(lang);
        i18n.changeLanguage(lang);
        setLangReady(true);
      })
      .catch(() => setLangReady(true));
  }, [i18n]);

  useEffect(() => {
    if (loaded && langReady) SplashScreen.hideAsync();
  }, [loaded, langReady]);

  const onSplashFinish = useCallback(() => setShowSplash(false), []);

  if (!loaded || !langReady) return null;

  const lang = normalizeLanguage(i18n.language);
  const headerOptions = {
    headerStyle: { backgroundColor: Brand.primary },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {
      fontFamily: getFontFamily(lang, Type.h3.fontWeight),
      fontSize: Type.h3.fontSize,
      letterSpacing: Type.h3.letterSpacing,
    },
    headerTitle: ({ children }: { children: string }) => <HeaderTitle title={String(children)} light />,
    headerTitleContainerStyle,
    headerTitleAlign: 'center' as const,
    headerShadowVisible: false,
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppDirection>
          <RootLayoutNav headerOptions={headerOptions} />
          {showSplash && <SplashView onFinish={onSplashFinish} />}
        </AppDirection>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav({ headerOptions }: { headerOptions: object }) {
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <DialogProvider>
        <LockProvider>
          <LockGate>
            <Stack screenOptions={headerOptions}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="add-transaction"
                options={{
                  presentation: 'modal',
                  title: t('expenses.addExpense'),
                  ...headerOptions,
                }}
              />
              <Stack.Screen
                name="loan-ledger"
                options={{ title: t('loans.ledgerTitle'), ...headerOptions }}
              />
              <Stack.Screen
                name="goals"
                options={{ title: t('goals.title'), ...headerOptions }}
              />
            </Stack>
          </LockGate>
        </LockProvider>
      </DialogProvider>
    </AuthProvider>
  );
}
