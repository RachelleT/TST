# Product spec

## The three loops

TST works through three reinforcing loops:

1. **Search & save.** Look up a word. See its definition, syllable-hint pronunciation, synonyms, example sentence, and an automatically-paired knowledge fact. Save the word to your library.
2. **Daily reminders.** Three gentle notifications per day cycle through one word from your library, revealing it from a different angle each time (definition → example sentence → synonym).
3. **Quizzes.** Short, bounded quiz sessions with mixed question formats, drawn from your saved words, weighted toward words you've gotten wrong recently.

These reinforce each other. Saving builds the library. Reminders surface words across the day. Quizzes test recall and feed back into which words get prioritized in future reminders and quizzes.

## Core user journey (first-time user)

1. **Welcome.** Single screen, calm. Names the three loops in plain language. One CTA: continue.
2. **Sign up.** Required. Apple Sign In, Google Sign In, or email. Privacy policy + ToS links visible (not aggressively pre-checked).
3. **Notification permission.** Soft framing: "TST sends gentle daily reminders to help you remember. Adjust anytime in settings." Two options: allow / not now. Never block progress on this.
4. **Interest selection.** "What kind of words do you want to learn?" 5 areas shown (randomly drawn from the catalog of 10, with "Just give me variety" always present). Multi-select, optional. Skip is allowed.
5. **Starter words.** Based on selection, show ~6 curated word cards. User taps to save the ones that interest them. Skip is allowed. No minimum to leave onboarding.
6. **First "two small things" moment.** As soon as the first word is saved, the card flips/reveals to show the paired fact. A one-line note appears: *"Every word in your library carries a small fact too — a flag, a wonder, an animal. Two small things, learned together."*
7. **Home.** Land on the library, which now has 0–6 cards. Empty state if 0.

## Returning user journey

1. App opens to **Home**, which is the library.
2. Bottom tab nav: **Library**, **Search**, **Quiz**, **Settings**. Four tabs, no more.
3. Notifications fired during the day deep-link directly into the relevant word card.

## Screens

### Library

The user's saved words, as cards.

- Grid layout on tablets (3-column), stacked list on phone.
- Each card is the full Pokémon-style card (see `docs/design.md`).
- Sort options (in a small menu, not a tab bar): recently added, alphabetical, recently reviewed, struggling-with.
- Empty state: a single placeholder card with friendly copy, "Your library is empty. Search for a word to add your first."
- Pull to refresh. Refresh fetches latest sync from Supabase.

When tapped, a card expands to a **card detail view** with:
- All card content at larger size
- "Reveal fact" if the fact hasn't been read yet
- Action buttons: remove from library, report incorrect fact
- Quiz history for this word (e.g. "Reviewed 4 times, 3 correct")

### Search

- Search bar at top, with clear button.
- As the user types, show local suggestions (from common-word list, fuzzy-matched).
- On submit (or tap a suggestion): query the dictionary API, render result as a card preview.
- If the word is misspelled: "Did you mean: *eloquent*, *elegant*, *elope*?" — suggestions are tappable.
- Below the card preview: a primary "Save to library" button.
- If the user is at the 50-word cap (when paywall is enabled), show a gentle nudge instead of disabling the button. v1 build: button always works.
- Recent searches shown below the search bar when input is empty.

### Quiz

- Entry screen: "Ready for a quiz?" with a single CTA to start.
- Session settings (gear icon, top right): question count slider (5/10/15/20), question format toggles (all formats on by default).
- Session: question presented one at a time. Mix of formats. Progress dots at top.
- After each question, immediate feedback (correct/incorrect/synonym-accepted) with a one-line explanation.
- End of session: summary screen — score, words missed (tappable to view their cards), one CTA: "Done."

### Settings

Three sections:

**Account**
- Profile (name, email)
- Sign out
- Delete account (with confirmation flow)
- Export data (downloads a JSON of all saved words + history)

**Notifications**
- Master toggle
- Time of day for each of the 3 daily pings (with sensible defaults)
- Day-of-week toggles (default all on)
- Sound on/off (default off — "subtle")
- Vibration on/off (default off)

**App**
- Quiz default length (5/10/15/20)
- Reduce motion (defaults to OS setting)
- Theme: System / Light / Dark
- Analytics opt-out toggle
- About / version
- Report a fact (opens the same form available on cards)

## User flows: detailed

### Saving a word

1. User searches a word, sees the card preview.
2. User taps "Save to library."
3. Locally:
   - Insert a record in the local SQLite `saved_words` table with `synced_at = null`.
   - Run the fact-assignment logic (see `docs/facts-catalog.md`) and insert a `fact_assignment` record.
   - Update UI immediately to show the card in the library.
4. In background:
   - Push both records to Supabase.
   - On success, mark them `synced_at = now()` locally.
   - On failure, retry with exponential backoff. User sees no error unless retries exhaust over hours.

### Receiving a daily reminder

1. Notifications are scheduled locally at install time and on settings changes (not via push from a server).
2. Each scheduled notification fires at the configured time, picks a word from the user's library (weighted: recently-unseen, recently-wrong-in-quiz).
3. The notification cycles through three modes for the same word over a single day:
   - Morning: shows the **definition**.
   - Noon: shows the **example sentence**.
   - Evening: shows a **synonym** (with the user expected to recall the word).
4. Tapping the notification opens the app directly to that word's card detail view.
5. If the user has fewer than 5 saved words, all notifications are silently suppressed. After 7 days with no saved words, send a single gentle nudge: "Save a few more words and TST will start sending daily reminders."

### Taking a quiz

1. Quiz engine selects N words from the saved library (default N=10).
2. Word selection weighting:
   - 60% recently-wrong (last 14 days)
   - 30% least-recently-reviewed
   - 10% random
3. For each selected word, the engine picks one of the 5 question formats:
   - Definition → Word (multiple choice)
   - Word → Definition (multiple choice)
   - Pick the synonym (multiple choice)
   - Fill in the blank in a sentence (text input)
   - Pick the word for a description (multiple choice)
4. Format distribution: roughly even, but no more than 3 of the same format in one session.
5. For text-input questions: accept the target word and any of its known synonyms as correct. If a synonym was accepted, the result screen shows the message "We were looking for *eloquent*, but *articulate* works too."
6. After session: record outcomes per word in `quiz_attempts` table.

### Reporting a fact

1. From a card or settings, user taps "Report this fact."
2. Modal opens with:
   - Category radio buttons: "Factually incorrect," "Outdated," "Culturally insensitive," "Spelling/grammar," "Other."
   - Free-text field (optional, with placeholder "Tell us more...").
   - Submit button.
3. On submit: insert into `fact_reports` table with user_id, fact_id, category, note, created_at.
4. User sees a confirmation: "Thanks — we'll review this."
5. Reports show up in the admin dashboard for triage.

## Offline behavior

- **Saved words and their cards**: fully viewable offline (cached in SQLite).
- **Quiz**: works fully offline using saved words.
- **Search for a new word**: requires network. Show clear "no connection" empty state, not an error.
- **Notifications**: scheduled locally, fire regardless of connectivity.
- **Sync**: pending local changes (new saves, quiz results, fact reports) queue locally and push when connection returns.

## Empty states

Each major screen has a designed empty state:

- **Library empty**: a placeholder card with light copy, "Your first word is one search away." Below it, a "Search now" button.
- **Search empty (no input)**: recent searches if any; otherwise "Try searching for a word."
- **Quiz with too few words (<5 saved)**: "Save at least 5 words to start a quiz." A button to go to Search.
- **No network**: a single line + retry button. Not a frowny face, not "Oops!"

## Edge cases worth specifying

- **Same word saved twice**: the search result shows "Already in your library" and tapping it opens the existing card.
- **Word lookup returns multiple senses (e.g. "bank")**: show the most common sense by default, with a small "other senses" toggle to view others. The user saves the sense they want; future re-saves of the same word and sense are blocked, but a different sense can be saved.
- **Dictionary API returns no synonyms**: fall back to an empty synonyms zone with placeholder copy ("Synonyms: not available"). Don't fail the lookup.
- **User at the 50-word cap (when paywall enabled)**: save button on a search result becomes an "Unlock unlimited" button that opens the purchase flow. Existing 50 stay accessible.
- **Notification fires while app is open**: don't double-fire (no in-app banner). Just silently no-op.
- **User signs out**: clear local SQLite cache. Re-fetch on next sign-in.
- **Account deletion**: must remove all user data from Supabase and the local device. Confirm with a typed-confirmation pattern.

## Tone of voice

For all user-facing copy, the voice is:

- **Warm but quiet.** Never loud, never overly enthusiastic.
- **Plain.** No jargon, no acronyms (except "TST" itself).
- **Honest.** No "Oops something went wrong!" — explain what happened.
- **Encouraging without being saccharine.** "Nice — that's three in a row," not "Amazing! You're a vocabulary champion!! 🎉"
- **Inclusive.** All-ages. No teen slang, no condescending kid-speak.

Examples of okay vs. not:

| Don't say | Do say |
|-----------|--------|
| "Oops! Something went wrong" | "We couldn't reach the dictionary. Try again?" |
| "Awesome job!! 🔥" | "Three correct in a row." |
| "Smash that save button!" | "Tap to save." |
| "You're crushing it!" | "Nice work." |
| "Don't miss your streak!" | "It's been a few days — want to add a word?" |
