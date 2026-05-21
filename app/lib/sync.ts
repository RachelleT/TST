import { supabase } from './supabase';
import { getDb } from './db/migrations';
import { getPendingRows, markSynced, setMetaValue, getMetaValue } from './db/crud';
import { useSyncStore } from './stores/sync';

const SYNC_DEBOUNCE_MS = 2000;
const SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Enqueue a sync — debounced so rapid local writes batch into one network round-trip
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

  setSyncing();
  try {
    await pushProfiles(sessionData.session.user.id);
    await pullProfile(sessionData.session.user.id);
    await setMetaValue('last_sync_at', new Date().toISOString());
    setSuccess();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    setError(message);
    // Auth errors sign the user out
    if (message.includes('JWT') || message.includes('auth')) {
      await supabase.auth.signOut();
    }
  }
}

// --- profiles ---

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

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId);

  if (lastSync) {
    query = query.gt('updated_at', lastSync);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return;

  // last-write-wins: only overwrite if cloud is newer than our local copy
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
