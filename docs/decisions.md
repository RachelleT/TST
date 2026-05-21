# Decisions

A record of key product and technical decisions, with their reasoning. This exists so future-you (and future Claude Code sessions) don't relitigate settled questions, and so any team member can understand "why this and not that."

Entries are append-only. If a decision is later overturned, add a new entry rather than editing an old one.

---

## D001 — React Native + Expo as the mobile framework

**Date:** Initial planning
**Status:** Accepted

**Context:** TST needs to ship to both iOS and Android with one codebase, support local scheduled notifications, run reliably offline, and be maintainable by a small team.

**Decision:** React Native with Expo (managed workflow).

**Why not Flutter:** Smaller ecosystem for dictionary/audio libraries; less rich Supabase integration; Dart adds a language for a TS-first dev.

**Why not native (Swift + Kotlin):** Doubles the work for an app that doesn't need platform-specific UX. The calm, content-focused design works equally well with shared components.

**Why managed Expo:** Faster setup, easier OTA updates later, no Xcode/Android Studio drama for everyday dev. Eject to bare workflow if a native module is ever needed.

---

## D002 — Free Dictionary API for v1

**Date:** Initial planning
**Status:** Accepted, with provision for replacement

**Context:** Need a dictionary data source. Options: Free Dictionary API, Merriam-Webster (paid), Oxford (paid), bundled offline dictionary.

**Decision:** Free Dictionary API. Behind a `DictionaryProvider` interface so it can be swapped without touching consumers.

**Why:** Free, no API key, returns definitions, phonetics, audio, synonyms, examples in one call. Good enough for v1. Acknowledged gaps (occasionally missing data, occasionally odd example sentences) are addressed by fallbacks in our app layer.

**Future:** Likely swap to Merriam-Webster or Oxford if the product grows and the gaps become user complaints.

---

## D003 — Supabase as backend

**Date:** Initial planning
**Status:** Accepted

**Why:** Postgres (good fit for relational data: words, attempts, assignments, facts), included auth with social providers, row-level security, free tier sufficient for early scale, edge functions for things like account deletion. Single backend serves both mobile app and admin dashboard.

**Why not Firebase:** Document data model is awkward for relational queries the quiz engine needs. Vendor lock-in feels worse than with Supabase.

---

## D004 — Account required, full cloud sync (not local-only)

**Date:** Initial planning
**Status:** Accepted

**Context:** User indicated "an account is important — wouldn't want to start over mid-learning."

**Decision:** Sign-in required on first launch. All data synced bidirectionally to Supabase. Local SQLite mirror for offline use.

**Tradeoff:** Adds onboarding friction vs. local-only. Mitigated by Apple/Google sign-in (one tap).

---

## D005 — Card-based UI ("Pokémon card" aesthetic)

**Date:** Design discussion
**Status:** Accepted

**Context:** Initial design directions felt "too traditional." User wanted something more playful and engaging without being childish.

**Decision:** Each saved word is rendered as a card with a colored frame indicating part of speech, named zones for definition / sentence / synonyms, a portrait zone for the paired knowledge fact, and a footer with card number.

**Why:** Gives the app a recognizable visual identity. Makes each saved word feel like a tangible thing in a collection. Builds a sense of progress without gamification mechanics like XP or streaks.

---

## D006 — Anchored facts (not random per-view)

**Date:** Design discussion
**Status:** Accepted

**Decision:** Each saved word, when saved, is paired with one general-knowledge fact, and that pairing is permanent. The pairing is per-user (not shared across users), so your "eloquent" card may pair with Japan and another user's may pair with Mt. Kilimanjaro.

**Why:** Anchoring makes each card feel like a unique artifact. Randomizing on every view would dilute the collection feeling and confuse repeat visits. Per-user anchoring (vs. global) means we don't have to predetermine word-fact pairs and the system naturally accommodates new words and new facts.

---

## D007 — Five fact categories, regionally balanced

**Date:** Catalog planning
**Status:** Accepted

**Decision:** Catalog covers flags, landmarks, constellations, animals, and geography. Each fact has a `region` tag. The picker biases toward the least-represented region in the user's history.

**Why:** "Calm, educational, all ages" requires deliberate global representation. Default to broadly distributed content, especially in landmarks (where pop-culture lists are Eurocentric). Region tagging lets us enforce balance algorithmically rather than hoping curation lands it.

---

## D008 — Quiz weighting via simple priority formula (not full SM-2)

**Date:** Quiz design
**Status:** Accepted for v1

**Decision:** Word selection uses a 3-term weighted formula (recent incorrectness + recency + random) rather than a full spaced-repetition algorithm like SM-2.

**Why:** Simpler to implement, easier to reason about. Produces good-enough behavior for v1: words you got wrong come back, words you haven't seen come back, with some randomness for freshness. We can layer SM-2 later if quiz outcomes show users would benefit.

---

## D009 — Synonyms accepted in fill-in-the-blank

**Date:** Quiz design
**Status:** Accepted

**Decision:** In format 4 (fill-in-the-blank), the user's answer is correct if it matches the target word OR any known synonym. When a synonym is accepted, the feedback shows "We were looking for **eloquent**, but **articulate** works too."

**Why:** Rewards genuine vocabulary knowledge rather than penalizing for not guessing the specific word. Also surfaces the target word for learning.

---

## D010 — 50-word free cap, $4.99 one-time purchase

**Date:** Monetization discussion
**Status:** Designed, not implemented in v1 build

**Decision:** Free tier allows up to 50 saved words. Paid one-time purchase at $4.99 unlocks unlimited. No subscription, no ads, ever.

**Why one-time vs subscription:** Vocabulary apps are utilities, not services. Subscriptions feel heavy for a tool you use periodically. One-time purchase is honest and aligns incentives (we build a good product once; they pay once).

**Why this cap:** 50 lets users genuinely experience the app — they hit the cap only when meaningfully invested. Tunable post-launch.

**Why deferred for v1 build:** Developer is testing/iterating before store submission. No store accounts, no payment infrastructure yet. Built behind a `paywall_enabled` feature flag.

---

## D011 — No ads, ever

**Date:** Initial planning
**Status:** Permanent

**Decision:** TST will never display advertising. No banner ads, no interstitials, no sponsored content, no "recommended apps."

**Why:** Ads disrupt learning, train the user to ignore the interface, contradict the calm tone. The product is paid for by the one-time purchase.

---

## D012 — Notifications: 3 per day, one word, silent by default

**Date:** Notifications design
**Status:** Accepted

**Decision:** Three notifications per day, all for the same word-of-the-day, revealing it differently (definition / sentence / synonym). Sound and vibration are OFF by default — user opts in. No notifications if library has fewer than 5 words. Single re-engagement nudge after 7 days of inactivity.

**Why:** Three pings per word per day reinforces memorization. Silent default respects the "calm, subtle" tone. Library threshold prevents repetitive pings for the same handful of words.

---

## D013 — Privacy-first analytics, opt-out by default

**Date:** Telemetry discussion
**Status:** Accepted

**Decision:** Anonymized usage data and crash reports are collected by default. User can opt out with one tap in Settings. No personal identifiers in any telemetry.

**Why:** Crash reports and aggregate usage help build a better product. Opting OUT (rather than opting IN) is fair because the data is anonymous; we're transparent about it in onboarding and settings; user has full control.

---

## D014 — Tiered spec format

**Date:** Spec planning
**Status:** Accepted

**Decision:** Spec consists of a short top-level `CLAUDE.md` linking to focused docs in `docs/`, rather than one monolithic spec document.

**Why:** Easier to maintain, easier to update one piece (e.g., quiz engine) without touching others. Claude Code navigates cross-file references fine. Maintains separation of concerns.

---

## D015 — App name: TST (Two Small Things)

**Date:** Naming discussion
**Status:** Accepted

**Decision:** "Two Small Things" is the full name, "TST" is the abbreviated form used for the app icon and product short-name. App Store listing uses the full name; the icon shows "TST."

**Why:** The full name captures the core value proposition (word + fact). The abbreviation works as a clean three-letter icon. Search-clean against App Store and Play Store (verified). Available trademark space.

---

## D016 — Categories are internal, not exposed in v1 UI

**Date:** Discussion
**Status:** Accepted

**Decision:** Words are tagged internally with part-of-speech and (optionally) difficulty. These tags are used by the quiz engine (for distractors, format choice) but not surfaced as UI filters in v1.

**Why:** "Filter your library by part of speech" is a feature most users wouldn't use. Exposing it adds clutter. The tags pull their weight invisibly. If usage data later suggests users want filtering, we can surface it.

---

## D017 — Pronunciation as syllable hints (no audio in v1)

**Date:** Discussion
**Status:** Accepted

**Decision:** Pronunciation is shown as syllable-separated text (e.g., `el·o·quent`). No audio playback in v1.

**Why:** Audio adds significant complexity (asset hosting, playback library, accessibility considerations) for a feature that's nice-to-have but not core. Syllable hints provide most of the value at a fraction of the cost. Audio can be added later when audio sources are confirmed and the architecture supports it.

---

## D018 — Starter word interest areas: pool of 10, show 5

**Date:** Onboarding discussion
**Status:** Accepted

**Decision:** Curate 10 interest areas in the database. During onboarding, show 5 randomly selected (always including "Just give me variety").

**Why:** 5 visible options keeps the onboarding screen light and decisive. A larger pool of 10 gives flexibility to expand or shuffle without redesigning the screen. Different users seeing different combinations adds nice variety.

---

## D019 — Admin dashboard as separate Next.js web app

**Date:** Admin discussion
**Status:** Accepted

**Decision:** Admin functionality lives in a separate Next.js web application, sharing the same Supabase backend. Not shipped to app stores.

**Why:** Admin tasks (managing facts, triaging reports) need a real keyboard and screen. Building admin into the mobile app would bloat the user-facing app. Separate deployment also means admin can be iterated independently and access can be tightly controlled.

---

## D020 — Spelling correction: local first, API fallback

**Date:** Discussion
**Status:** Accepted

**Decision:** Spell-check user input against a bundled 30k common-word list using fuzzy matching (Levenshtein). Fall back to the dictionary API's built-in suggestion field for words not found locally.

**Why:** Fast, offline-capable for the common case. Most misspellings are of common words. API fallback handles obscure words gracefully. Can be replaced with a more robust solution later (LanguageTool, OpenAI, etc.) if quality matters more than cost/latency.
