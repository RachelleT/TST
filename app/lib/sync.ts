import { supabase } from './supabase';
import { getDb } from './db/migrations';
import { getPendingRows, markSynced, setMetaValue, getMetaValue } from './db/crud';
import { useSyncStore } from './stores/sync';

const SYNC_DEBOUNCE_MS = 2000;
const SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;
const FACTS_TTL_MS = 24 * 60 * 60 * 1000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function enqueueSyncDebounced(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runSync().catch(console.error);
  }, SYNC_DEBOUNCE_MS);
}

export async function runnSyncIfStale(): Promise<void> {
  const lastSync = await getMetaValue('last_sync_at');
  if (!lastSync) {
    await runSync();
    return;
  }
  const elapsed = Date.now() - new Date(lastSync).getTime();
  if (elapsed > SYNC_MIN_INTERVAL_MS) {
    await runSync();
  }
}

export async function runSync(): Promise<void> {
  const { setSyncing, setSuccess, setError } = useSyncStore.getState();

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  const userId = sessionData.session.user.id;

  setSyncing();
  try {
    // Push local changes
    await pushProfiles(userId);
    await pushSavedWords(userId);
    await pushFactAssignments(userId);

    // Pull remote changes
    await pullProfile(userId);
    await pullSavedWords(userId);
    await pullFactAssignments(userId);

    // Refresh facts catalog if stale
    await refreshFactsIfStale();

    await setMetaValue('last_sync_at', new Date().toISOString());
    setSuccess();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    setError(message);
    if (message.includes('JWT') || message.includes('auth')) {
      await supabase.auth.signOut();
    }
  }
}

// ─── profiles ────────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  display_name: string | null;
  notification_settings: string | null;
  quiz_settings: string | null;
  interest_areas: string | null;
  analytics_opted_in: number;
  theme_preference: string;
  created_at: string;
  updated_at: string;
  local_updated_at: string;
  sync_pending: number;
}

async function pushProfiles(userId: string): Promise<void> {
  const pending = await getPendingRows<ProfileRow>('profiles');
  for (const row of pending) {
    if (row.id !== userId) continue;
    const { error } = await supabase.from('profiles').upsert({
      id: row.id,
      display_name: row.display_name,
      notification_settings: row.notification_settings
        ? JSON.parse(row.notification_settings)
        : null,
      quiz_settings: row.quiz_settings ? JSON.parse(row.quiz_settings) : null,
      interest_areas: row.interest_areas ? JSON.parse(row.interest_areas) : null,
      analytics_opted_in: row.analytics_opted_in === 1,
      theme_preference: row.theme_preference,
      updated_at: row.local_updated_at,
    });
    if (error) throw new Error(error.message);
    await markSynced('profiles', row.id);
  }
}

async function pullProfile(userId: string): Promise<void> {
  const db = await getDb();
  const lastSync = await getMetaValue('profiles_last_pull');

  let query = supabase.from('profiles').select('*').eq('id', userId);
  if (lastSync) query = query.gt('updated_at', lastSync);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return;

  const localRow = await db.getFirstAsync<{ local_updated_at: string }>(
    'SELECT local_updated_at FROM profiles WHERE id = ?',
    [userId],
  );
  if (localRow && localRow.local_updated_at > data.updated_at) return;

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO profiles
       (id, display_name, notification_settings, quiz_settings, interest_areas,
        analytics_opted_in, theme_preference, created_at, updated_at,
        local_updated_at, synced_at, sync_pending, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [
      data.id,
      data.display_name,
      data.notification_settings ? JSON.stringify(data.notification_settings) : null,
      data.quiz_settings ? JSON.stringify(data.quiz_settings) : null,
      data.interest_areas ? JSON.stringify(data.interest_areas) : null,
      data.analytics_opted_in ? 1 : 0,
      data.theme_preference,
      data.created_at,
      data.updated_at,
      data.updated_at,
      now,
    ],
  );
  await setMetaValue('profiles_last_pull', now);
}

// ─── saved_words ─────────────────────────────────────────────────────────────

interface SavedWordRow {
  id: string;
  user_id: string;
  word: string;
  sense_index: number;
  part_of_speech: string;
  pronunciation: string | null;
  definition: string;
  example_sentence: string | null;
  synonyms: string | null;
  card_number: number;
  created_at: string;
  updated_at: string;
  local_updated_at: string;
  sync_pending: number;
  deleted: number;
}

async function pushSavedWords(userId: string): Promise<void> {
  const pending = await getPendingRows<SavedWordRow>('saved_words');
  for (const row of pending) {
    if (row.user_id !== userId) continue;

    if (row.deleted === 1) {
      const { error } = await supabase.from('saved_words').delete().eq('id', row.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('saved_words').upsert({
        id: row.id,
        user_id: row.user_id,
        word: row.word,
        sense_index: row.sense_index,
        part_of_speech: row.part_of_speech,
        pronunciation: row.pronunciation,
        definition: row.definition,
        example_sentence: row.example_sentence,
        synonyms: row.synonyms ? JSON.parse(row.synonyms) : [],
        card_number: row.card_number,
        created_at: row.created_at,
        updated_at: row.local_updated_at,
      });
      if (error) throw new Error(error.message);
    }
    await markSynced('saved_words', row.id);
  }
}

async function pullSavedWords(userId: string): Promise<void> {
  const db = await getDb();
  const lastPull = await getMetaValue('saved_words_last_pull');

  let query = supabase.from('saved_words').select('*').eq('user_id', userId);
  if (lastPull) query = query.gt('updated_at', lastPull);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return;

  const now = new Date().toISOString();
  for (const row of data) {
    const local = await db.getFirstAsync<{ local_updated_at: string }>(
      'SELECT local_updated_at FROM saved_words WHERE id = ?',
      [row.id],
    );
    if (local && local.local_updated_at > row.updated_at) continue;

    await db.runAsync(
      `INSERT OR REPLACE INTO saved_words
         (id, user_id, word, sense_index, part_of_speech, pronunciation, definition,
          example_sentence, synonyms, card_number, created_at, updated_at,
          local_updated_at, synced_at, sync_pending, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        row.id,
        row.user_id,
        row.word,
        row.sense_index,
        row.part_of_speech,
        row.pronunciation,
        row.definition,
        row.example_sentence,
        Array.isArray(row.synonyms) ? JSON.stringify(row.synonyms) : row.synonyms,
        row.card_number,
        row.created_at,
        row.updated_at,
        row.updated_at,
        now,
      ],
    );
  }
  await setMetaValue('saved_words_last_pull', now);
}

// ─── fact_assignments ─────────────────────────────────────────────────────────

interface FactAssignmentRow {
  id: string;
  user_id: string;
  saved_word_id: string;
  fact_id: string;
  created_at: string;
  local_updated_at: string;
  sync_pending: number;
  deleted: number;
}

async function pushFactAssignments(userId: string): Promise<void> {
  const pending = await getPendingRows<FactAssignmentRow>('fact_assignments');
  for (const row of pending) {
    if (row.user_id !== userId) continue;
    if (row.deleted === 1) {
      // Fact assignments are permanent — skip deletes
    } else {
      const { error } = await supabase.from('fact_assignments').upsert({
        id: row.id,
        user_id: row.user_id,
        saved_word_id: row.saved_word_id,
        fact_id: row.fact_id,
        created_at: row.created_at,
      });
      if (error) throw new Error(error.message);
    }
    await markSynced('fact_assignments', row.id);
  }
}

async function pullFactAssignments(userId: string): Promise<void> {
  const db = await getDb();
  const lastPull = await getMetaValue('fact_assignments_last_pull');

  let query = supabase.from('fact_assignments').select('*').eq('user_id', userId);
  if (lastPull) query = query.gt('created_at', lastPull);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return;

  const now = new Date().toISOString();
  for (const row of data) {
    await db.runAsync(
      `INSERT OR IGNORE INTO fact_assignments
         (id, user_id, saved_word_id, fact_id, created_at,
          local_updated_at, synced_at, sync_pending, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [row.id, row.user_id, row.saved_word_id, row.fact_id, row.created_at, row.created_at, now],
    );
  }
  await setMetaValue('fact_assignments_last_pull', now);
}

// ─── facts catalog ────────────────────────────────────────────────────────────

async function refreshFactsIfStale(): Promise<void> {
  const db = await getDb();
  const lastCached = await getMetaValue('facts_cached_at');

  if (lastCached) {
    const age = Date.now() - new Date(lastCached).getTime();
    if (age < FACTS_TTL_MS) return;
  }

  const { data, error } = await supabase
    .from('facts')
    .select('*')
    .eq('active', true);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return;

  const now = new Date().toISOString();
  for (const fact of data) {
    await db.runAsync(
      `INSERT OR REPLACE INTO facts
         (id, category, region, name, name_local, illustration_path,
          fact_sentence, active, created_at, updated_at, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fact.id,
        fact.category,
        fact.region,
        fact.name,
        fact.name_local ?? null,
        fact.illustration_path,
        fact.fact_sentence,
        fact.active ? 1 : 0,
        fact.created_at,
        fact.updated_at,
        now,
      ],
    );
  }
  await setMetaValue('facts_cached_at', now);
}
