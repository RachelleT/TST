import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('tst.db');
  return db;
}

export async function runMigrations(): Promise<void> {
  const database = await getDb();

  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await database
    .getFirstAsync<{ value: string }>(`SELECT value FROM _meta WHERE key = 'schema_version'`)
    .catch(() => null);

  const currentVersion = versionRow ? parseInt(versionRow.value, 10) : 0;

  if (currentVersion >= SCHEMA_VERSION) return;

  // v0 → v1: create all tables from scratch
  if (currentVersion < 1) {
    await database.execAsync(CREATE_TABLES_SQL);
  }

  // v1 → v2: add onboarding_completed_at to profiles
  if (currentVersion === 1) {
    try {
      await database.execAsync(
        'ALTER TABLE profiles ADD COLUMN onboarding_completed_at TEXT',
      );
    } catch {
      // Column may already exist if CREATE_TABLES_SQL was just run above (fresh install).
    }
  }

  await database.runAsync(
    `INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)`,
    [String(SCHEMA_VERSION)],
  );
}
