// Local SQLite schema. Each user-data table mirrors the cloud with sync columns.
// sync_pending: 1 = needs push to cloud. deleted: 1 = soft-deleted, pending cloud confirmation.

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    notification_settings TEXT,
    quiz_settings TEXT,
    interest_areas TEXT,
    analytics_opted_in INTEGER NOT NULL DEFAULT 1,
    theme_preference TEXT NOT NULL DEFAULT 'system',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    local_updated_at TEXT NOT NULL,
    synced_at TEXT,
    sync_pending INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS saved_words (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    word TEXT NOT NULL,
    sense_index INTEGER NOT NULL DEFAULT 0,
    part_of_speech TEXT NOT NULL,
    pronunciation TEXT,
    definition TEXT NOT NULL,
    example_sentence TEXT,
    synonyms TEXT,
    card_number INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    local_updated_at TEXT NOT NULL,
    synced_at TEXT,
    sync_pending INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_saved_words_user_created
    ON saved_words(user_id, created_at DESC);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_words_unique
    ON saved_words(user_id, word, sense_index)
    WHERE deleted = 0;

  CREATE TABLE IF NOT EXISTS fact_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    saved_word_id TEXT NOT NULL,
    fact_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    local_updated_at TEXT NOT NULL,
    synced_at TEXT,
    sync_pending INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    UNIQUE(saved_word_id)
  );

  CREATE TABLE IF NOT EXISTS facts (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    region TEXT NOT NULL,
    name TEXT NOT NULL,
    name_local TEXT,
    illustration_path TEXT NOT NULL,
    fact_sentence TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    cached_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    saved_word_id TEXT NOT NULL,
    question_format TEXT NOT NULL,
    result TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    created_at TEXT NOT NULL,
    local_updated_at TEXT NOT NULL,
    synced_at TEXT,
    sync_pending INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_word
    ON quiz_attempts(user_id, saved_word_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS notification_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    saved_word_id TEXT,
    slot TEXT NOT NULL,
    mode TEXT NOT NULL,
    fired_at TEXT NOT NULL,
    tapped_at TEXT,
    local_updated_at TEXT NOT NULL,
    synced_at TEXT,
    sync_pending INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS fact_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fact_id TEXT NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    local_updated_at TEXT NOT NULL,
    synced_at TEXT,
    sync_pending INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS _meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

export const SCHEMA_VERSION = 1;
