/**
 * Format 3: Pick the synonym (multiple choice)
 *
 * Show the word. User picks a synonym from 4 options.
 * Skip this format if the word has no synonyms.
 */

import { MCQuestion, QuizWord } from '../types';
import { shuffleOptions } from '../distractors';
import commonWords from '@/data/common-words.json';

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

let _counter = 0;
function makeId(): string {
  return `q_syn_${Date.now()}_${_counter++}`;
}

export function canGenerateSynonym(word: QuizWord): boolean {
  return word.synonyms.length > 0;
}

export function generateSynonym(word: QuizWord, allWords: QuizWord[]): MCQuestion {
  // Pick one correct synonym at random
  const correctSynonym = word.synonyms[Math.floor(Math.random() * word.synonyms.length)];
  const synSet = new Set(word.synonyms.map((s) => s.toLowerCase()));

  // Distractors: words that are NOT synonyms of the target
  const others = allWords.filter((w) => w.id !== word.id && !synSet.has(w.word.toLowerCase()));
  const samePos = shuffle(others.filter((w) => w.partOfSpeech === word.partOfSpeech));
  const diffPos = shuffle(others.filter((w) => w.partOfSpeech !== word.partOfSpeech));

  const distractors: string[] = [];
  for (const w of [...samePos, ...diffPos]) {
    if (distractors.length >= 3) break;
    const low = w.word.toLowerCase();
    if (!synSet.has(low) && low !== correctSynonym.toLowerCase() && !distractors.includes(w.word)) {
      distractors.push(w.word);
    }
  }

  // Pad with common words if needed
  if (distractors.length < 3) {
    for (const w of shuffle(commonWords as string[])) {
      if (distractors.length >= 3) break;
      const low = w.toLowerCase();
      if (
        !synSet.has(low) &&
        low !== correctSynonym.toLowerCase() &&
        !distractors.map((d) => d.toLowerCase()).includes(low)
      ) {
        distractors.push(w);
      }
    }
  }

  const options = shuffleOptions([correctSynonym, ...distractors.slice(0, 3)]);

  return {
    id: makeId(),
    format: 'synonym',
    word,
    prompt: word.word,
    options,
    correctOption: correctSynonym,
  };
}
