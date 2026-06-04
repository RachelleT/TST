# TST — Two Small Things

A vocabulary learning app that pairs every saved word with a small piece of general knowledge — a flag, a constellation, a landmark, an animal, a geographic fact. Two small things learned together, reinforced through daily reminders and short quizzes.

---

## What it is

People save vocabulary words they want to learn. Each saved word is automatically paired with a curated knowledge fact. The app reinforces words through three loops:

1. **Search & save** — look up a word, see its definitions, synonyms, example sentence, and a paired fact. Save the words that interest you.
2. **Daily reminders** — three gentle notifications per day reveal the same word from a different angle each time: definition in the morning, example sentence at midday (with the word blanked out), synonym hint in the evening.
3. **Quizzes** — short sessions with five question formats, weighted toward words you've gotten wrong recently.

Calm by design. No streaks, no badges, no FOMO. Notifications are silent by default.

---

## Tech stack

| Layer | Choice |
|---|---|
| Mobile app | React Native + Expo (managed workflow, SDK 54) |
| Navigation | expo-router v6 (file-based) |
| Backend | Supabase (Postgres + Auth + Storage) |
| Local cache | SQLite via expo-sqlite (offline-first) |
| State | Zustand (local UI), React Query (server state) |
| Notifications | expo-notifications (locally scheduled, no push server) |
| Animations | react-native-reanimated v4 |
| Icons | @tabler/icons-react-native |
| Fonts | Source Serif 4 · Inter · JetBrains Mono (via Expo Google Fonts) |

---

## Repo layout

```
/
├── app/                      # Expo React Native app
│   ├── app/                  # expo-router routes
│   │   ├── (auth)/           # sign-in, sign-up, verify email, welcome, forgot password
│   │   ├── (onboarding)/     # notification permission, interest selection, starter words
│   │   └── (tabs)/           # library, search, quiz, settings
│   ├── components/           # shared UI (AppText, Button, Badge, Chip, WordCard…)
│   ├── lib/
│   │   ├── actions/          # save-word, backfill-senses
│   │   ├── db/               # SQLite schema, migrations, CRUD helpers
│   │   ├── dictionary/       # Free Dictionary API provider + types
│   │   ├── hooks/            # useTheme
│   │   ├── notifications.ts  # scheduling engine, word-of-day picker, copy builders
│   │   ├── stores/           # auth, library, notifications, profile, quiz, sync
│   │   └── theme/            # color tokens, typography, spacing, ThemePreferenceContext
│   └── features/quiz/        # engine, selectors, question formats, synonym matcher
├── shared/                   # TypeScript types shared across app and admin
├── supabase/
│   └── migrations/           # SQL run via Supabase dashboard SQL Editor
└── docs/                     # Product, design, data model, quiz engine, notifications specs
```

---

## Getting started

### Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo`)
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/RachelleT/TST.git
cd TST/app
npm install
```

### 2. Environment variables

Copy the example and fill in your Supabase credentials:

```bash
cp ../.env.example .env.local
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Both values are in **Supabase dashboard → Settings → API**.

### 3. Run database migrations

In the **Supabase dashboard → SQL Editor**, run each file in `supabase/migrations/` in order:

| File | What it does |
|---|---|
| `001_initial_schema.sql` | All tables, triggers, indexes |
| `002_rls_policies.sql` | Row-level security for all tables |
| `003_seed_facts.sql` | Starter fact catalog (~100 entries) |
| `004_grants.sql` | Permissions for authenticated role |
| `005_add_onboarding_completed_at.sql` | Onboarding tracking on profiles |
| `006_seed_interest_areas.sql` | 10 interest areas + 50 starter words |
| `007_delete_account_rpc.sql` | `delete_account()` RPC |

### 4. Supabase Auth settings

In **Authentication → Providers → Email**:
- Enable **Confirm email**

In **Authentication → Email Templates → Confirm signup**, replace the template body with:

```html
<h2>Confirm your email address</h2>
<p>Enter this code in the app to verify your account:</p>
<p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px 0;">
  {{ .Token }}
</p>
<p style="color: #888; font-size: 14px;">This code expires in 1 hour.</p>
```

### 5. Start the dev server

```bash
npx expo start
```

Scan the QR code with Expo Go (iOS or Android) or press `i`/`a` to open in a simulator.

---

## Build status

| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Complete | Foundation — auth, routing, SQLite, sync skeleton |
| 1 | ✅ Complete | Design system — theme tokens, typography, WordCard component |
| 2 | ✅ Complete | Search and save — dictionary API, spell correction, fact picker |
| 3 | ✅ Complete | Library — browse, detail view, synonym lookup, remove |
| 4 | ✅ Complete | Quiz engine — 5 question formats, session orchestration, scoring |
| 5 | ✅ Complete | Onboarding — welcome, notification permission, interest selection, starter words |
| 6 | ✅ Complete | Notifications — local scheduling, word-of-day algorithm, settings UI |
| 7 | ✅ Complete | Settings — profile, quiz prefs, theme, delete account, export data |
| 8 | 🔜 Next | Polish + accessibility audit |
| 9 | ⏳ Deferred | Store readiness (App Store / Play Store submission) |

---

## Design system

Colors, typography, and component anatomy are documented in [`docs/design.md`](docs/design.md).

The app uses two font families:
- **Source Serif 4** — word display (cards, headers)
- **Inter** — all body and UI text
- **JetBrains Mono** — pronunciations, card numbers

Light and dark mode are both mandatory. The `useTheme()` hook resolves the correct token set based on the user's preference (System / Light / Dark, stored in their profile).

---

## Key architectural decisions

See [`docs/decisions.md`](docs/decisions.md) for the full reasoning. Short version:

- **Local-first.** Every user action writes to SQLite immediately and syncs to Supabase in the background. The app works fully offline.
- **No push server.** Notifications are scheduled locally on-device using `expo-notifications`. Three slots per day, cycling through definition → sentence → synonym for the same word.
- **Dictionary provider interface.** The Free Dictionary API is wrapped behind `DictionaryProvider` so swapping it later is a one-file change.
- **Supabase managed via web dashboard only.** No Supabase CLI. SQL changes go in `supabase/migrations/` and are run by the developer via the SQL Editor.

---

## Development notes

**Typed routes** are enabled (`experiments.typedRoutes: true`). expo-router generates the route type definitions when the dev server starts — if you add a new route and see type errors on `router.push(...)`, run `npx expo start` once to regenerate.

**SQLite schema version** is tracked in `_meta`. The current version is `2`. To add a column, bump `SCHEMA_VERSION` in `app/lib/db/schema.ts` and add an `ALTER TABLE` branch in `app/lib/db/migrations.ts`.

**Notification testing.** The Settings screen has a "Send test notification" row. It fires a real notification 5 seconds after tapping — background the app to see it. Requires at least one saved word.

---

## Contributing

This is a personal project in active development. If you spot a bug or have a suggestion, open an issue.

---

## License

Private — not yet licensed for public use.
