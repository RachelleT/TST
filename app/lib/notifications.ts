/**
 * Notification engine.
 *
 * Exposes:
 *   scheduleNotifications   – cancel + rebuild the next 14 days of notifications
 *   cancelAllNotifications  – cancel everything scheduled
 *   pickAndPersistDayWord   – select (and store) today's word
 *   buildNotificationContent – title/body copy for a slot
 *   registerForPermissions  – request OS permission
 *   getPermissionStatus     – read current status without prompting
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
  sound: boolean;
  vibration: boolean;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  morningTime: '08:00',
  noonTime: '12:00',
  eveningTime: '19:00',
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  sound: false,
  vibration: false,
};

const MIN_LIBRARY_SIZE = 5;

const DAY_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// ── Permission ────────────────────────────────────────────────────────────────

export async function registerForPermissions(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') return 'denied';

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return 'granted';
  if (existing === 'denied') return 'denied';

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

/**
 * Pick today's word using the weighted algorithm from the spec.
 * Persists the result in _meta so all three daily pings use the same word.
 * Returns null if the library is too small.
 */
export async function pickAndPersistDayWord(userId: string): Promise<SavedWord | null> {
  // Return cached choice for today if we already picked.
  const cached = await getMetaValue(dayWordKey(userId));

  const db = await getDb();

  // All non-deleted saved words.
  const rows = await db.getAllAsync<{
    id: string; word: string; part_of_speech: string; pronunciation: string | null;
    definition: string; example_sentence: string | null; synonyms: string | null;
    card_number: number; created_at: string; updated_at: string; sense_index: number;
    user_id: string;
  }>(
    `SELECT * FROM saved_words WHERE user_id = ? AND deleted = 0`,
    [userId],
  );

  if (rows.length < MIN_LIBRARY_SIZE) return null;

  // If we already have today's choice, find and return that word.
  if (cached) {
    const found = rows.find(r => r.id === cached);
    if (found) return rowToSavedWord(found);
  }

  // Recent word-of-the-day IDs (used as morning slot in the last 7 days).
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentRows = await db.getAllAsync<{ saved_word_id: string }>(
    `SELECT saved_word_id FROM notification_events
     WHERE user_id = ? AND slot = 'morning' AND fired_at > ?`,
    [userId, cutoff],
  );
  const recentIds = new Set(recentRows.map(r => r.saved_word_id));

  // Candidates — prefer words not used recently; fall back to all if needed.
  let candidates = rows.filter(r => !recentIds.has(r.id));
  if (candidates.length === 0) candidates = rows;

  // Quiz attempt counts for weighting.
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

  // Times-used as word-of-the-day (all time).
  const timesUsedRows = await db.getAllAsync<{ saved_word_id: string; count: number }>(
    `SELECT saved_word_id, COUNT(*) as count FROM notification_events
     WHERE user_id = ? AND slot = 'morning'
     GROUP BY saved_word_id`,
    [userId],
  );
  const timesUsed: Record<string, number> = {};
  for (const r of timesUsedRows) timesUsed[r.saved_word_id] = r.count;

  // Score each candidate.
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
      // Redact the word in the example sentence.
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

/**
 * Cancel all existing TST notifications and schedule the next 14 days.
 * Pass `word` as today's word; days 2-14 reuse the same word until the
 * app opens on those days and refreshes the choice.
 */
export async function scheduleNotifications(
  settings: NotificationSettings,
  word: SavedWord,
): Promise<void> {
  await cancelAllNotifications();

  if (!settings.enabled) return;

  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  // Configure foreground behaviour: no system UI when the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  false,
      shouldShowBanner: false,
      shouldShowList:   false,
      shouldPlaySound:  false,
      shouldSetBadge:   false,
    }),
  });

  const slots: NotificationSlot[] = ['morning', 'noon', 'evening'];
  const now = new Date();

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);

    const dow = DAY_ABBREV[date.getDay()];
    if (!settings.days.includes(dow)) continue;

    for (const slot of slots) {
      const { hour, minute } = slotTime(settings, slot);

      const triggerDate = new Date(date);
      triggerDate.setHours(hour, minute, 0, 0);

      // Skip notifications that are in the past.
      if (triggerDate <= now) continue;

      const content = buildNotificationContent(word, slot);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          sound: settings.sound ? 'default' : undefined,
          vibrate: settings.vibration ? [0, 250, 250, 250] : [],
          data: {
            savedWordId: word.id,
            slot,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }
  }
}

/**
 * Schedule the re-engagement nudge if the library is too small.
 * Fires once, 7 days from now, at the user's morning time.
 */
export async function scheduleReengagementNudge(
  morningTime: string,
  userId: string,
): Promise<void> {
  const status = await getPermissionStatus();
  if (status !== 'granted') return;

  // Check if we already scheduled a nudge recently.
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
      data: { type: 'reengagement' },
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

// ── Settings persistence (SQLite) ─────────────────────────────────────────────

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
      enabled:      (raw.enabled      as boolean)  ?? DEFAULT_SETTINGS.enabled,
      morningTime:  (raw.morning_time as string)   ?? DEFAULT_SETTINGS.morningTime,
      noonTime:     (raw.noon_time    as string)   ?? DEFAULT_SETTINGS.noonTime,
      eveningTime:  (raw.evening_time as string)   ?? DEFAULT_SETTINGS.eveningTime,
      days:         (raw.days         as string[]) ?? DEFAULT_SETTINGS.days,
      sound:        (raw.sound        as boolean)  ?? DEFAULT_SETTINGS.sound,
      vibration:    (raw.vibration    as boolean)  ?? DEFAULT_SETTINGS.vibration,
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
  // Store with snake_case keys to match Supabase schema.
  const json = JSON.stringify({
    enabled:      settings.enabled,
    morning_time: settings.morningTime,
    noon_time:    settings.noonTime,
    evening_time: settings.eveningTime,
    days:         settings.days,
    sound:        settings.sound,
    vibration:    settings.vibration,
  });
  await db.runAsync(
    `UPDATE profiles SET notification_settings = ?, local_updated_at = ?, sync_pending = 1
     WHERE id = ?`,
    [json, now, userId],
  );
}
