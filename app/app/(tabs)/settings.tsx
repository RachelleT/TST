import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { useAuthStore } from '@/lib/stores/auth';
import { useSyncStore } from '@/lib/stores/sync';
import { useNotificationStore } from '@/lib/stores/notifications';
import { runSync } from '@/lib/sync';
import { registerForPermissions } from '@/lib/notifications';
import { t } from '@/lib/i18n';
import type { NotificationSettings } from '@/lib/notifications';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
];

function parseTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h ?? 8, minute: m ?? 0 };
}

function formatTime(hour: number, minute: number) {
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${period}`;
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { borderColor: colors.border.subtle }]}>
      <AppText variant="meta" color={colors.text.tertiary} style={styles.sectionLabel}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

// ── Row variants ──────────────────────────────────────────────────────────────

function Row({
  label,
  onPress,
  right,
  destructive,
}: {
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, { borderTopColor: colors.border.subtle }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
    >
      <AppText variant="body" color={destructive ? '#DC2626' : colors.text.primary}>
        {label}
      </AppText>
      {right}
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: colors.border.subtle }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.text.primary}>{label}</AppText>
        {sublabel ? (
          <AppText variant="caption" color={colors.text.tertiary} style={{ marginTop: 2 }}>
            {sublabel}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border.subtle, true: colors.accent.primary }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  );
}

// ── Time picker row ───────────────────────────────────────────────────────────

function TimePickerRow({
  label,
  timeStr,
  onChange,
}: {
  label: string;
  timeStr: string;
  onChange: (newTime: string) => void;
}) {
  const { colors } = useTheme();
  const { hour, minute } = parseTime(timeStr);

  function adjustHour(delta: number) {
    const next = (hour + delta + 24) % 24;
    onChange(`${String(next).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }

  function adjustMinute(delta: number) {
    // Step in 5-minute increments.
    const next = (minute + delta + 60) % 60;
    const snapped = Math.round(next / 5) * 5 % 60;
    onChange(`${String(hour).padStart(2, '0')}:${String(snapped).padStart(2, '0')}`);
  }

  return (
    <View style={[styles.row, { borderTopColor: colors.border.subtle, alignItems: 'center' }]}>
      <AppText variant="body" color={colors.text.primary} style={{ flex: 1 }}>
        {label}
      </AppText>
      <View style={styles.timePicker}>
        {/* Hour */}
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={() => adjustHour(1)} accessibilityLabel={t('Increase hour')} hitSlop={8}>
            <AppText style={{ color: colors.accent.primary, fontSize: 18, lineHeight: 22 }}>▲</AppText>
          </TouchableOpacity>
          <AppText variant="bodyMedium" color={colors.text.primary} style={styles.timeDigit}>
            {String(hour % 12 === 0 ? 12 : hour % 12).padStart(2, '0')}
          </AppText>
          <TouchableOpacity onPress={() => adjustHour(-1)} accessibilityLabel={t('Decrease hour')} hitSlop={8}>
            <AppText style={{ color: colors.accent.primary, fontSize: 18, lineHeight: 22 }}>▼</AppText>
          </TouchableOpacity>
        </View>

        <AppText variant="bodyMedium" color={colors.text.tertiary} style={{ marginHorizontal: 2, marginTop: 2 }}>
          :
        </AppText>

        {/* Minute */}
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={() => adjustMinute(5)} accessibilityLabel={t('Increase minute')} hitSlop={8}>
            <AppText style={{ color: colors.accent.primary, fontSize: 18, lineHeight: 22 }}>▲</AppText>
          </TouchableOpacity>
          <AppText variant="bodyMedium" color={colors.text.primary} style={styles.timeDigit}>
            {String(minute).padStart(2, '0')}
          </AppText>
          <TouchableOpacity onPress={() => adjustMinute(-5)} accessibilityLabel={t('Decrease minute')} hitSlop={8}>
            <AppText style={{ color: colors.accent.primary, fontSize: 18, lineHeight: 22 }}>▼</AppText>
          </TouchableOpacity>
        </View>

        {/* AM/PM */}
        <AppText variant="caption" color={colors.text.secondary} style={{ marginLeft: 6, marginTop: 2 }}>
          {hour < 12 ? 'AM' : 'PM'}
        </AppText>
      </View>
    </View>
  );
}

// ── Day-of-week selector ──────────────────────────────────────────────────────

function DaySelector({
  activeDays,
  onChange,
}: {
  activeDays: string[];
  onChange: (days: string[]) => void;
}) {
  const { colors } = useTheme();

  function toggle(key: string) {
    const next = activeDays.includes(key)
      ? activeDays.filter(d => d !== key)
      : [...activeDays, key];
    // Always keep at least one day active.
    if (next.length === 0) return;
    onChange(next);
  }

  return (
    <View style={[styles.row, { borderTopColor: colors.border.subtle, flexDirection: 'column', alignItems: 'flex-start' }]}>
      <AppText variant="body" color={colors.text.primary} style={{ marginBottom: 10 }}>
        {t('Active days')}
      </AppText>
      <View style={styles.dayRow}>
        {DAYS.map(({ key, label }) => {
          const active = activeDays.includes(key);
          return (
            <TouchableOpacity
              key={key}
              onPress={() => toggle(key)}
              style={[
                styles.dayChip,
                {
                  backgroundColor: active ? colors.accent.primary : colors.surface.elevated,
                  borderColor: active ? colors.accent.primary : colors.border.subtle,
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={key}
            >
              <AppText
                variant="caption"
                style={{
                  color: active ? '#FFFFFF' : colors.text.secondary,
                  fontFamily: 'Inter_500Medium',
                }}
              >
                {label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Notifications section ─────────────────────────────────────────────────────

function NotificationsSection() {
  const { colors } = useTheme();
  const { session } = useAuthStore();
  const {
    settings,
    permissionStatus,
    updateSettings,
    refreshPermission,
  } = useNotificationStore();

  // Refresh permission status when the Settings tab comes into focus
  // (the user may have returned from OS Settings).
  useFocusEffect(
    useCallback(() => {
      refreshPermission();
    }, [refreshPermission]),
  );

  async function handleRequestPermission() {
    const status = await registerForPermissions();
    await refreshPermission();
    if (status === 'granted' && session?.user.id) {
      await updateSettings(session.user.id, { enabled: true });
    }
  }

  function openOsSettings() {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  async function patch(p: Partial<NotificationSettings>) {
    if (!session?.user.id) return;
    await updateSettings(session.user.id, p);
  }

  return (
    <Section title={t('NOTIFICATIONS')}>
      {/* Permission denied banner */}
      {permissionStatus === 'denied' && (
        <TouchableOpacity
          style={[styles.deniedBanner, { backgroundColor: colors.surface.elevated, borderColor: colors.border.subtle }]}
          onPress={openOsSettings}
          accessibilityRole="button"
        >
          <AppText variant="caption" color={colors.text.secondary} style={{ flex: 1, lineHeight: 18 }}>
            {t('Notifications are disabled. Tap to open Settings and turn them on.')}
          </AppText>
          <AppText variant="caption" color={colors.accent.primary} style={{ marginLeft: 8 }}>
            {t('Open →')}
          </AppText>
        </TouchableOpacity>
      )}

      {/* Permission undetermined / not asked */}
      {(permissionStatus === 'undetermined' || permissionStatus === null) && (
        <TouchableOpacity
          style={[styles.row, { borderTopColor: colors.border.subtle }]}
          onPress={handleRequestPermission}
          accessibilityRole="button"
        >
          <AppText variant="body" color={colors.accent.primary}>
            {t('Turn on notifications')}
          </AppText>
        </TouchableOpacity>
      )}

      {/* Master toggle */}
      <ToggleRow
        label={t('Enable reminders')}
        sublabel={t('Three gentle pings a day')}
        value={settings.enabled}
        onChange={v => patch({ enabled: v })}
      />

      {settings.enabled && permissionStatus === 'granted' && (
        <>
          <TimePickerRow
            label={t('Morning')}
            timeStr={settings.morningTime}
            onChange={v => patch({ morningTime: v })}
          />
          <TimePickerRow
            label={t('Midday')}
            timeStr={settings.noonTime}
            onChange={v => patch({ noonTime: v })}
          />
          <TimePickerRow
            label={t('Evening')}
            timeStr={settings.eveningTime}
            onChange={v => patch({ eveningTime: v })}
          />
          <DaySelector
            activeDays={settings.days}
            onChange={days => patch({ days })}
          />
          <ToggleRow
            label={t('Sound')}
            value={settings.sound}
            onChange={v => patch({ sound: v })}
          />
          <ToggleRow
            label={t('Vibration')}
            value={settings.vibration}
            onChange={v => patch({ vibration: v })}
          />
        </>
      )}
    </Section>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

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
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : t('Never');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: spacing.pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications */}
        <NotificationsSection />

        {/* Sync */}
        <Section title={t('SYNC')}>
          <View style={[styles.row, { borderTopColor: colors.border.subtle }]}>
            <AppText variant="caption" color={colors.text.secondary}>
              {t('Last synced: ')}{lastSyncLabel}
            </AppText>
            {status === 'syncing' || syncing ? (
              <ActivityIndicator size="small" color={colors.accent.primary} />
            ) : null}
          </View>
          {status === 'error' && errorMessage ? (
            <AppText variant="caption" color="#DC2626" style={{ marginBottom: 8, marginTop: 2 }}>
              {errorMessage}
            </AppText>
          ) : null}
          <Row
            label={t('Sync now')}
            onPress={handleForceSync}
          />
        </Section>

        {/* Account */}
        <Section title={t('ACCOUNT')}>
          <Row label={t('Sign out')} onPress={handleSignOut} destructive />
        </Section>

        {/* Developer (kept for testing) */}
        <Section title={t('DEVELOPER')}>
          <Row
            label={t('Component gallery')}
            onPress={() => {
              const { router } = require('expo-router') as typeof import('expo-router');
              router.push('/_dev/components');
            }}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingTop: 24, paddingBottom: 48 },
  section: { marginBottom: 32 },
  sectionLabel: { marginBottom: 8, letterSpacing: 0.8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deniedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeUnit: {
    alignItems: 'center',
    gap: 2,
  },
  timeDigit: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 18,
    minWidth: 28,
    textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
