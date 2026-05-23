/**
 * Format 5: Word for description (multiple choice)
 *
 * Show a paraphrased description/clue. User picks the word.
 * The variation from format 1 comes from the framing: "Which word means…?"
 * rather than the raw dictionary definition.
 */

import { MCQuestion, QuizWord } from '../types';
import { pickWordDistractors, shuffleOptions } from '../distractors';

let _counter = 0;
function makeId(): string {
  return `q_wfd_${Date.now()}_${_counter++}`;
}

function buildDescription(word: QuizWord): string {
  const def = word.definition.trim();
  // Strip a trailing period so we can embed it naturally
  const clean = def.endsWith('.') ? def.slice(0, -1).toLowerCase() : def.toLowerCase();

  switch (word.partOfSpeech) {
    case 'noun':
      return `Which word refers to ${clean}?`;
    case 'verb':
      return `Which word means to ${clean}?`;
    case 'adjective':
      return `Which word describes something that is ${clean}?`;
    case 'adverb':
      return `Which word means ${clean}?`;
    default:
      return `Which word means "${def}"?`;
  }
}

export function generateWordForDescription(
  word: QuizWord,
  allWords: QuizWord[],
): MCQuestion {
  const distractors = pickWordDistractors(word, allWords, 3);
  const options = shuffleOptions([word.word, ...distractors]);

  return {
    id: makeId(),
    format: 'word_for_description',
    word,
    prompt: buildDescription(word),
    options,
    correctOption: word.word,
  };
}
