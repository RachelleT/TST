# TST (Two Small Things)

> Vocabulary learning app paired with daily general-knowledge wonders.
> Mobile + tablet (iOS, Android). React Native + Expo. Supabase backend.

---

## What this app is

People save vocabulary words they want to learn. Each saved word is paired with a small piece of general knowledge (a flag, a constellation, a landmark, an animal, a geographic fact) — so every card teaches two small things. The app reinforces words through gentle daily notifications and short quizzes. Calm, all-ages, no ads.

The "two small things" framing is core. It's the name, it's the value proposition, and it's the structural metaphor for every word card.

## How to read this repo

Start with this file. Then read the docs in `/docs` in this order:

1. **`docs/product.md`** — what we're building, user flows, screens
2. **`docs/design.md`** — visual system, card anatomy, palette, typography
3. **`docs/data-model.md`** — Supabase schema, TypeScript types, sync rules
4. **`docs/facts-catalog.md`** — the general-knowledge fact data, categories, regional balancing
5. **`docs/quiz-engine.md`** — quiz formats, word selection logic, scoring
6. **`docs/notifications.md`** — daily ping schedule, copy, edge cases
7. **`docs/admin-dashboard.md`** — the separate admin web app
8. **`docs/build-plan.md`** — phased plan for actually building this
9. **`docs/decisions.md`** — the reasoning behind key choices

## Tech stack at a glance

- **Mobile app:** React Native with Expo (managed workflow). TypeScript throughout.
- **Backend:** Supabase (Postgres + Auth + Storage). Row-level security on all user data.
- **Local cache:** SQLite via `expo-sqlite` for offline support of saved words.
- **State management:** React Query for server state, Zustand for local UI state.
- **Notifications:** `expo-notifications`, scheduled locally on device.
- **Auth:** Supabase Auth with email/password, Apple Sign In, Google Sign In.
- **Admin dashboard:** Next.js (separate repo or `/admin` subdirectory), deployed to Vercel, same Supabase backend.

## Repo layout (target)

```
/
├── CLAUDE.md                    # this file
├── docs/                        # spec docs (read first, always)
├── app/                         # Expo React Native app
│   ├── app/                     # expo-router routes
│   ├── components/              # shared UI components
│   ├── features/                # feature modules (search, library, quiz, etc.)
│   ├── lib/                     # utilities, API clients, sync logic
│   ├── data/                    # bundled JSON: starter words, common-word list
│   └── assets/                  # fonts, illustrations (SVG)
├── admin/                       # Next.js admin dashboard
├── supabase/                    # SQL migrations, edge functions, seed data
│   ├── migrations/
│   └── seed/                    # fact catalog JSON
└── shared/                      # types shared between app and admin
```

## Build philosophy (read before writing code)

**Local-first thinking.** The app must feel instant. The user saves a word — it's saved locally immediately and synced to Supabase in the background. A failed network call should never block a user action. Optimistic UI everywhere.

**Cloud sync is real sync, not backup.** Users may use the app on phone and tablet simultaneously. Conflicts are resolved last-write-wins on a per-record basis, with a clear timestamp on every record.

**Architect for replaceability.** The dictionary API, the fact catalog source, the spelling correction strategy — all of these will change. Build them behind interfaces (`DictionaryProvider`, `FactProvider`, `SpellingChecker`) so swapping the implementation is a one-file change.

**Build store-ready, ship later.** This first build is for the developer to test locally and on a personal device via Expo. No App Store / Play Store accounts yet, no paywall enforcement yet. But everything is architected so flipping a feature flag enables the 50-word cap and the in-app purchase flow.

**Accessibility from day one, not retrofit.** WCAG AA contrast minimum. Dynamic text. Screen reader labels on every interactive element. Reduced motion respected. No color-only signaling.

**Calm by default.** No popups, no streaks-with-anxiety, no red badges, no FOMO mechanics. Notifications are silent and non-vibrating by default. The app should feel like a quiet corner, not a casino.

## Naming conventions

- Files: `kebab-case.ts` for source, `PascalCase.tsx` for React components
- Components: `PascalCase`
- Functions, variables: `camelCase`
- Types, interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database tables: `snake_case` plural (`saved_words`, `fact_assignments`)
- Database columns: `snake_case`

## Coding conventions

- TypeScript strict mode. No `any` without an inline comment explaining why.
- All component props typed as interfaces named `<Component>Props`.
- Async functions throw on failure; callers handle via try/catch. No silent failures.
- All user-facing strings flow through a `t()` helper from day one (even though v1 is English-only, this avoids retrofitting i18n later).
- All dates stored and transmitted as ISO 8601 UTC strings. Display formatting happens at the component level.
- Tests live next to source: `quiz-engine.ts` and `quiz-engine.test.ts` in the same folder.

## Definition of done for any feature

A feature is done when:
1. It works on both iOS and Android in Expo Go.
2. It works on tablets (responsive layout verified).
3. It handles the offline case gracefully.
4. It's accessible (labels, contrast, dynamic text).
5. It has at least one test for the core logic (not UI).
6. Strings flow through `t()`.
7. Errors are surfaced to the user with helpful copy, not silent.

## Non-goals (explicitly out of scope for v1)

- Web version of the user-facing app
- Social features, sharing, friend lists, leaderboards
- User-created tags or decks
- Multi-language UI (English only)
- Audio pronunciation (syllable hints only: `el·o·quent`)
- AI-generated example sentences (using dictionary API examples filtered for safety)
- Per-word illustrations (the illustration slot is for general-knowledge facts only)
- In-app purchases wired up (built but not enabled in this first build)

## Open questions to resolve during build

These are intentionally deferred. Surface them when you hit them; don't guess.

- Exact wording of onboarding copy (placeholder copy okay during build)
- Specific list of starter words per interest area (~6 words × 10 areas = 60 words to curate)
- The full fact catalog (target ~500–700 entries; v1 build may ship with a starter ~100 to validate the system, then expand)
- Final visual identity for the TST logo / app icon (use a placeholder "TST" wordmark during build)
- Privacy policy and ToS text (legal review needed before store submission, not before development)

## When in doubt

- Re-read `docs/decisions.md` — most "why" questions are answered there
- Prefer simpler over cleverer
- Prefer explicit over implicit
- Ask the developer rather than assume product intent
- Default to calm, kind, all-ages tone in any user-facing copy
