/**
 * Format 1: Definition → Word (multiple choice)
 *
 * Show the definition. User picks the word from 4 options.
 */

import { MCQuestion, QuizWord } from '../types';
import { pickWordDistractors, shuffleOptions } from '../distractors';

let _counter = 0;
function makeId(): string {
  return `q_dtw_${Date.now()}_${_counter++}`;
}

export function generateDefToWord(word: QuizWord, allWords: QuizWord[]): MCQuestion {
  const distractors = pickWordDistractors(word, allWords, 3);
  const options = shuffleOptions([word.word, ...distractors]);

  return {
    id: makeId(),
    format: 'def_to_word',
    word,
    prompt: word.definition,
    options,
    correctOption: word.word,
  };
}
