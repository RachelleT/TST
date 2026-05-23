import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { lightColors, darkColors } from '@/lib/theme/colors';

export default function LibraryLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface.card },
        headerTitleStyle: {
          fontFamily: 'SourceSerif4_500Medium',
          fontSize: 18,
          color: colors.text.primary,
        },
        headerShadowVisible: false,
        headerTintColor: colors.accent.primary,
        headerBackTitle: 'Library',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Library' }} />
      <Stack.Screen name="[wordId]" options={{ title: '' }} />
      <Stack.Screen name="lookup" options={{ title: '' }} />
    </Stack>
  );
}
