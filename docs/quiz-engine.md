# Quiz engine

## Goals

Short, bounded quiz sessions that test recall across multiple question formats. Word selection weights toward what the user struggles with, so quizzes feel like targeted practice, not random review.

## Session anatomy

- **Length:** user-adjustable (5, 10, 15, or 20 questions). Default 10.
- **Composition:** mixed question formats. No more than 3 of the same format in one session.
- **Word pool:** the user's saved words only.
- **Minimum to start:** 5 saved words. Below that, show a friendly message.

## Word selection

The selector picks N distinct words for the session.

### Weighting

For each saved word, compute a `priority` score:

```
priority =
   3.0 * (recent_incorrect_count_last_14_days)
 + 1.5 * (days_since_last_quiz_attempt / 30, capped at 2.0)
 + 1.0 * random(0, 1)
```

Higher priority = more likely to be picked. Top N (by priority, with the random component for natural variety) become the session's words.

Notes:
- A word with 0 quiz history has `days_since_last_quiz_attempt = ∞` → contributes the max value (2.0 * 1.5 = 3.0). New saves get prioritized for review.
- A word missed twice in the last 14 days dominates (6.0+).
- The 1.0× random term means even low-priority words have a small chance, keeping sessions feeling fresh.

### Selection pseudocode

```
function selectQuizWords(userId, count):
    words = SELECT * FROM saved_words WHERE user_id = userId
    if words.length < 5:
        return null  // not enough words

    for word in words:
        recentIncorrect = count quiz_attempts
                          where saved_word_id = word.id
                          and result = 'incorrect'
                          and created_at > now() - 14 days
        lastAttempt = max(quiz_attempts.created_at where saved_word_id = word.id)
        daysSince = lastAttempt ? daysBetween(lastAttempt, now()) : 9999

        word.priority = 3.0 * recentIncorrect
                      + 1.5 * min(daysSince / 30, 2.0)
                      + 1.0 * random()

    return words.sortBy(priority desc).take(count)
```

## Question formats

Five formats. Each has its own generator that takes a saved word and produces a question object.

### 1. Definition → Word (multiple choice)

Show the definition. User picks the word from 4 options.

```
Question: "Fluent or persuasive in speaking or writing."
Options: [Eloquent, Reticent, Voluble, Diffident]
```

**Distractors** (the 3 wrong options): drawn from the user's other saved words. Prefer same part of speech. If insufficient same-POS distractors exist (e.g., user has only adjectives), pull from any POS.

### 2. Word → Definition (multiple choice)

Show the word. User picks the right definition from 4 options.

```
Question: Eloquent
Options:
  - "Fluent or persuasive in speaking or writing."  ✓
  - "Reluctant to express thoughts or feelings."
  - "Speaking with great volume and energy."
  - "Lacking confidence or self-assurance."
```

**Distractors:** definitions of the user's other saved words, with the same POS constraint as above.

### 3. Pick the synonym (multiple choice)

Show the word. User picks a synonym from 4 options.

```
Question: Eloquent
Options: [Articulate ✓, Hesitant, Loud, Plain]
```

**Distractors:** picked to be of the same POS but not synonyms (use the user's other saved words). Falls back to common words from the bundled wordlist if needed.

### 4. Fill in the blank (text input)

Show the sentence with a blank where the target word would go. User types their guess.

```
Question: "She gave a brilliant and ______ speech."
[ text input ]
```

**Sentence selection:** prefer the saved word's `example_sentence` from the dictionary API; replace the word with `______`. If the example sentence doesn't contain the exact word form (verb conjugations, plurals), fall back to a generic template ("The word _____ means '...'").

**Accept:**
- The target word (case-insensitive, accepting common conjugations/plurals) → `correct`
- Any of the word's known synonyms → `synonym_accepted`, with the note "We were looking for **eloquent**, but **articulate** works too."
- Anything else → `incorrect`

### 5. Word for description (multiple choice)

Show a description/clue. User picks the word.

```
Question: "Which word describes someone fluent and persuasive in their speech?"
Options: [Eloquent ✓, Stoic, Brusque, Verbose]
```

**Distractors:** as in format 1.

**Difference from format 1:** the prompt is a paraphrased description, not the dictionary definition. This tests retrieval from a slightly different angle. For v1, we can generate the description by prepending "Which word describes..." or "Which word means..." to a softened version of the definition. Acceptable to use the same definition text — the variation comes from the framing.

## Format selection

For each word selected for the session:

1. Look at the user's quiz history for that word. If a format has been used in the last 2 attempts for this word, deprioritize it (we want variety).
2. Among enabled formats (user can disable specific formats in quiz settings), pick one weighted by the deprioritization.
3. Track session-level format counts. No more than 3 of any single format in one session — if we'd exceed this, force a different format.

## Scoring

Per-question outcome is stored in `quiz_attempts` with one of:
- `correct`
- `incorrect`
- `synonym_accepted` (only possible in format 4; counts as correct for session totals but is noted for the user)

Session summary shows:
- Total correct (including synonym_accepted)
- Total incorrect
- Words missed (tappable list to view their cards)

No streaks. No XP. No level-up animations. No leaderboards. The summary is information, not a reward ceremony.

## Engine module layout

```
app/features/quiz/
├── engine.ts              # session orchestration: select words, generate questions, score
├── selectors.ts           # word selection logic with priority scoring
├── formats/
│   ├── def-to-word.ts
│   ├── word-to-def.ts
│   ├── synonym.ts
│   ├── fill-in-sentence.ts
│   └── word-for-description.ts
├── distractors.ts         # logic for picking distractor options
├── synonym-matcher.ts     # case-insensitive + simple morphology matching
├── engine.test.ts
├── selectors.test.ts
└── synonym-matcher.test.ts
```

## Synonym matching for text input

The `synonym-matcher` module accepts the user's input and a list of acceptable answers (the target + synonyms). It:

1. Lowercases, trims.
2. Strips trailing punctuation.
3. Compares against each acceptable answer exactly.
4. If no exact match, applies simple morphology: strip common suffixes (`s`, `ed`, `ing`, `er`, `est`) and re-compare.
5. Returns `{ matched: boolean, matchedAs: 'target' | 'synonym' | null, matchedWord?: string }`.

We deliberately do NOT do full lemmatization or fuzzy matching here. We want the user to type something *close to right*. "Hppy" for "happy" is incorrect; "happily" for "happy" is acceptable (suffix-strip). Edge cases will be tuned by real testing.

## Edge cases

- **Word has no synonyms:** format 3 (pick the synonym) is skipped for this word. Engine picks a different format.
- **Word has no example sentence:** format 4 (fill-in) falls back to the generic template.
- **Fewer than 4 saved words for distractors:** pad with common words from the bundled 30k common-word list (filtered to the right POS).
- **All session words have only adjectives:** distractors won't all share POS; that's fine.
- **User changes the session length mid-quiz:** N/A — settings are read at session start only.
- **User force-quits a quiz:** the in-progress session is abandoned. Already-answered questions ARE recorded in `quiz_attempts`. Unanswered questions are dropped.
- **No quiz history at all:** the priority formula handles this naturally — everything is high-priority initially.

## Future considerations (not v1)

- Spaced-repetition curves (e.g., SM-2). The current weighting is simpler but produces reasonable behavior. SM-2 can be a v2 upgrade if quiz outcomes show it would help.
- Audio questions (when audio pronunciation is added in a future version).
- "Stretch" sessions where one extra word the user hasn't saved is included as a learning opportunity. Considered and rejected for v1 (you said "saved words only").
