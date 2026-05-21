# Notifications

## Overview

Three gentle daily reminders, surfacing one word from the user's saved library, revealing it from three different angles across the day. Plus an occasional re-engagement nudge for users who've gone quiet.

All notifications are **scheduled locally on the device** using `expo-notifications`. No push server is required.

## Mechanics

### Daily reminders

Each day, **one word is selected** as the day's word. That word appears in all three notifications, revealed differently each time:

- **Morning ping (default 08:00):** shows the **definition**.
- **Noon ping (default 12:00):** shows the **example sentence**, with the target word redacted (`______`).
- **Evening ping (default 19:00):** shows a **synonym**, with the prompt "do you remember the word?"

The repetition reinforces. The user receives the same word three times in one day, encountering it three different ways. The next day, a different word is selected.

### Selection of the day's word

At the start of each scheduling window (typically at 04:00 local each day, or at sign-in), the system picks the day's word:

```
function pickWordOfTheDay(userId):
    today = today's date in user's timezone
    words = saved_words where user_id = userId

    // exclude any word already used as word-of-the-day in the last 7 days
    recentWordIds = SELECT saved_word_id FROM notification_events
                    WHERE user_id = userId
                    AND fired_at > now() - 7 days
                    AND slot = 'morning'
    candidates = words.filter(w => w.id NOT IN recentWordIds)
    if candidates is empty: candidates = words  // fallback if library < 7

    // weight: prefer words that did poorly in recent quizzes, or have never been word-of-the-day
    for word in candidates:
        recentIncorrect = count quiz_attempts where saved_word_id = word.id
                          and result = 'incorrect'
                          and created_at > now() - 14 days
        timesUsed = count notification_events where saved_word_id = word.id
                    and slot = 'morning'
        word.weight = 2.0 * recentIncorrect
                    + 1.0 / (1 + timesUsed)
                    + 0.5 * random()

    return candidates.sortBy(weight desc).first()
```

The day's word is stored locally so all three pings of that day reference the same word, even across app restarts.

## Edge cases

### Library too small

If the user has fewer than 5 saved words, **no notifications fire at all**.

After 7 consecutive days with no words being saved, fire a single re-engagement nudge at the user's morning time:

> "It's been a few days. Adding a word or two will start your daily reminders."

The nudge taps into the search screen.

### Notification permission denied

If the user denied notifications at onboarding, the settings screen shows a clear card explaining how to enable them in the OS settings, with a button that deep-links to the OS settings page. We don't repeatedly prompt.

### App is in the foreground when notification fires

`expo-notifications` lets us configure foreground behavior. We set it to: **don't show the system notification UI when the app is open** — the user is already engaged. No banner, no badge, no sound. We may show a subtle inline indicator in the app, but only if the user is on the library or home screen, never on quiz or search.

### Daylight saving time changes

Notifications are scheduled with calendar-based triggers in the user's local timezone (handled by `expo-notifications`). DST transitions are managed automatically by the OS.

### User changes notification times

When the user changes any notification time in settings:

1. Cancel all currently scheduled notifications.
2. Re-schedule notifications for the next 14 days using the new times.
3. The currently-selected day's word is preserved.

### User changes timezone

When the device timezone changes (detected at app launch):

1. Cancel all scheduled notifications.
2. Re-schedule with the new timezone.

## Notification copy

The tone is calm and warm. Notifications are short — they appear as system banners with limited room.

### Morning (definition)

Title: `Word of the day · eloquent`
Body: `Fluent or persuasive in speaking or writing.`

### Noon (sentence with blank)

Title: `Same word · used in a sentence`
Body: `She gave a brilliant and ______ speech at graduation.`

### Evening (synonym hint)

Title: `Same word · one more cue`
Body: `It's similar to "articulate." Tap to reveal.`

### Re-engagement nudge

Title: `TST`
Body: `It's been a few days. Adding a word or two will start your daily reminders.`

Copy can be tuned. Keep it under ~80 characters per line. Never use exclamation marks. Never say "Don't miss…" or "You're losing your streak."

## Default settings

These are the defaults users start with after onboarding. All are user-adjustable in Settings → Notifications.

```json
{
  "enabled": true,
  "morningTime": "08:00",
  "noonTime": "12:00",
  "eveningTime": "19:00",
  "days": ["mon","tue","wed","thu","fri","sat","sun"],
  "sound": false,
  "vibration": false
}
```

Note: sound and vibration are off by default. The user opts INTO sound/vibration. We err on the side of quietness.

## Scheduling implementation

`app/lib/notifications.ts` exposes:

```typescript
async function scheduleNotifications(settings: NotificationSettings, savedWords: SavedWord[]): Promise<void>
async function cancelAllNotifications(): Promise<void>
async function registerForPushPermissions(): Promise<'granted' | 'denied' | 'undetermined'>
async function pickAndPersistDayWord(userId: string): Promise<SavedWord | null>
function buildNotificationContent(word: SavedWord, slot: 'morning' | 'noon' | 'evening'): NotificationContent
```

The flow on app launch:

```
1. Read NotificationSettings from local SQLite.
2. If notifications disabled or library too small, cancel any scheduled and exit.
3. Otherwise:
   a. Check if today's word has been chosen. If not, pick it and persist.
   b. Cancel previously scheduled notifications.
   c. Schedule the next 14 days of notifications:
      - For each day, for each slot (morning/noon/evening), schedule a notification with
        appropriate copy. The first day uses the persisted "day's word"; subsequent days
        will re-pick when the app next launches that day (or at midnight via a background task).
4. Log the schedule to the local notification_events queue for diagnostics (if analytics opted in).
```

Because we can only know today's word with certainty at the start of that day, we schedule day 1 with the actual word and days 2–14 with **rotating placeholder content** that gets refreshed when the app next opens. This is a deliberate tradeoff: if the user doesn't open the app for two days, days 2 and 3 will use the same word as day 1 — acceptable because repetition aids memorization anyway.

Alternative considered: background tasks (`expo-background-fetch`) to refresh the day's word at midnight. Rejected for v1 — adds complexity and battery overhead for marginal benefit.

## Deep linking

Tapping a notification opens the app directly to the relevant word's card detail view.

Notification payload includes:
```json
{
  "savedWordId": "uuid",
  "slot": "morning",
  "mode": "definition"
}
```

The app reads this on cold-start or warm-resume and navigates to `/library/[savedWordId]?mode=definition`.

## Privacy

- Notifications never include the user's name or any personal info beyond the word itself.
- Notification content is stored only on the device; the cloud only knows the schedule via the user's `notification_settings`.
- If `analytics_opted_in = false`, the `notification_events` table is not populated.

## Testing strategy

- Unit-test `pickWordOfTheDay` with fixtures (history, quiz attempts, library size).
- Unit-test `buildNotificationContent` for all three slot modes.
- Manual testing: schedule a notification 30 seconds out, verify content, deep-linking, and behavior in foreground/background.
- Edge testing: empty library, library of exactly 5 words, DST transition (simulate timezone change), permission revoked.
