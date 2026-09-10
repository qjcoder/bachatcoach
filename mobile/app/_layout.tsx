import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DialogProvider } from '@/context/DialogContext';
import { LockProvider } from '@/context/LockContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LockGate } from '@/components/LockGate';
import { SplashView } from '@/components/SplashView';
import { OnboardingView, isOnboardingDone } from '@/components/OnboardingView';
import { AppDirection } from '@/components/AppDirection';
import { useAppFonts } from '@/hooks/useAppFonts';
import { Brand } from '@/constants/theme';
import { getFontFamily, Type } from '@/constants/typography';
import { configureNativeDirection } from '@/lib/rtl';
import { normalizeLanguage } from '@/lib/language';
import { HeaderTitle, headerTitleContainerStyle } from '@/components/HeaderTitle';
import { initSentry, Sentry } from '@/lib/sentry';
import { syncLocalReminders } from '@/lib/localReminders';
import '@/i18n';
import { getStoredLanguage, warmStoredLocale } from '@/i18n';

export { ErrorBoundary } from 'expo-router';

initSentry();
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [loaded, error] = useAppFonts();
  const [langReady, setLangReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { i18n, t } = useTranslation();

  useEffect(() => {
    if (error) {
      Sentry.captureException(error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    getStoredLanguage()
      .then(async (lang) => {
        configureNativeDirection(lang);
        await warmStoredLocale(lang);
        await i18n.changeLanguage(lang);
        setLangReady(true);
      })
      .catch(() => setLangReady(true));
  }, [i18n]);

  useEffect(() => {
    void isOnboardingDone()
      .then((done) => {
        setShowOnboarding(!done);
        setOnboardingChecked(true);
      })
      .catch(() => setOnboardingChecked(true));
  }, []);

  useEffect(() => {
    if (loaded && langReady) SplashScreen.hideAsync();
  }, [loaded, langReady]);

  const onSplashFinish = useCallback(() => setShowSplash(false), []);

  if (!loaded || !langReady || !onboardingChecked) return null;

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
    headerBackTitle: t('common.back'),
    headerBackButtonDisplayMode: 'minimal' as const,
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppDirection>
          <RootLayoutNav headerOptions={headerOptions} />
          {showSplash && <SplashView onFinish={onSplashFinish} />}
          {!showSplash && showOnboarding ? (
            <OnboardingView onFinish={() => setShowOnboarding(false)} />
          ) : null}
        </AppDirection>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);

function ReminderSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!user) return;
    void syncLocalReminders({
      language: i18n.language || user.language,
      salaryDay: user.salaryDay,
    });
  }, [user?.id, user?.salaryDay, i18n.language]);

  return null;
}

function RootLayoutNav({ headerOptions }: { headerOptions: object }) {
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <DialogProvider>
        <LockProvider>
          <LockGate>
            <ReminderSync />
            <Stack screenOptions={headerOptions}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="(tabs)"
                options={{ headerShown: false, title: t('common.back') }}
              />
              <Stack.Screen
                name="add-transaction"
                options={{
                  animation: 'slide_from_bottom',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="add-loan"
                options={{
                  animation: 'slide_from_bottom',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="loan-ledger"
                options={{ title: t('loans.ledgerTitle'), ...headerOptions }}
              />
              <Stack.Screen
                name="search"
                options={{
                  headerShown: false,
                  animation: 'fade',
                }}
              />
              <Stack.Screen
                name="goals"
                options={{
                  title: t('goals.title'),
                  ...headerOptions,
                  headerStyle: { backgroundColor: '#78350F' },
                  headerTintColor: '#FFFFFF',
                }}
              />
            </Stack>
          </LockGate>
        </LockProvider>
      </DialogProvider>
    </AuthProvider>
  );
}
