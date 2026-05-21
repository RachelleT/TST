# Data model

## Database: Supabase (Postgres)

All user data is in Supabase with row-level security enabled. The local SQLite database mirrors the user's own data for offline use and is synced bidirectionally.

## Tables

### `users`

Managed by Supabase Auth. We extend it via a `profiles` table.

### `profiles`

One row per authenticated user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Matches `auth.users.id` |
| `display_name` | text | Optional |
| `created_at` | timestamptz | Default `now()` |
| `notification_settings` | jsonb | See below |
| `quiz_settings` | jsonb | See below |
| `interest_areas` | text[] | The areas selected in onboarding (or chosen later) |
| `analytics_opted_in` | boolean | Default `true`, user-toggleable |
| `theme_preference` | text | `'system'` / `'light'` / `'dark'`, default `'system'` |
| `updated_at` | timestamptz | Auto-updated via trigger |

**`notification_settings` jsonb shape:**
```json
{
  "enabled": true,
  "morning_time": "08:00",
  "noon_time": "12:00",
  "evening_time": "19:00",
  "days": ["mon","tue","wed","thu","fri","sat","sun"],
  "sound": false,
  "vibration": false
}
```

**`quiz_settings` jsonb shape:**
```json
{
  "default_length": 10,
  "enabled_formats": ["def_to_word","word_to_def","synonym","fill_in_sentence","word_for_description"]
}
```

### `saved_words`

The user's library. One row per saved word.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Generated client-side for offline writes |
| `user_id` | uuid FK → profiles.id | RLS: user can only see their own |
| `word` | text | The headword, e.g. `"eloquent"` |
| `sense_index` | int | Default 0; nonzero for non-primary senses |
| `part_of_speech` | text | `"noun"`, `"verb"`, `"adjective"`, etc. |
| `pronunciation` | text | Syllable hint, e.g. `"el·o·quent"` |
| `definition` | text | Primary definition for the saved sense |
| `example_sentence` | text | Filtered sentence (see `docs/product.md`) |
| `synonyms` | text[] | Up to 8 synonyms |
| `card_number` | int | Sequential per user, 1-indexed |
| `created_at` | timestamptz | When saved |
| `updated_at` | timestamptz | Auto |

Indexes: `(user_id, created_at desc)`, `(user_id, word)`.

Unique constraint: `(user_id, word, sense_index)`.

### `fact_assignments`

Pairs a saved word with one knowledge fact, persistent.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles.id | |
| `saved_word_id` | uuid FK → saved_words.id ON DELETE CASCADE | |
| `fact_id` | text | References `facts.id` in the catalog |
| `created_at` | timestamptz | |

Unique constraint: `(saved_word_id)` — exactly one fact per saved word.

### `facts`

The general-knowledge catalog. Shared across all users (not user-scoped). Editable from the admin dashboard.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | E.g. `"flag_japan"` |
| `category` | text | `"flag"` / `"landmark"` / `"constellation"` / `"animal"` / `"geography"` |
| `region` | text | E.g. `"asia_east"`, `"global"`. See `docs/facts-catalog.md` |
| `name` | text | Display name, e.g. `"Japan"` |
| `name_local` | text | Optional local-language name, e.g. `"日本"` |
| `illustration_path` | text | Relative path to SVG asset, e.g. `"flags/japan.svg"` |
| `fact_sentence` | text | One sentence shown on tap |
| `active` | boolean | Admin can deactivate without deleting |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `quiz_attempts`

Records every question outcome. Used to weight word selection.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles.id | |
| `saved_word_id` | uuid FK → saved_words.id ON DELETE CASCADE | |
| `question_format` | text | One of the 5 format keys |
| `result` | text | `"correct"` / `"incorrect"` / `"synonym_accepted"` |
| `user_answer` | text | What the user typed/picked |
| `expected_answer` | text | The target word |
| `created_at` | timestamptz | |

Index: `(user_id, saved_word_id, created_at desc)`.

### `notification_events`

Records each notification fired locally and tapped, for diagnostics (anonymized, opt-out respected).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles.id | |
| `saved_word_id` | uuid FK → saved_words.id ON DELETE SET NULL | |
| `slot` | text | `"morning"` / `"noon"` / `"evening"` / `"reengagement"` |
| `mode` | text | `"definition"` / `"sentence"` / `"synonym"` / `"nudge"` |
| `fired_at` | timestamptz | |
| `tapped_at` | timestamptz | Null if not tapped |

Only inserted when `profiles.analytics_opted_in = true`.

### `fact_reports`

User-submitted reports about inaccurate facts.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles.id | |
| `fact_id` | text FK → facts.id | |
| `category` | text | `"factually_incorrect"` / `"outdated"` / `"culturally_insensitive"` / `"spelling_grammar"` / `"other"` |
| `note` | text | Free text, optional |
| `status` | text | `"open"` / `"fixed"` / `"dismissed"`. Default `"open"` |
| `admin_response` | text | Optional |
| `created_at` | timestamptz | |
| `resolved_at` | timestamptz | Null until resolved |

### `app_users` (admin role)

A simple admin allowlist. A user is admin if their `id` is in this table.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK FK → profiles.id | |
| `role` | text | `"admin"` (only role for now) |
| `created_at` | timestamptz | |

## Row-level security policies

All user-data tables enforce: `auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE.

`facts` is readable by all authenticated users, writable only by admins (`auth.uid() IN (SELECT user_id FROM app_users)`).

`fact_reports` is INSERT-able by any authenticated user, but SELECT/UPDATE only by admins or the reporting user themselves.

## TypeScript types (shared)

Located in `shared/types.ts`, imported by both app and admin.

```typescript
export type PartOfSpeech =
  | 'noun' | 'verb' | 'adjective' | 'adverb'
  | 'preposition' | 'conjunction' | 'interjection' | 'pronoun';

export type FactCategory = 'flag' | 'landmark' | 'constellation' | 'animal' | 'geography';

export type FactRegion =
  | 'africa_north' | 'africa_west' | 'africa_east' | 'africa_south' | 'africa_central'
  | 'americas_north' | 'americas_central' | 'americas_south' | 'caribbean'
  | 'asia_east' | 'asia_south' | 'asia_southeast' | 'asia_central' | 'asia_west'
  | 'europe_west' | 'europe_east' | 'europe_north' | 'europe_south'
  | 'oceania_australia' | 'oceania_pacific' | 'oceania_newzealand'
  | 'polar' | 'global';

export type QuizFormat =
  | 'def_to_word'
  | 'word_to_def'
  | 'synonym'
  | 'fill_in_sentence'
  | 'word_for_description';

export type QuizResult = 'correct' | 'incorrect' | 'synonym_accepted';

export interface SavedWord {
  id: string;
  userId: string;
  word: string;
  senseIndex: number;
  partOfSpeech: PartOfSpeech;
  pronunciation: string;
  definition: string;
  exampleSentence: string;
  synonyms: string[];
  cardNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface Fact {
  id: string;
  category: FactCategory;
  region: FactRegion;
  name: string;
  nameLocal?: string;
  illustrationPath: string;
  factSentence: string;
  active: boolean;
}

export interface FactAssignment {
  id: string;
  userId: string;
  savedWordId: string;
  factId: string;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  savedWordId: string;
  questionFormat: QuizFormat;
  result: QuizResult;
  userAnswer: string;
  expectedAnswer: string;
  createdAt: string;
}

export interface NotificationSettings {
  enabled: boolean;
  morningTime: string;  // "HH:MM" 24h
  noonTime: string;
  eveningTime: string;
  days: ('mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun')[];
  sound: boolean;
  vibration: boolean;
}

export interface QuizSettings {
  defaultLength: 5 | 10 | 15 | 20;
  enabledFormats: QuizFormat[];
}
```

## Local SQLite schema

The on-device database mirrors a subset of the cloud, plus a sync-state column on every row.

Tables: `profiles`, `saved_words`, `fact_assignments`, `facts` (cached), `quiz_attempts`, `notification_events` (write-buffer), `fact_reports` (write-buffer).

Each user-data row has:
- `local_updated_at` (text, ISO) — when this row was last changed locally
- `synced_at` (text, ISO, nullable) — when it was last successfully pushed
- `sync_pending` (int, 0/1) — flag for the sync engine
- `deleted` (int, 0/1) — soft delete for sync (hard delete on remote confirmation)

The `facts` table is read-only on device; we pull the active catalog into local SQLite on first run and refresh on a TTL (24h default).

## Sync engine

A single `lib/sync.ts` module handles bidirectional sync:

1. **On app start:** Trigger a sync if last successful sync > 5 minutes ago.
2. **On network reconnect:** Trigger a sync.
3. **After any local write:** Trigger a debounced sync (within 2s of last write).
4. **Push phase:** For each table with `sync_pending = 1` rows, push them to Supabase, then mark `synced_at = now()` and `sync_pending = 0`.
5. **Pull phase:** For each table, fetch all rows where `updated_at > last_sync_timestamp`. Merge locally with last-write-wins on conflicts (compare `local_updated_at` to fetched `updated_at`).
6. **Failure handling:** Network failures are silent (retry on next trigger). Auth failures sign the user out.

Sync is observable via a Zustand store so the UI can show a small "syncing…" indicator in settings (and only there; never globally distracting).

## Data export

Settings → Export Data triggers a Supabase Edge Function that returns a JSON file:

```json
{
  "exportedAt": "2026-05-21T14:00:00Z",
  "profile": { ... },
  "savedWords": [...],
  "factAssignments": [...],
  "quizAttempts": [...]
}
```

The file is offered to the user via the share sheet.

## Account deletion

Settings → Delete Account:

1. Confirmation modal requires the user to type their email to proceed.
2. Triggers a Supabase Edge Function `delete_account` that:
   - Deletes from `profiles` (CASCADE clears saved_words, fact_assignments, quiz_attempts, notification_events, fact_reports).
   - Deletes from `auth.users`.
3. App clears local SQLite, returns to the welcome screen.

If deletion fails server-side, show an error with a contact email for manual resolution.
