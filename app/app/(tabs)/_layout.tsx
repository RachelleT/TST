import { useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { lightColors, darkColors } from '@/lib/theme/colors';
import { useAuthStore } from '@/lib/stores/auth';
import { useNotificationStore } from '@/lib/stores/notifications';
import { useProfileStore } from '@/lib/stores/profile';
import { useThemePreference } from '@/lib/theme/ThemePreferenceContext';

export default function TabLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const { session } = useAuthStore();
  const { initialized: notifInitialized, initialize: initNotifications, runSchedule } = useNotificationStore();
  const { load: loadProfile, themePreference } = useProfileStore();
  const { setPreference } = useThemePreference();

  useEffect(() => {
    if (!session?.user.id) return;
    const userId = session.user.id;

    // Load profile settings (theme, quiz prefs, etc.) and sync theme context.
    loadProfile(userId).catch(console.error);

    // Load notification settings and run the scheduling pass.
    if (!notifInitialized) {
      initNotifications(userId).then(() => runSchedule(userId)).catch(console.error);
    } else {
      runSchedule(userId).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  // Keep the theme context in sync whenever the stored preference changes.
  useEffect(() => {
    setPreference(themePreference);
  }, [themePreference, setPreference]);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
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
          headerShown: false,
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
          headerShown: false,
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
