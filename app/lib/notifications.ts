/**
 * Notification engine.
 *
 * Public API:
 *   configureNotificationHandler  – call once at app startup (suppresses foreground banners)
 *   setupAndroidChannel           – call once at app startup on Android
 *   scheduleNotifications         – cancel + rebuild the next 14 days
 *   cancelAllNotifications        – cancel everything
 *   pickAndPersistDayWord         – select (and cache) today's word
 *   buildNotificationContent      – title/body copy for a slot
 *   scheduleTestNotification      – fire a real notification 5 seconds from now (dev/testing)
 *   registerForPermissions        – request OS permission
 *   getPermissionStatus           – read current status without prompting
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDb } from './db/migrations';
import { getMetaValue, setMetaValue } from './db/crud';
import type { SavedWord } from '@tst/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationSlot = 'morning' | 'noon' | 'evening';

export interface NotificationSettings {
  enabled: boolean;
  morningTime: string;   // "HH:MM"
  noonTime: string;
  eveningTime: string;
  days: string[];        // ['mon','tue','wed','thu','fri','sat','sun']
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  morningTime: '08:00',
  noonTime: '12:00',
  eveningTime: '19:00',
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
};

const MIN_LIBRARY_SIZE = 5;
const DAY_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const ANDROID_CHANNEL_ID = 'tst-reminders';

// ── App-startup setup ─────────────────────────────────────────────────────────

/**
 * Suppress the system notification banner/sound when the app is in the foreground.
 * Call once at app startup (root _layout.tsx).
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  false,
      shouldShowBanner: false,
      shouldShowList:   false,
      shouldPlaySound:  false,
      shouldSetBadge:   false,
    }),
  });
}

/**
 * Create the Android notification channel. No-op on iOS.
 * Call once at app startup before scheduling anything.
 */
export async function setupAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daily reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [],
    enableVibrate: false,
    sound: null,
  });
}

// ── Permission ────────────────────────────────────────────────────────────────

export async function registerForPermissions(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') return 'denied';
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return 'granted';
  if (existing === 'denied')  return 'denied';
  const { status } = await Notifications.requestPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

// ── Day-word selection ────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayWordKey(userId: string): string {
  return `day_word_${userId}_${todayISO()}`;
}

export async function pickAndPersistDayWord(userId: string): Promise<SavedWord | null> {
  const db = await getDb();

  const rows = await db.getAllAsync<{
    id: string; word: string; part_of_speech: string; pronunciation: string | null;
    definition: string; example_sentence: string | null; synonyms: string | null;
    card_number: number; created_at: string; updated_at: string;
    sense_index: number; user_id: string;
  }>(
    `SELECT * FROM saved_words WHERE user_id = ? AND deleted = 0`,
    [userId],
  );

  if (rows.length < MIN_LIBRARY_SIZE) return null;

  // Return today's cached choice if it exists.
  const cached = await getMetaValue(dayWordKey(userId));
  if (cached) {
    const found = rows.find(r => r.id === cached);
    if (found) return rowToSavedWord(found);
  }

  // Words used as word-of-the-day in the last 7 days.
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentRows = await db.getAllAsync<{ saved_word_id: string }>(
    `SELECT saved_word_id FROM notification_events
     WHERE user_id = ? AND slot = 'morning' AND fired_at > ?`,
    [userId, cutoff],
  );
  const recentIds = new Set(recentRows.map(r => r.saved_word_id));

  let candidates = rows.filter(r => !recentIds.has(r.id));
  if (candidates.length === 0) candidates = rows;

  // Incorrect quiz attempts in the last 14 days for weighting.
  const attemptsRows = await db.getAllAsync<{ saved_word_id: string; result: string }>(
    `SELECT saved_word_id, result FROM quiz_attempts
     WHERE user_id = ? AND created_at > ?`,
    [userId, new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()],
  );
  const incorrectCounts: Record<string, number> = {};
  for (const a of attemptsRows) {
    if (a.result === 'incorrect') {
      incorrectCounts[a.saved_word_id] = (incorrectCounts[a.saved_word_id] ?? 0) + 1;
    }
  }

  const timesUsedRows = await db.getAllAsync<{ saved_word_id: string; count: number }>(
    `SELECT saved_word_id, COUNT(*) as count FROM notification_events
     WHERE user_id = ? AND slot = 'morning'
     GROUP BY saved_word_id`,
    [userId],
  );
  const timesUsed: Record<string, number> = {};
  for (const r of timesUsedRows) timesUsed[r.saved_word_id] = r.count;

  const scored = candidates.map(w => ({
    word: w,
    score: 2.0 * (incorrectCounts[w.id] ?? 0)
         + 1.0 / (1 + (timesUsed[w.id] ?? 0))
         + 0.5 * Math.random(),
  }));
  scored.sort((a, b) => b.score - a.score);

  const chosen = scored[0].word;
  await setMetaValue(dayWordKey(userId), chosen.id);
  return rowToSavedWord(chosen);
}

function rowToSavedWord(row: {
  id: string; user_id: string; word: string; sense_index: number;
  part_of_speech: string; pronunciation: string | null; definition: string;
  example_sentence: string | null; synonyms: string | null;
  card_number: number; created_at: string; updated_at: string;
}): SavedWord {
  return {
    id: row.id,
    userId: row.user_id,
    word: row.word,
    senseIndex: row.sense_index,
    partOfSpeech: row.part_of_speech as SavedWord['partOfSpeech'],
    pronunciation: row.pronunciation ?? '',
    definition: row.definition,
    exampleSentence: row.example_sentence ?? '',
    synonyms: row.synonyms ? (JSON.parse(row.synonyms) as string[]) : [],
    cardNumber: row.card_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Notification copy ─────────────────────────────────────────────────────────

export function buildNotificationContent(
  word: SavedWord,
  slot: NotificationSlot,
): { title: string; body: string } {
  switch (slot) {
    case 'morning':
      return {
        title: `Word of the day · ${word.word}`,
        body: word.definition,
      };
    case 'noon': {
      const sentence = word.exampleSentence
        ? word.exampleSentence.replace(new RegExp(word.word, 'gi'), '______')
        : `${word.word} — tap to see an example.`;
      return {
        title: 'Same word · used in a sentence',
        body: sentence,
      };
    }
    case 'evening': {
      const synonym = word.synonyms[0] ?? 'a related word';
      return {
        title: 'Same word · one more cue',
        body: `It's similar to "${synonym}." Tap to reveal.`,
      };
    }
  }
}

// ── Scheduling ────────────────────────────────────────────────────────────────

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h ?? 8, minute: m ?? 0 };
}

function slotTime(settings: NotificationSettings, slot: NotificationSlot) {
  if (slot === 'morning') return parseTime(settings.morningTime);
  if (slot === 'noon')    return parseTime(settings.noonTime);
  return parseTime(settings.eveningTime);
}

function makeContent(word: SavedWord, slot: NotificationSlot, savedWordId: string) {
  const { title, body } = buildNotificationContent(word, slot);
  return {
    title,
    body,
    sound: false as const,
    data: { savedWordId, slot },
    ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
  };
}

export async function scheduleNotifications(
  settings: NotificationSettings,
  word: SavedWord,
): Promise<void> {
  await cancelAllNotifications();
  if (!settings.enabled) return;
  if (await getPermissionStatus() !== 'granted') return;

  const slots: NotificationSlot[] = ['morning', 'noon', 'evening'];
  const now = new Date();
  let scheduled = 0;

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);

    const dow = DAY_ABBREV[date.getDay()];
    if (!settings.days.includes(dow)) continue;

    for (const slot of slots) {
      const { hour, minute } = slotTime(settings, slot);

      const triggerDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hour,
        minute,
        0,
        0,
      );

      if (triggerDate <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: makeContent(word, slot, word.id),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      scheduled++;
    }
  }

  console.log(`[notifications] scheduled ${scheduled} notifications`);
}

/**
 * Fire a real morning-slot notification 5 seconds from now using an actual
 * saved word. Falls back to a placeholder only if the library is empty.
 */
export async function scheduleTestNotification(userId: string): Promise<void> {
  if (await getPermissionStatus() !== 'granted') {
    console.warn('[notifications] permission not granted, cannot test');
    return;
  }

  // Try to get today's chosen word first; if the library is too small for the
  // normal algorithm, just grab any saved word directly.
  let word = await pickAndPersistDayWord(userId);

  if (!word) {
    const db = await getDb();
    const row = await db.getFirstAsync<{
      id: string; user_id: string; word: string; sense_index: number;
      part_of_speech: string; pronunciation: string | null; definition: string;
      example_sentence: string | null; synonyms: string | null;
      card_number: number; created_at: string; updated_at: string;
    }>(
      `SELECT * FROM saved_words WHERE user_id = ? AND deleted = 0 LIMIT 1`,
      [userId],
    );
    if (row) word = rowToSavedWord(row);
  }

  const content = word
    ? buildNotificationContent(word, 'morning')
    : { title: 'TST · test', body: 'Save a word to see a real notification.' };

  const fireAt = new Date(Date.now() + 5_000);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      sound: false,
      data: word ? { savedWordId: word.id, slot: 'morning' } : { type: 'test' },
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
  console.log('[notifications] test notification scheduled for', fireAt.toISOString());
}

export async function scheduleReengagementNudge(
  morningTime: string,
  userId: string,
): Promise<void> {
  if (await getPermissionStatus() !== 'granted') return;

  const lastNudge = await getMetaValue(`reengagement_nudge_${userId}`);
  if (lastNudge) {
    const daysSince = (Date.now() - new Date(lastNudge).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return;
  }

  const { hour, minute } = parseTime(morningTime);
  const fireAt = new Date();
  fireAt.setDate(fireAt.getDate() + 7);
  fireAt.setHours(hour, minute, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'TST',
      body: "It's been a few days. Adding a word or two will start your daily reminders.",
      sound: false,
      data: { type: 'reengagement' },
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });

  await setMetaValue(`reengagement_nudge_${userId}`, new Date().toISOString());
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Settings persistence ──────────────────────────────────────────────────────

export async function loadNotificationSettings(userId: string): Promise<NotificationSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ notification_settings: string | null }>(
    `SELECT notification_settings FROM profiles WHERE id = ?`,
    [userId],
  );
  if (!row?.notification_settings) return DEFAULT_SETTINGS;
  try {
    const raw = JSON.parse(row.notification_settings) as Record<string, unknown>;
    return {
      enabled:     (raw.enabled      as boolean)  ?? DEFAULT_SETTINGS.enabled,
      morningTime: (raw.morning_time as string)   ?? DEFAULT_SETTINGS.morningTime,
      noonTime:    (raw.noon_time    as string)   ?? DEFAULT_SETTINGS.noonTime,
      eveningTime: (raw.evening_time as string)   ?? DEFAULT_SETTINGS.eveningTime,
      days:        (raw.days         as string[]) ?? DEFAULT_SETTINGS.days,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveNotificationSettings(
  userId: string,
  settings: NotificationSettings,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const json = JSON.stringify({
    enabled:      settings.enabled,
    morning_time: settings.morningTime,
    noon_time:    settings.noonTime,
    evening_time: settings.eveningTime,
    days:         settings.days,
    sound:        false,
    vibration:    false,
  });
  await db.runAsync(
    `UPDATE profiles SET notification_settings = ?, local_updated_at = ?, sync_pending = 1
     WHERE id = ?`,
    [json, now, userId],
  );
}
