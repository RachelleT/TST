/**
 * Distractor selection for multiple-choice questions.
 *
 * Strategy:
 *  1. Prefer same-POS saved words
 *  2. Fall back to any saved word
 *  3. Pad with the bundled common-word list if still short (word distractors only)
 */

import { QuizWord } from './types';
import commonWords from '@/data/common-words.json';

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick `count` distractor *words* (not definitions) from other saved words.
 * Used by: def_to_word, synonym, word_for_description
 */
export function pickWordDistractors(
  target: QuizWord,
  allWords: QuizWord[],
  count = 3,
): string[] {
  const others = allWords.filter((w) => w.id !== target.id);
  const samePos = shuffle(others.filter((w) => w.partOfSpeech === target.partOfSpeech));
  const diffPos = shuffle(others.filter((w) => w.partOfSpeech !== target.partOfSpeech));

  const result: string[] = [];
  for (const w of [...samePos, ...diffPos]) {
    if (result.length >= count) break;
    if (w.word.toLowerCase() !== target.word.toLowerCase() && !result.includes(w.word)) {
      result.push(w.word);
    }
  }

  // Pad with common words if the saved library is small
  if (result.length < count) {
    for (const w of shuffle(commonWords as string[])) {
      if (result.length >= count) break;
      if (
        w.toLowerCase() !== target.word.toLowerCase() &&
        !result.map((r) => r.toLowerCase()).includes(w.toLowerCase())
      ) {
        result.push(w);
      }
    }
  }

  return result.slice(0, count);
}

/**
 * Pick `count` distractor *definitions* from other saved words.
 * Used by: word_to_def
 * (No common-word fallback — we don't have definitions for the common-word list.)
 */
export function pickDefinitionDistractors(
  target: QuizWord,
  allWords: QuizWord[],
  count = 3,
): string[] {
  const others = allWords.filter((w) => w.id !== target.id);
  const samePos = shuffle(others.filter((w) => w.partOfSpeech === target.partOfSpeech));
  const diffPos = shuffle(others.filter((w) => w.partOfSpeech !== target.partOfSpeech));

  const result: string[] = [];
  for (const w of [...samePos, ...diffPos]) {
    if (result.length >= count) break;
    if (w.definition !== target.definition && !result.includes(w.definition)) {
      result.push(w.definition);
    }
  }
  return result.slice(0, count);
}

/** Shuffle an array of options in-place and return it */
export function shuffleOptions<T>(options: T[]): T[] {
  return shuffle(options);
}
