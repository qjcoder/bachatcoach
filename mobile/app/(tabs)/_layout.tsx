import { useEffect } from 'react';
import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { Shadow } from '@/constants/theme';
import { getFontFamily, Type } from '@/constants/typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useIsRTL } from '@/hooks/useIsRTL';
import { normalizeLanguage } from '@/lib/language';
import { HeaderTitle, headerTitleContainerStyle } from '@/components/HeaderTitle';
import { useLayoutScale } from '@/lib/layout';
import { useAuth } from '@/context/AuthContext';
import { prefetchCriticalData } from '@/lib/api';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const lang = normalizeLanguage(i18n.language);
  const isRTL = useIsRTL();
  const { factor, s } = useLayoutScale();

  useEffect(() => {
    if (!user) return;
    void prefetchCriticalData(i18n.language || user.language || 'en');
  }, [user?.id, i18n.language]);

  return (
    <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          ...Shadow.card,
        },
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontFamily: getFontFamily(lang, Type.tab.fontWeight),
          fontSize: Math.max(9, Math.round(Type.tab.fontSize * factor)),
          lineHeight: Math.max(12, Math.round(Type.tab.lineHeight * factor)),
          letterSpacing: Type.tab.letterSpacing,
          marginTop: -2,
        },
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: getFontFamily(lang, Type.h3.fontWeight),
          fontSize: Math.max(14, Math.round(Type.h3.fontSize * factor)),
          letterSpacing: Type.h3.letterSpacing,
        },
        headerTitleContainerStyle,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={s(22)} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: t('expenses.pageTitle', { defaultValue: 'Cashflow' }),
          tabBarLabel: t('tabs.expenses', { defaultValue: 'Cashflow' }),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
              tintColor={color}
              size={s(22)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: t('loans.title'),
          tabBarLabel: t('tabs.loans'),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
              tintColor={color}
              size={s(22)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t('insights.title'),
          tabBarLabel: t('tabs.insights'),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'chart.pie.fill', android: 'pie_chart', web: 'pie_chart' }}
              tintColor={color}
              size={s(22)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarLabel: t('tabs.settings'),
          headerTitle: () => (
            <HeaderTitle title={t('settings.title')} subtitle={t('settings.subtitle')} />
          ),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
              tintColor={color}
              size={s(22)}
            />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}
