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

  if (currentVersion < SCHEMA_VERSION) {
    await database.execAsync(CREATE_TABLES_SQL);
    await database.runAsync(
      `INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', ?)`,
      [String(SCHEMA_VERSION)],
    );
  }
}
