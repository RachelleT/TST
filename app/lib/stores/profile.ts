/**
 * Profile settings store.
 *
 * Owns: display name, quiz settings, theme preference, reduce-motion override,
 * analytics opt-in. All values live in the local SQLite `profiles` table and
 * are synced to Supabase on save.
 */

import { create } from 'zustand';
import { getDb } from '@/lib/db/migrations';
import { supabase } from '@/lib/supabase';
import type { QuizSettings } from '@tst/shared';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ProfileSettings {
  displayName: string | null;
  quizSettings: QuizSettings;
  themePreference: ThemePreference;
  reduceMotion: boolean | null;   // null = follow OS
  analyticsOptedIn: boolean;
}

const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  defaultLength: 10,
  enabledFormats: [
    'def_to_word',
    'word_to_def',
    'synonym',
    'fill_in_sentence',
    'word_for_description',
  ],
};

const DEFAULT_SETTINGS: ProfileSettings = {
  displayName: null,
  quizSettings: DEFAULT_QUIZ_SETTINGS,
  themePreference: 'system',
  reduceMotion: null,
  analyticsOptedIn: true,
};

interface ProfileState extends ProfileSettings {
  loaded: boolean;
  load: (userId: string) => Promise<void>;
  update: (userId: string, patch: Partial<ProfileSettings>) => Promise<void>;
}

async function readFromSQLite(userId: string): Promise<ProfileSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    display_name: string | null;
    quiz_settings: string | null;
    theme_preference: string | null;
    analytics_opted_in: number;
  }>(
    `SELECT display_name, quiz_settings, theme_preference, analytics_opted_in
     FROM profiles WHERE id = ?`,
    [userId],
  );

  if (!row) return DEFAULT_SETTINGS;

  let quizSettings = DEFAULT_QUIZ_SETTINGS;
  if (row.quiz_settings) {
    try {
      const raw = JSON.parse(row.quiz_settings) as Record<string, unknown>;
      quizSettings = {
        defaultLength: ((raw.default_length ?? raw.defaultLength) as QuizSettings['defaultLength']) ?? 10,
        enabledFormats: ((raw.enabled_formats ?? raw.enabledFormats) as QuizSettings['enabledFormats']) ?? DEFAULT_QUIZ_SETTINGS.enabledFormats,
      };
    } catch { /* keep default */ }
  }

  return {
    displayName: row.display_name ?? null,
    quizSettings,
    themePreference: (row.theme_preference as ThemePreference) ?? 'system',
    reduceMotion: null,   // not persisted — follows OS by default in v1
    analyticsOptedIn: row.analytics_opted_in !== 0,
  };
}

async function writeToSQLite(userId: string, s: ProfileSettings): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const quizJson = JSON.stringify({
    default_length: s.quizSettings.defaultLength,
    enabled_formats: s.quizSettings.enabledFormats,
  });
  await db.runAsync(
    `UPDATE profiles
     SET display_name = ?, quiz_settings = ?, theme_preference = ?,
         analytics_opted_in = ?, local_updated_at = ?, sync_pending = 1
     WHERE id = ?`,
    [
      s.displayName,
      quizJson,
      s.themePreference,
      s.analyticsOptedIn ? 1 : 0,
      now,
      userId,
    ],
  );
}

async function writeToSupabase(userId: string, s: ProfileSettings): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      display_name: s.displayName,
      quiz_settings: {
        default_length:   s.quizSettings.defaultLength,
        enabled_formats:  s.quizSettings.enabledFormats,
      },
      theme_preference:  s.themePreference,
      analytics_opted_in: s.analyticsOptedIn,
    })
    .eq('id', userId);
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  load: async (userId) => {
    const settings = await readFromSQLite(userId);
    set({ ...settings, loaded: true });
  },

  update: async (userId, patch) => {
    const next: ProfileSettings = {
      displayName:      patch.displayName      ?? get().displayName,
      quizSettings:     patch.quizSettings     ?? get().quizSettings,
      themePreference:  patch.themePreference  ?? get().themePreference,
      reduceMotion:     patch.reduceMotion     !== undefined ? patch.reduceMotion : get().reduceMotion,
      analyticsOptedIn: patch.analyticsOptedIn ?? get().analyticsOptedIn,
    };
    set(next);
    await writeToSQLite(userId, next);
    // Sync to Supabase in background — failure is non-fatal.
    writeToSupabase(userId, next).catch(console.error);
  },
}));
