import { SQLiteBindValue } from 'expo-sqlite';
import { getDb } from './migrations';

// Generic upsert helper for sync writes
export async function upsertRow(
  table: string,
  row: Record<string, SQLiteBindValue>,
): Promise<void> {
  const db = await getDb();
  const keys = Object.keys(row);
  const placeholders = keys.map(() => '?').join(', ');
  const updateClauses = keys.map((k) => `${k} = excluded.${k}`).join(', ');
  const values = Object.values(row) as SQLiteBindValue[];
  await db.runAsync(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})
     ON CONFLICT DO UPDATE SET ${updateClauses}`,
    values,
  );
}

export async function softDelete(table: string, id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE ${table} SET deleted = 1, local_updated_at = ?, sync_pending = 1 WHERE id = ?`,
    [now, id],
  );
}

export async function markSynced(table: string, id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE ${table} SET synced_at = ?, sync_pending = 0 WHERE id = ?`,
    [now, id],
  );
}

export async function getPendingRows<T>(
  table: string,
): Promise<T[]> {
  const db = await getDb();
  return db.getAllAsync<T>(`SELECT * FROM ${table} WHERE sync_pending = 1`);
}

export async function getMetaValue(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM _meta WHERE key = ?`,
    [key],
  );
  return row?.value ?? null;
}

export async function setMetaValue(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO _meta (key, value) VALUES (?, ?)`,
    [key, value],
  );
}
