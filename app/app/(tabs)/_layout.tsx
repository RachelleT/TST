import { useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { lightColors, darkColors } from '@/lib/theme/colors';

export default function TabLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        // ── Header ──
        headerStyle: {
          backgroundColor: colors.surface.card,
        },
        headerTitleStyle: {
          fontFamily: 'SourceSerif4_500Medium',
          fontSize: 18,
          color: colors.text.primary,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text.primary,
        // ── Tab bar ──
        tabBarStyle: {
          backgroundColor: colors.surface.card,
          borderTopColor: colors.border.subtle,
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          fontFamily: 'Inter_400Regular',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          headerShown: false, // library/_layout.tsx Stack handles its own header
          tabBarIcon: ({ color }) => (
            <SymbolView name="books.vertical" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <SymbolView name="magnifyingglass" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: 'Quiz',
          tabBarIcon: ({ color }) => (
            <SymbolView name="checkmark.circle" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <SymbolView name="gearshape" tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
