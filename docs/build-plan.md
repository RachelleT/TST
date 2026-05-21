# Build plan

A phased plan for building TST from scratch. Each phase produces something runnable and verifiable. Don't skip ahead — earlier phases set up infrastructure later ones depend on.

This plan assumes Claude Code is doing the implementation and the developer is reviewing/testing at each phase.

---

## Phase 0: Foundation (1–2 days of dev time)

**Goal:** A runnable Expo app on iOS and Android simulators with auth, routing, and a Supabase connection.

### Tasks

1. **Initialize the monorepo.**
   - Root `package.json` with workspaces: `app/`, `admin/`, `shared/`, `supabase/`.
   - TypeScript config with strict mode.
   - Prettier + ESLint at the root.
   - `.gitignore`, `.env.example`.

2. **Initialize the Expo app.**
   - `npx create-expo-app app --template tabs` (or blank, then add expo-router manually).
   - Configure expo-router with the four tab structure (Library / Search / Quiz / Settings) and a placeholder screen for each.
   - Set up app.config.ts with bundle identifier `com.tst.app` (placeholder) and platform-specific notification entitlements.
   - Install core deps: `@supabase/supabase-js`, `expo-sqlite`, `expo-notifications`, `@tanstack/react-query`, `zustand`, `react-native-reanimated`, `@expo-google-fonts/source-serif-pro`, `@expo-google-fonts/inter`, `@expo-google-fonts/jetbrains-mono`.

3. **Initialize the Supabase project.**
   - Create a new Supabase project (developer does this manually, shares the URL + anon key via .env).
   - Set up the SQL migration system using `supabase/migrations/` and the Supabase CLI.
   - Run the initial migration creating all tables from `docs/data-model.md` (including `admin_audit_log`, `starter_words`, `interest_areas`, `feature_flags` from `docs/admin-dashboard.md`).
   - Enable row-level security on all tables and write the RLS policies.

4. **Build the auth flow.**
   - Sign up / sign in with email-password (Apple and Google sign in come in Phase 5 when we're closer to store readiness).
   - Auth state via Supabase Auth + a Zustand store.
   - Protected routes: redirect to sign-in if no session.

5. **Set up local SQLite mirror.**
   - Schema file `app/lib/db/schema.ts`.
   - Migration runner that runs on first launch.
   - Basic CRUD helpers per table.

6. **Set up the sync engine skeleton.**
   - `app/lib/sync.ts` with the push/pull logic described in `docs/data-model.md`.
   - For Phase 0, sync only `profiles`. Other tables hooked in later phases as they're built.

7. **Verify.**
   - Sign up, sign in, sign out work on iOS and Android.
   - Tapping any tab shows its placeholder screen.
   - Sign in on phone, then on tablet — profile syncs.

### Deliverables for end of Phase 0

- Runnable app with auth and tab navigation
- Supabase schema deployed
- Sync engine framework

---

## Phase 1: Design system + the card component (2 days)

**Goal:** The word card looks right and is reusable. No data flow yet — pure UI work with mock data.

### Tasks

1. **Define theme tokens.**
   - `app/lib/theme/index.ts` exports the palette, type scale, spacing, radii, etc. from `docs/design.md`.
   - Hooks: `useTheme()`, `useColorScheme()` (system/light/dark switch).

2. **Set up typography.**
   - Load Source Serif Pro, Inter, JetBrains Mono via `expo-font` at app start.
   - Wrap `<Text>` with a typed `<AppText variant="display">` component that applies the type scale.

3. **Build atomic components.**
   - `Button` (primary, secondary, ghost, icon)
   - `Chip` (for synonyms)
   - `Badge` (for part of speech)
   - `Card` (the outer container with frame)
   - `ZoneLabel` (the uppercase meta-styled label)
   - `IconButton`

4. **Build the WordCard component.**
   - Takes a `SavedWord` object + optional `Fact` (for the portrait zone).
   - Has two size modes: `preview` (used in library list) and `detail` (full-screen).
   - Renders all zones from `docs/design.md`.
   - Mock fact illustration: a colored rect with the fact name centered (real SVGs come later).
   - Implements card tap → expand to detail (animated, respects reduced motion).

5. **Storybook-style preview screen.**
   - A dev-only screen at `/_dev/components` that renders every component in light + dark + various states.
   - The developer uses this to visually validate the design system.

6. **Verify.**
   - WordCard renders correctly for all 8 parts of speech (frame colors).
   - Light and dark modes both look right.
   - Phone and tablet layouts both work.
   - Reduced motion is honored.

### Deliverables for end of Phase 1

- Theme tokens + typography pipeline
- Reusable atomic components
- WordCard component in preview and detail modes
- Dev preview screen

---

## Phase 2: Search and save (2–3 days)

**Goal:** A user can search for a word, see its card, and save it to their library.

### Tasks

1. **Build the dictionary provider interface.**
   - `app/lib/dictionary/types.ts` defines `DictionaryProvider` interface.
   - `app/lib/dictionary/free-dictionary.ts` implements it against Free Dictionary API.
   - Returns a normalized `DictionaryEntry` with all senses, definitions, synonyms, examples, pronunciation.

2. **Build the example-sentence filter.**
   - `app/lib/sentence-filter.ts` runs the API's example sentence through a blocklist (curated profanity, slurs, sexual content). If sentence fails, fall back to a generic template.
   - Ship blocklist as JSON.

3. **Build the spelling corrector.**
   - Bundle a ~30k common-word list as `app/data/common-words.json`.
   - `app/lib/spelling.ts` does fuzzy match using Levenshtein distance, returns top 5 suggestions.
   - On no local matches, fall back to dictionary API's suggestion field.

4. **Build the Search screen.**
   - Search bar with debounced input (300ms).
   - As user types: show local suggestions below the bar.
   - On submit or suggestion tap: query the dictionary, render a `WordCard` (preview) below the bar.
   - "Save to library" CTA below the card.
   - Empty state and "no connection" state per `docs/product.md`.

5. **Implement the save flow.**
   - Tapping save:
     1. Generates a UUID locally.
     2. Inserts into `saved_words` (local), gets next `card_number` for this user.
     3. Calls the fact picker → inserts into `fact_assignments`.
     4. Updates UI immediately ("Saved" indicator).
     5. Enqueues sync.

6. **Build the fact picker.**
   - `app/lib/fact-picker.ts` implements the algorithm from `docs/facts-catalog.md`.
   - Reads from the local `facts` cache.
   - Returns a `fact_id` to anchor.

7. **Seed the facts catalog.**
   - For now, hand-author a JSON of ~100 facts (per the v1 seed in `docs/facts-catalog.md`).
   - Write a script to upload to Supabase.
   - App pulls facts to local SQLite on first launch.

8. **Verify.**
   - Type a word → see suggestions.
   - Submit → see card with definition, example, synonyms, and a fact assigned.
   - Save → appears in library tab.
   - Misspelled word → "did you mean" works.
   - Offline → search shows "no connection," library still works.

### Deliverables for end of Phase 2

- Working search with spell correction
- Working save flow
- Fact assignment working with seed catalog
- ~100 facts loaded with placeholder SVG illustrations

---

## Phase 3: Library and card detail (1–2 days)

**Goal:** A user can browse, view, and remove saved words.

### Tasks

1. **Build the Library screen.**
   - Renders all saved words as `WordCard preview` components.
   - Sort menu (recent, alphabetical, recently reviewed, struggling).
   - Empty state.
   - Pull-to-refresh triggers sync.

2. **Build the card detail screen / modal.**
   - On phone: navigates to a full-screen view.
   - On tablet: opens as a centered modal.
   - Shows the full WordCard at `detail` size.
   - Fact portrait is tappable → expands to show the one-sentence fact (uses card-flip animation, or cross-fade if reduced motion).
   - Action buttons: Remove, Report incorrect fact.
   - Quiz history footer ("Reviewed N times, X correct").

3. **Implement remove flow.**
   - Confirmation dialog ("Remove from library?").
   - Soft-delete locally (`deleted = 1`), syncs to remote.
   - Card vanishes from library immediately.

4. **Implement report-fact modal.**
   - Inserts into `fact_reports`, syncs.
   - User sees "Thanks — we'll review this" confirmation.

5. **Verify.**
   - Library shows all saved words.
   - Sort works.
   - Card detail opens cleanly on phone and tablet.
   - Fact reveal works.
   - Remove works, syncs across devices.
   - Report works.

### Deliverables for end of Phase 3

- Functional library
- Functional card detail
- Functional remove and report flows

---

## Phase 4: Quiz engine (2–3 days)

**Goal:** A user can take a quiz session with mixed question formats.

### Tasks

1. **Implement word selection.**
   - `app/features/quiz/selectors.ts` per `docs/quiz-engine.md`.
   - Unit-test with fixture quiz histories.

2. **Implement each question format.**
   - One file per format under `app/features/quiz/formats/`.
   - Each exports `generateQuestion(word, allWords, allSynonyms) → QuizQuestion`.

3. **Implement the distractor picker.**
   - `app/features/quiz/distractors.ts` — picks 3 distractors for multiple-choice, prioritizing same-POS.

4. **Implement synonym matcher.**
   - `app/features/quiz/synonym-matcher.ts` per spec. Unit-tested.

5. **Build the quiz session orchestrator.**
   - `app/features/quiz/engine.ts` — selects words, picks formats with the no-more-than-3-same-format rule, hands questions to UI one at a time.

6. **Build the quiz UI.**
   - Entry screen ("Ready for a quiz?")
   - Session settings (gear icon: length, format toggles)
   - Question screen — renders the current question, handles user input, shows immediate feedback after each answer.
   - Summary screen — shows score, missed words (tappable to view cards).

7. **Record quiz attempts.**
   - Every answer writes to local `quiz_attempts`, syncs.

8. **Verify.**
   - Start a quiz with 10 saved words → 10 questions in mixed formats.
   - Each format works correctly.
   - Synonym acceptance works for fill-in-blank.
   - Summary shows correct score and missed words.
   - Future quizzes weight toward the missed words.

### Deliverables for end of Phase 4

- Functional quiz engine
- 5 question formats
- Quiz history feeding future selection

---

## Phase 5: Onboarding (1–2 days)

**Goal:** First-time user flow that feels welcoming, not overwhelming.

### Tasks

1. **Build the welcome screen.**
   - One screen, calm copy explaining the three loops.

2. **Wire up sign-up.**
   - Email + password, plus Apple Sign In and Google Sign In via Supabase Auth providers (now is the time — Phase 0 had email/password only).
   - Apple Sign In: required for App Store if other social providers are present, so add for parity.

3. **Notification permission ask.**
   - Soft prompt with the copy from spec.
   - Result stored in `profiles.notification_settings.enabled`.

4. **Interest area selection screen.**
   - Pull 10 active interest areas from Supabase, randomize, show 5 (always including "just give me variety").
   - Multi-select, optional, skip allowed.
   - Save selection to `profiles.interest_areas`.

5. **Starter words screen.**
   - Based on selected areas, fetch ~6 starter words from `starter_words` table.
   - Show as small preview cards.
   - Tap to save. Skip allowed.
   - On first save, show the "two small things" overlay/note.

6. **Land on Library.**

7. **Implement onboarding skip logic.**
   - User's `profile.onboarding_completed_at` is set when they complete (or skip).
   - Returning user with this flag skips welcome screens entirely.

8. **Verify.**
   - Fresh sign-up walks through the full flow.
   - Skips work.
   - Re-installs (after sign-out and sign-in again) don't re-show onboarding.
   - Apple and Google sign-in work on real devices.

### Deliverables for end of Phase 5

- Complete onboarding
- Apple and Google Sign In working
- Starter words and interest areas wired to admin-managed data

---

## Phase 6: Notifications (1–2 days)

**Goal:** Three daily reminders, scheduled locally, with the right copy and behavior.

### Tasks

1. **Implement `pickWordOfTheDay`.**
   - Per the algorithm in `docs/notifications.md`. Unit-tested.

2. **Implement `scheduleNotifications`.**
   - Schedules the next 14 days of notifications.
   - Per-slot copy generators.

3. **Implement permission flow.**
   - In Settings → Notifications, deep link to OS settings if permission is denied.

4. **Implement settings UI.**
   - Toggles, time pickers, day-of-week selector, sound/vibration toggles.
   - Changes trigger re-scheduling.

5. **Implement deep linking.**
   - Notification tap opens the relevant word's card detail.

6. **Implement re-engagement nudge.**
   - Background check on app launch: if no saved words in 7+ days, schedule the nudge for the user's morning time.

7. **Verify.**
   - On a real device (simulators have limited notification support), schedule a notification 60s out → fires with correct content.
   - Tapping opens correct card detail.
   - Time changes in settings re-schedule.
   - Library too small → no notifications, eventually nudge fires.
   - Sound/vibration off by default.

### Deliverables for end of Phase 6

- Working daily notifications
- Working re-engagement nudge
- Settings to control all of the above

---

## Phase 7: Settings + account management (1 day)

**Goal:** Complete the Settings tab.

### Tasks

1. **Profile section.**
   - Display name (editable)
   - Email (read-only)
   - Sign out button
   - Delete account flow (typed confirmation + edge function call)
   - Export data flow (edge function returns JSON, share via system sheet)

2. **Notifications section.**
   - Already built in Phase 6.

3. **App section.**
   - Quiz default length, format toggles
   - Reduce motion toggle
   - Theme (System / Light / Dark)
   - Analytics opt-out toggle
   - About / version info
   - Report a fact (opens the same modal as on cards)

4. **Edge functions.**
   - `delete_account` — cascades user data deletion.
   - `export_data` — bundles user's data into a JSON file.

5. **Verify.**
   - All toggles work and persist (synced).
   - Sign out clears local SQLite cache.
   - Account deletion removes data and returns to welcome.
   - Export downloads a valid JSON file.

### Deliverables for end of Phase 7

- Complete Settings
- Account deletion + export working

---

## Phase 8: Polish + accessibility audit (2 days)

**Goal:** The app feels finished and works for everyone.

### Tasks

1. **Accessibility audit.**
   - Verify all interactive elements have screen reader labels.
   - Verify contrast (WCAG AA) on all text + background combinations using a contrast checker.
   - Verify dynamic text scaling works (set device font scale to max, verify nothing breaks).
   - Verify reduced motion paths everywhere.
   - Verify keyboard navigation works on tablets with keyboards.

2. **Performance pass.**
   - Library scroll is smooth at 60fps with 50+ cards.
   - Quiz transitions are smooth.
   - Memoize WordCard and other heavy components where appropriate.
   - Lazy-load fact illustrations.

3. **Error handling pass.**
   - Every async function in the app has try/catch with user-facing error copy.
   - Network errors are friendly, never raw exceptions.
   - Sync failures are silent except in Settings → Sync status.

4. **Empty states pass.**
   - Every screen has its designed empty state.
   - No "loading..." spinners without context.

5. **Tone pass.**
   - Read every user-facing string against the tone-of-voice rules in `docs/product.md`.
   - Fix anything off-brand.

6. **Verify.**
   - Run through the full user journey on iOS phone, iOS tablet, Android phone, Android tablet.
   - Each platform passes basic accessibility checks.

### Deliverables for end of Phase 8

- Polished, accessible app
- Tested across 4 device classes

---

## Phase 9 (deferred — pre-launch): Store readiness

Don't do these until the developer is ready to actually submit:

- Apple Developer Program enrollment ($99/yr)
- Google Play Developer enrollment ($25 one-time)
- App Store Connect setup + screenshots + description + privacy policy URL
- Google Play Console setup + listing + content rating + privacy policy URL
- In-app purchase setup: enable the $4.99 one-time purchase for unlimited library
- Flip the `paywall_enabled` feature flag
- Implement the purchase UI and `expo-in-app-purchases` integration
- Submit for review (Apple takes ~1–3 days, Google takes a few hours to a day)

## Phase 10 (deferred): Admin dashboard

- Initial admin v0.5 (facts CRUD + reports queue) — can be built any time after Phase 2 is done.
- Full admin v1 (users, starter words, interest areas, analytics) — built after the mobile app v1 ships.

See `docs/admin-dashboard.md` for the full plan.

---

## Build cadence

Don't try to do all of this in one continuous push. Suggested cadence:

- One phase at a time.
- At the end of each phase: developer tests on real devices, gives feedback.
- Bug fixes from previous phases happen before moving to next phase.
- Maintain a `CHANGELOG.md` at the repo root with what each phase delivered.

## How Claude Code should approach this

Read `CLAUDE.md`, then the relevant doc(s) for the current phase, then write code. When in doubt about product intent, surface the question — don't guess. When making technical tradeoffs not specified in docs (library choices, file organization within a feature), use judgment and note the choice in `docs/decisions.md` so it's findable later.
