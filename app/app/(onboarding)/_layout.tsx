import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="notifications" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="starter-words" />
    </Stack>
  );
}
