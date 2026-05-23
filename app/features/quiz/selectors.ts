/**
 * Word selection for quiz sessions.
 *
 * Priority formula (higher = more likely to be picked):
 *   3.0 × recent_incorrect_last_14_days
 * + 1.5 × min(days_since_last_attempt / 30, 2.0)
 * + 1.0 × random()
 *
 * New words (no quiz history) contribute the maximum time factor (3.0),
 * so fresh saves are always prioritised for early review.
 */

import { getDb } from '@/lib/db/migrations';
import { QuizWord } from './types';

/** Minimum saved words required to start any quiz session */
export const QUIZ_MIN_WORDS = 5;

function daysBetween(isoStr: string, now: Date): number {
  return (now.getTime() - new Date(isoStr).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Select up to `count` quiz words for `userId`.
 * Returns null if the user has fewer than QUIZ_MIN_WORDS saved words.
 */
export async function selectQuizWords(
  userId: string,
  count: number,
): Promise<QuizWord[] | null> {
  const db = await getDb();

  const rows = await db.getAllAsync<{
    id: string;
    word: string;
    part_of_speech: string;
    pronunciation: string | null;
    definition: string;
    example_sentence: string | null;
    synonyms: string | null;
  }>(
    `SELECT id, word, part_of_speech, pronunciation, definition, example_sentence, synonyms
     FROM saved_words
     WHERE user_id = ? AND deleted = 0`,
    [userId],
  );

  if (rows.length < QUIZ_MIN_WORDS) return null;

  const now = new Date();
  const cutoff14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const scored = await Promise.all(
    rows.map(async (row) => {
      const incorrectRow = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM quiz_attempts
         WHERE saved_word_id = ? AND result = 'incorrect' AND created_at > ?`,
        [row.id, cutoff14d],
      );
      const lastRow = await db.getFirstAsync<{ last_at: string | null }>(
        `SELECT MAX(created_at) AS last_at FROM quiz_attempts WHERE saved_word_id = ?`,
        [row.id],
      );

      const recentIncorrect = incorrectRow?.n ?? 0;
      const daysSince = lastRow?.last_at ? daysBetween(lastRow.last_at, now) : 9999;

      const priority =
        3.0 * recentIncorrect +
        1.5 * Math.min(daysSince / 30, 2.0) +
        1.0 * Math.random();

      return {
        word: {
          id: row.id,
          word: row.word,
          partOfSpeech: row.part_of_speech,
          pronunciation: row.pronunciation,
          definition: row.definition,
          exampleSentence: row.example_sentence,
          synonyms: row.synonyms ? (JSON.parse(row.synonyms) as string[]) : [],
        } satisfies QuizWord,
        priority,
      };
    }),
  );

  scored.sort((a, b) => b.priority - a.priority);
  // Return ALL words sorted by priority — the engine cycles through them to
  // fill the requested question count (a user with 5 words and 10 questions
  // gets each word tested twice, with different formats).
  return scored.map((s) => s.word);
}

/** Count how many quiz-eligible words the user has saved */
export async function getSavedWordCount(userId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM saved_words WHERE user_id = ? AND deleted = 0`,
    [userId],
  );
  return row?.n ?? 0;
}
