/**
 * Format 2: Word → Definition (multiple choice)
 *
 * Show the word. User picks the correct definition from 4 options.
 */

import { MCQuestion, QuizWord } from '../types';
import { pickDefinitionDistractors, shuffleOptions } from '../distractors';

let _counter = 0;
function makeId(): string {
  return `q_wtd_${Date.now()}_${_counter++}`;
}

export function generateWordToDef(word: QuizWord, allWords: QuizWord[]): MCQuestion {
  const distractors = pickDefinitionDistractors(word, allWords, 3);
  const options = shuffleOptions([word.definition, ...distractors]);

  return {
    id: makeId(),
    format: 'word_to_def',
    word,
    prompt: word.word,
    options,
    correctOption: word.definition,
  };
}
