/**
 * Quiz engine — session orchestration.
 *
 * generateSession(): select words, assign formats, return questions.
 * recordAnswer():   write one quiz_attempt row to SQLite.
 */

import { getDb } from '@/lib/db/migrations';
import { QuizWord, QuizQuestion, QuestionFormat, AnswerResult } from './types';
import { selectQuizWords } from './selectors';
import { generateDefToWord } from './formats/def-to-word';
import { generateWordToDef } from './formats/word-to-def';
import { generateSynonym, canGenerateSynonym } from './formats/synonym';
import { generateFillInSentence } from './formats/fill-in-sentence';
import { generateWordForDescription } from './formats/word-for-description';

export { selectQuizWords };

// ─── helpers ─────────────────────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const ALL_FORMATS: QuestionFormat[] = [
  'def_to_word',
  'word_to_def',
  'synonym',
  'fill_in_sentence',
  'word_for_description',
];

const MAX_FORMAT_REPS = 3; // no more than 3 of the same format per session

// ─── format picker ────────────────────────────────────────────────────────────

function pickFormat(
  word: QuizWord,
  sessionCounts: Record<QuestionFormat, number>,
  enabled: QuestionFormat[],
  /** Formats already used for this specific word in this session */
  usedForWord: QuestionFormat[] = [],
): QuestionFormat {
  const wordFits = (f: QuestionFormat) => f !== 'synonym' || canGenerateSynonym(word);

  // Pass 1: under session cap AND not yet used for this word
  let available = enabled.filter(
    (f) => sessionCounts[f] < MAX_FORMAT_REPS && wordFits(f) && !usedForWord.includes(f),
  );

  // Pass 2: under session cap, ignore word-level history
  if (available.length === 0) {
    available = enabled.filter((f) => sessionCounts[f] < MAX_FORMAT_REPS && wordFits(f));
  }

  // Pass 3: ignore session cap entirely (only reached when nearly all slots are full)
  if (available.length === 0) {
    available = enabled.filter(wordFits);
  }

  // Last resort
  if (available.length === 0) return 'def_to_word';

  return available[Math.floor(Math.random() * available.length)];
}

// ─── question builder ─────────────────────────────────────────────────────────

function buildQuestion(
  word: QuizWord,
  format: QuestionFormat,
  allWords: QuizWord[],
): QuizQuestion {
  switch (format) {
    case 'def_to_word':
      return generateDefToWord(word, allWords);
    case 'word_to_def':
      return generateWordToDef(word, allWords);
    case 'synonym':
      return generateSynonym(word, allWords);
    case 'fill_in_sentence':
      return generateFillInSentence(word);
    case 'word_for_description':
      return generateWordForDescription(word, allWords);
  }
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Generate a quiz session of exactly `count` questions for `userId`.
 *
 * If the user has fewer saved words than `count`, words are reused with
 * different formats so the session always hits the requested length.
 * Returns null if the user has fewer than QUIZ_MIN_WORDS saved words.
 */
export async function generateSession(
  userId: string,
  count: number,
  enabledFormats: QuestionFormat[] = ALL_FORMATS,
): Promise<QuizQuestion[] | null> {
  // allWords is sorted by priority (highest first); may be fewer than count
  const allWords = await selectQuizWords(userId, count);
  if (!allWords) return null;

  // Session-level cap: no more than MAX_FORMAT_REPS of any single format
  const formatCounts = Object.fromEntries(
    ALL_FORMATS.map((f) => [f, 0]),
  ) as Record<QuestionFormat, number>;

  // Per-word format history within this session (for variety when a word repeats)
  const wordFormatHistory: Record<string, QuestionFormat[]> = {};

  const questions: QuizQuestion[] = [];
  let wordIdx = 0;

  // Safety valve: never loop more than count × 3 times
  const maxIter = count * 3;
  let iter = 0;

  while (questions.length < count && iter++ < maxIter) {
    const word = allWords[wordIdx % allWords.length];
    wordIdx++;

    const usedForWord = wordFormatHistory[word.id] ?? [];
    const format = pickFormat(word, formatCounts, enabledFormats, usedForWord);

    wordFormatHistory[word.id] = [...usedForWord, format];
    formatCounts[format]++;
    questions.push(buildQuestion(word, format, allWords));
  }

  return questions;
}

/**
 * Persist one quiz answer to the local SQLite quiz_attempts table.
 * The sync engine will push it to Supabase on the next sync.
 */
export async function recordAnswer(
  userId: string,
  wordId: string,
  format: QuestionFormat,
  result: AnswerResult,
  userAnswer: string,
  expectedAnswer: string,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO quiz_attempts
       (id, user_id, saved_word_id, question_format, result,
        user_answer, expected_answer, created_at, local_updated_at, sync_pending)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [generateUUID(), userId, wordId, format, result, userAnswer, expectedAnswer, now, now],
  );
}
