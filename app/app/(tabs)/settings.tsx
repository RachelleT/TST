import { useCallback, useState } from 'react';
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
  TextInput,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { useAuthStore } from '@/lib/stores/auth';
import { useProfileStore } from '@/lib/stores/profile';
import { useSyncStore } from '@/lib/stores/sync';
import { useNotificationStore } from '@/lib/stores/notifications';
import { runSync } from '@/lib/sync';
import { registerForPermissions, scheduleTestNotification } from '@/lib/notifications';
import { t } from '@/lib/i18n';
import { getDb } from '@/lib/db/migrations';
import type { NotificationSettings } from '@/lib/notifications';
import type { QuizFormat } from '@tst/shared';

// ── Shared primitives ─────────────────────────────────────────────────────────

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

function Row({
  label,
  sublabel,
  onPress,
  right,
  destructive,
  disabled,
}: {
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, { borderTopColor: colors.border.subtle }]}
      onPress={onPress}
      disabled={!onPress || disabled}
      accessibilityRole={onPress ? 'button' : 'none'}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={destructive ? '#DC2626' : disabled ? colors.text.tertiary : colors.text.primary}>
          {label}
        </AppText>
        {sublabel ? (
          <AppText variant="caption" color={colors.text.tertiary} style={{ marginTop: 2 }}>
            {sublabel}
          </AppText>
        ) : null}
      </View>
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

// ── Segmented control ─────────────────────────────────────────────────────────

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: colors.border.subtle, flexDirection: 'column', alignItems: 'flex-start' }]}>
      <AppText variant="body" color={colors.text.primary} style={{ marginBottom: 10 }}>
        {label}
      </AppText>
      <View style={[styles.segmented, { backgroundColor: colors.surface.elevated, borderColor: colors.border.subtle }]}>
        {options.map(opt => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              onPress={() => onChange(opt.value)}
              style={[
                styles.segment,
                active && { backgroundColor: colors.accent.primary },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
            >
              <AppText
                variant="caption"
                style={{
                  color: active ? '#FFFFFF' : colors.text.secondary,
                  fontFamily: 'Inter_500Medium',
                }}
              >
                {opt.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Notification time picker ──────────────────────────────────────────────────

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function parseTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h ?? 8, minute: m ?? 0 };
}

function TimePickerRow({ label, timeStr, onChange }: { label: string; timeStr: string; onChange: (t: string) => void }) {
  const { colors } = useTheme();
  const { hour, minute } = parseTime(timeStr);
  const adj = (dh: number, dm: number) => {
    const nh = (hour + dh + 24) % 24;
    const nm = (Math.round((minute + dm + 60) / 5) * 5) % 60;
    onChange(`${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`);
  };
  return (
    <View style={[styles.row, { borderTopColor: colors.border.subtle }]}>
      <AppText variant="body" color={colors.text.primary} style={{ flex: 1 }}>{label}</AppText>
      <View style={styles.timePicker}>
        {[
          { val: hour % 12 === 0 ? 12 : hour % 12, dh: 1, dh2: -1, dm: 0, dm2: 0 },
          { val: minute, dh: 0, dh2: 0, dm: 5, dm2: -5 },
        ].map((u, i) => (
          <View key={i} style={[styles.timeUnit, i === 1 && { marginLeft: 6 }]}>
            <TouchableOpacity onPress={() => adj(u.dh, u.dm)} hitSlop={8}>
              <AppText style={{ color: colors.accent.primary, fontSize: 16, lineHeight: 20 }}>▲</AppText>
            </TouchableOpacity>
            <AppText style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 18, color: colors.text.primary, minWidth: 26, textAlign: 'center' }}>
              {String(i === 0 ? (hour % 12 === 0 ? 12 : hour % 12) : minute).padStart(2, '0')}
            </AppText>
            <TouchableOpacity onPress={() => adj(u.dh2, u.dm2)} hitSlop={8}>
              <AppText style={{ color: colors.accent.primary, fontSize: 16, lineHeight: 20 }}>▼</AppText>
            </TouchableOpacity>
          </View>
        ))}
        <AppText variant="caption" color={colors.text.tertiary} style={{ marginLeft: 6, alignSelf: 'center' }}>
          {hour < 12 ? 'AM' : 'PM'}
        </AppText>
      </View>
    </View>
  );
}

function DaySelector({ activeDays, onChange }: { activeDays: string[]; onChange: (d: string[]) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: colors.border.subtle, flexDirection: 'column', alignItems: 'flex-start' }]}>
      <AppText variant="body" color={colors.text.primary} style={{ marginBottom: 10 }}>{t('Active days')}</AppText>
      <View style={styles.dayRow}>
        {DAY_KEYS.map((key, i) => {
          const active = activeDays.includes(key);
          return (
            <TouchableOpacity
              key={key}
              onPress={() => {
                const next = active ? activeDays.filter(d => d !== key) : [...activeDays, key];
                if (next.length > 0) onChange(next);
              }}
              style={[styles.dayChip, {
                backgroundColor: active ? colors.accent.primary : colors.surface.elevated,
                borderColor: active ? colors.accent.primary : colors.border.subtle,
              }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
            >
              <AppText style={{ color: active ? '#FFFFFF' : colors.text.secondary, fontFamily: 'Inter_500Medium', fontSize: 12 }}>
                {DAY_LABELS[i]}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── PROFILE section ───────────────────────────────────────────────────────────

function ProfileSection() {
  const { colors } = useTheme();
  const { session, signOut, deleteAccount } = useAuthStore();
  const { displayName, update } = useProfileStore();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const email = session?.user.email ?? '';

  async function saveName() {
    if (!session?.user.id) return;
    setSavingName(true);
    await update(session.user.id, { displayName: nameInput.trim() || null });
    setSavingName(false);
    setEditingName(false);
  }

  async function handleExport() {
    if (!session?.user.id) return;
    setExporting(true);
    try {
      const db = await getDb();
      const words = await db.getAllAsync(
        `SELECT word, part_of_speech, definition, example_sentence, synonyms, created_at
         FROM saved_words WHERE user_id = ? AND deleted = 0 ORDER BY created_at ASC`,
        [session.user.id],
      );
      const attempts = await db.getAllAsync(
        `SELECT saved_word_id, question_format, result, created_at
         FROM quiz_attempts WHERE user_id = ? ORDER BY created_at ASC`,
        [session.user.id],
      );
      const payload = {
        exportedAt: new Date().toISOString(),
        savedWords: words,
        quizAttempts: attempts,
      };
      await Share.share({
        title: 'My TST data',
        message: JSON.stringify(payload, null, 2),
      });
    } catch (e) {
      Alert.alert(t('Export failed'), String(e));
    } finally {
      setExporting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      t('Delete account'),
      t('This removes all your saved words, quiz history, and account data. Type DELETE to confirm.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Continue'),
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              t('Type DELETE to confirm'),
              undefined,
              async (input) => {
                if (input?.trim().toUpperCase() !== 'DELETE') return;
                setDeleting(true);
                try {
                  await deleteAccount();
                } catch (e) {
                  setDeleting(false);
                  Alert.alert(t('Error'), e instanceof Error ? e.message : String(e));
                }
              },
              'plain-text',
            );
          },
        },
      ],
    );
  }

  return (
    <Section title={t('PROFILE')}>
      {/* Display name */}
      <View style={[styles.row, { borderTopColor: colors.border.subtle, flexDirection: 'column', alignItems: 'flex-start' }]}>
        <AppText variant="body" color={colors.text.primary} style={{ marginBottom: 8 }}>
          {t('Display name')}
        </AppText>
        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.surface.elevated, color: colors.text.primary, borderColor: colors.accent.primary }]}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={saveName}
              accessibilityLabel={t('Display name input')}
            />
            <TouchableOpacity
              onPress={saveName}
              disabled={savingName}
              style={[styles.saveNameBtn, { backgroundColor: colors.accent.primary }]}
            >
              {savingName
                ? <ActivityIndicator color="#fff" size="small" />
                : <AppText style={{ color: '#fff', fontFamily: 'Inter_500Medium', fontSize: 13 }}>{t('Save')}</AppText>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEditingName(false); setNameInput(displayName ?? ''); }} style={{ marginLeft: 8, padding: 4 }}>
              <AppText style={{ color: colors.text.tertiary, fontSize: 16 }}>✕</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setEditingName(true); setNameInput(displayName ?? ''); }}>
            <AppText variant="body" color={displayName ? colors.text.primary : colors.text.tertiary}>
              {displayName ?? t('Tap to set a name')}
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Email (read-only) */}
      <View style={[styles.row, { borderTopColor: colors.border.subtle }]}>
        <AppText variant="body" color={colors.text.primary} style={{ flex: 1 }}>{t('Email')}</AppText>
        <AppText variant="caption" color={colors.text.tertiary}>{email}</AppText>
      </View>

      {/* Export */}
      <Row
        label={t('Export my data')}
        sublabel={t('Downloads your saved words and quiz history as JSON')}
        onPress={handleExport}
        disabled={exporting}
        right={exporting ? <ActivityIndicator size="small" color={colors.accent.primary} style={{ marginLeft: 8 }} /> : undefined}
      />

      {/* Delete account */}
      <Row
        label={deleting ? t('Deleting…') : t('Delete account')}
        onPress={deleting ? undefined : confirmDelete}
        destructive
        disabled={deleting}
      />
    </Section>
  );
}

// ── NOTIFICATIONS section ─────────────────────────────────────────────────────

function NotificationsSection() {
  const { colors } = useTheme();
  const { session } = useAuthStore();
  const { settings, permissionStatus, updateSettings, refreshPermission } = useNotificationStore();

  useFocusEffect(useCallback(() => { refreshPermission(); }, [refreshPermission]));

  async function handleRequestPermission() {
    const status = await registerForPermissions();
    await refreshPermission();
    if (status === 'granted' && session?.user.id) {
      await updateSettings(session.user.id, { enabled: true });
    }
  }

  function patch(p: Partial<NotificationSettings>) {
    if (!session?.user.id) return;
    updateSettings(session.user.id, p).catch(console.error);
  }

  return (
    <Section title={t('NOTIFICATIONS')}>
      {permissionStatus === 'denied' && (
        <TouchableOpacity
          style={[styles.deniedBanner, { backgroundColor: colors.surface.elevated, borderColor: colors.border.subtle }]}
          onPress={() => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings()}
        >
          <AppText variant="caption" color={colors.text.secondary} style={{ flex: 1, lineHeight: 18 }}>
            {t('Notifications are disabled. Tap to open Settings and turn them on.')}
          </AppText>
          <AppText variant="caption" color={colors.accent.primary} style={{ marginLeft: 8 }}>{t('Open →')}</AppText>
        </TouchableOpacity>
      )}
      {(permissionStatus === 'undetermined' || permissionStatus === null) && (
        <Row label={t('Turn on notifications')} onPress={handleRequestPermission} />
      )}
      <ToggleRow
        label={t('Enable reminders')}
        sublabel={t('Three gentle pings a day')}
        value={settings.enabled}
        onChange={v => patch({ enabled: v })}
      />
      {settings.enabled && permissionStatus === 'granted' && (
        <>
          <TimePickerRow label={t('Morning')}  timeStr={settings.morningTime}  onChange={v => patch({ morningTime: v })} />
          <TimePickerRow label={t('Midday')}   timeStr={settings.noonTime}     onChange={v => patch({ noonTime: v })} />
          <TimePickerRow label={t('Evening')}  timeStr={settings.eveningTime}  onChange={v => patch({ eveningTime: v })} />
          <DaySelector activeDays={settings.days} onChange={days => patch({ days })} />
          <Row
            label={t('Send test notification')}
            sublabel={t('Fires in 5 seconds — put the app in the background')}
            onPress={() => {
              if (!session?.user.id) return;
              scheduleTestNotification(session.user.id)
                .then(() => Alert.alert(t('On its way'), t('Background the app — notification fires in 5 s.')))
                .catch(e => Alert.alert(t('Error'), String(e)));
            }}
          />
        </>
      )}
    </Section>
  );
}

// ── APP section ───────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<QuizFormat, string> = {
  def_to_word:        'Definition → Word',
  word_to_def:        'Word → Definition',
  synonym:            'Pick the synonym',
  fill_in_sentence:   'Fill in the blank',
  word_for_description: 'Word for a description',
};

function AppSection() {
  const { session } = useAuthStore();
  const { quizSettings, themePreference, reduceMotion, analyticsOptedIn, update } = useProfileStore();

  function patch(p: Parameters<typeof update>[1]) {
    if (!session?.user.id) return;
    update(session.user.id, p).catch(console.error);
  }

  function toggleFormat(fmt: QuizFormat) {
    const current = quizSettings.enabledFormats;
    const next = current.includes(fmt)
      ? current.filter(f => f !== fmt)
      : [...current, fmt];
    if (next.length === 0) return; // always keep at least one
    patch({ quizSettings: { ...quizSettings, enabledFormats: next } });
  }

  const appVersion = Constants.expoConfig?.version ?? '—';

  return (
    <Section title={t('APP')}>
      <Segmented
        label={t('Quiz length')}
        options={[
          { label: '5',  value: 5  as const },
          { label: '10', value: 10 as const },
          { label: '15', value: 15 as const },
          { label: '20', value: 20 as const },
        ]}
        value={quizSettings.defaultLength}
        onChange={v => patch({ quizSettings: { ...quizSettings, defaultLength: v as 5 | 10 | 15 | 20 } })}
      />

      {/* Quiz formats */}
      {(Object.keys(FORMAT_LABELS) as QuizFormat[]).map(fmt => (
        <ToggleRow
          key={fmt}
          label={t(FORMAT_LABELS[fmt])}
          value={quizSettings.enabledFormats.includes(fmt)}
          onChange={() => toggleFormat(fmt)}
        />
      ))}

      <Segmented
        label={t('Theme')}
        options={[
          { label: t('System'), value: 'system' as const },
          { label: t('Light'),  value: 'light'  as const },
          { label: t('Dark'),   value: 'dark'   as const },
        ]}
        value={themePreference}
        onChange={v => patch({ themePreference: v })}
      />

      <ToggleRow
        label={t('Reduce motion')}
        sublabel={t('Disables card flip and slide animations')}
        value={reduceMotion ?? false}
        onChange={v => patch({ reduceMotion: v })}
      />

      <ToggleRow
        label={t('Analytics')}
        sublabel={t('Helps improve TST — no personal data shared')}
        value={analyticsOptedIn}
        onChange={v => patch({ analyticsOptedIn: v })}
      />

      <Row
        label={t('Version')}
        right={<AppText variant="caption" color={useTheme().colors.text.tertiary}>{appVersion}</AppText>}
      />
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
    Alert.alert(t('Sign out'), t('Are you sure?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Sign out'), style: 'destructive',
        onPress: async () => {
          try { await signOut(); }
          catch { Alert.alert(t('Error'), t('Could not sign out. Please try again.')); }
        },
      },
    ]);
  }

  async function handleForceSync() {
    setSyncing(true);
    try { await runSync(); }
    catch (e) { console.error('Force sync failed', e); }
    finally { setSyncing(false); }
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
        <ProfileSection />
        <NotificationsSection />
        <AppSection />

        {/* Sync */}
        <Section title={t('SYNC')}>
          <View style={[styles.row, { borderTopColor: colors.border.subtle }]}>
            <AppText variant="caption" color={colors.text.secondary}>{t('Last synced: ')}{lastSyncLabel}</AppText>
            {(status === 'syncing' || syncing) && <ActivityIndicator size="small" color={colors.accent.primary} />}
          </View>
          {status === 'error' && errorMessage && (
            <AppText variant="caption" color="#DC2626" style={{ marginBottom: 4 }}>{errorMessage}</AppText>
          )}
          <Row label={t('Sync now')} onPress={handleForceSync} />
        </Section>

        {/* Account */}
        <Section title={t('ACCOUNT')}>
          <Row label={t('Sign out')} onPress={handleSignOut} destructive />
        </Section>

        {/* Developer */}
        <Section title={t('DEVELOPER')}>
          <Row label={t('Component gallery')} onPress={() => {
            const { router } = require('expo-router') as typeof import('expo-router');
            router.push('/_dev/components');
          }} />
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
  timePicker: { flexDirection: 'row', alignItems: 'center' },
  timeUnit: { alignItems: 'center', gap: 2 },
  dayRow: { flexDirection: 'row', gap: 8 },
  dayChip: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  nameInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveNameBtn: {
    marginLeft: 8,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
