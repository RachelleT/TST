import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { useAuthStore } from '@/lib/stores/auth';
import { useSyncStore } from '@/lib/stores/sync';
import { runSync } from '@/lib/sync';
import { t } from '@/lib/i18n';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const spacing = useSpacing();
  const { signOut } = useAuthStore();
  const { status, lastSyncedAt, errorMessage } = useSyncStore();
  const [syncing, setSyncing] = useState(false);

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      Alert.alert(t('Error'), t('Could not sign out. Please try again.'));
    }
  }

  async function handleForceSync() {
    setSyncing(true);
    try {
      await runSync();
    } catch (err) {
      console.error('Force sync failed', err);
    } finally {
      setSyncing(false);
    }
  }

  const lastSyncLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString()
    : t('Never');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]} edges={['bottom']}>
      <View style={[styles.container, { paddingHorizontal: spacing.pagePadding }]}>

        {/* ── Sync status ── */}
        <View style={[styles.section, { borderColor: colors.border.subtle }]}>
          <AppText variant="meta" color={colors.text.tertiary} style={styles.sectionLabel}>
            {t('SYNC')}
          </AppText>

          <View style={styles.syncRow}>
            <AppText variant="caption" color={colors.text.secondary}>
              {t('Last synced: ')}{lastSyncLabel}
            </AppText>
            {status === 'syncing' || syncing ? (
              <ActivityIndicator size="small" color={colors.accent.primary} />
            ) : null}
          </View>

          {status === 'error' && errorMessage ? (
            <AppText variant="caption" color="#C0392B" style={styles.errorText}>
              {errorMessage}
            </AppText>
          ) : null}

          <TouchableOpacity
            style={[styles.row, { borderColor: colors.border.subtle }]}
            onPress={handleForceSync}
            disabled={syncing || status === 'syncing'}
            accessibilityRole="button"
            accessibilityLabel={t('Sync now')}
          >
            <AppText variant="body" color={colors.text.primary}>{t('Sync now')}</AppText>
          </TouchableOpacity>
        </View>

        {/* ── Developer ── */}
        <View style={[styles.section, { borderColor: colors.border.subtle }]}>
          <AppText variant="meta" color={colors.text.tertiary} style={styles.sectionLabel}>
            {t('DEVELOPER')}
          </AppText>
          <TouchableOpacity
            style={[styles.row, { borderColor: colors.border.subtle }]}
            onPress={() => router.push('/_dev/components')}
            accessibilityRole="button"
          >
            <AppText variant="body" color={colors.text.primary}>
              {t('Component gallery')}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ── Account ── */}
        <View style={[styles.section, { borderColor: colors.border.subtle }]}>
          <AppText variant="meta" color={colors.text.tertiary} style={styles.sectionLabel}>
            {t('ACCOUNT')}
          </AppText>
          <TouchableOpacity
            style={[styles.row, { borderColor: colors.border.subtle }]}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel={t('Sign out')}
          >
            <AppText variant="body" color="#C0392B">{t('Sign out')}</AppText>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingTop: 24 },
  section: { marginBottom: 32 },
  sectionLabel: { marginBottom: 8, letterSpacing: 0.8 },
  syncRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  errorText: { marginBottom: 8, color: '#C0392B' },
  row: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
