import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { configureNotificationHandler, setupAndroidChannel } from '@/lib/notifications';
import { useFonts } from 'expo-font';
import {
  SourceSerif4_400Regular,
  SourceSerif4_500Medium,
  SourceSerif4_600SemiBold,
} from '@expo-google-fonts/source-serif-4';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemePreferenceProvider } from '@/lib/theme/ThemePreferenceContext';
import { useAuthStore } from '@/lib/stores/auth';
import { runMigrations } from '@/lib/db/migrations';
import { runnSyncIfStale } from '@/lib/sync';

SplashScreen.preventAutoHideAsync();

// Configure notification behaviour at module load time — must happen before
// any notification is scheduled or received.
configureNotificationHandler();
setupAndroidChannel().catch(console.error);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_500Medium,
    SourceSerif4_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <RootLayoutNav />
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const { session, initialized, initialize, profile, profileLoaded } = useAuthStore();

  useEffect(() => {
    runMigrations().catch(console.error);
    initialize();
  }, [initialize]);

  // Handle notification deep links — both cold-start and warm-resume.
  useEffect(() => {
    // Cold-start: notification that launched the app.
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) handleNotificationResponse(response);
    });

    // Warm-resume: notification tapped while app was in background.
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Wait until both auth and profile are resolved before routing.
    if (!initialized || !profileLoaded) return;

    SplashScreen.hideAsync();

    if (!session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(auth)/welcome' as any);
      return;
    }

    if (!profile?.onboardingCompletedAt) {
      // New user — send them through onboarding.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(onboarding)/notifications' as any);
      return;
    }

    // Returning user with completed onboarding.
    runnSyncIfStale().catch(console.error);
    router.replace('/(tabs)/library');
  }, [initialized, session, profile, profileLoaded]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
    </Stack>
  );
}

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, unknown>;

  if (data?.type === 'reengagement') {
    router.push('/(tabs)/search');
    return;
  }

  const savedWordId = data?.savedWordId as string | undefined;
  if (savedWordId) {
    // Navigate to the word's detail screen inside the library stack.
    router.push(`/(tabs)/library/${savedWordId}`);
  }
}
