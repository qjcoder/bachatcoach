import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { Brand, Shadow } from '@/constants/theme';
import { getFontFamily, Type } from '@/constants/typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useIsRTL } from '@/hooks/useIsRTL';
import { normalizeLanguage } from '@/lib/language';
import { HeaderTitle, headerTitleContainerStyle } from '@/components/HeaderTitle';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { t, i18n } = useTranslation();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const lang = normalizeLanguage(i18n.language);
  const isRTL = useIsRTL();

  return (
    <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          ...Shadow.card,
        },
        tabBarLabelStyle: {
          fontFamily: getFontFamily(lang, Type.tab.fontWeight),
          fontSize: Type.tab.fontSize,
          lineHeight: Type.tab.lineHeight,
          letterSpacing: Type.tab.letterSpacing,
          marginTop: -2,
        },
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: getFontFamily(lang, Type.h3.fontWeight),
          fontSize: Type.h3.fontSize,
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
            <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: t('expenses.title'),
          tabBarLabel: t('tabs.expenses'),
          headerTitle: () => <HeaderTitle title={t('expenses.title')} />,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'list.bullet.rectangle', android: 'receipt', web: 'receipt' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: t('loans.title'),
          tabBarLabel: t('tabs.loans'),
          headerTitle: () => <HeaderTitle title={t('loans.title')} />,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t('insights.title'),
          tabBarLabel: t('tabs.insights'),
          headerTitle: () => <HeaderTitle title={t('insights.title')} />,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'chart.pie.fill', android: 'pie_chart', web: 'pie_chart' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarLabel: t('tabs.settings'),
          headerTitle: () => <HeaderTitle title={t('settings.title')} />,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}
