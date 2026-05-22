import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/auth';

export default function SettingsScreen() {
  const { signOut } = useAuthStore();

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert(t('Error'), t('Could not sign out. Please try again.'));
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.devButton} onPress={() => router.push('/_dev/components')}>
        <Text style={styles.signOutText}>Component gallery (dev)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t('Sign out')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FAFAF8' },
  devButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E8F0FE',
  },
  signOutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0EE',
  },
  signOutText: { fontSize: 16, color: '#1A1A1A', fontFamily: 'Inter_500Medium' },
});
