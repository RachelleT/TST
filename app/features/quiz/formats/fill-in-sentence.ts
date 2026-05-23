/**
 * Format 4: Fill in the blank (text input)
 *
 * Show the example sentence with the target word replaced by ______.
 * Accept: target word (correct) or any synonym (synonym_accepted).
 * Falls back to a generic template if the sentence doesn't contain the word.
 */

import { FillInQuestion, QuizWord } from '../types';

let _counter = 0;
function makeId(): string {
  return `q_fill_${Date.now()}_${_counter++}`;
}

function buildPrompt(word: QuizWord): string {
  if (word.exampleSentence) {
    // Replace the target word (whole-word, case-insensitive) with ______
    const regex = new RegExp(`\\b${escapeRegex(word.word)}\\b`, 'i');
    if (regex.test(word.exampleSentence)) {
      return word.exampleSentence.replace(regex, '______');
    }
  }
  // Generic fallback
  return `The word "______" means: "${word.definition}"`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateFillInSentence(word: QuizWord): FillInQuestion {
  return {
    id: makeId(),
    format: 'fill_in_sentence',
    word,
    prompt: buildPrompt(word),
    correctAnswer: word.word,
    acceptedAnswers: [word.word, ...word.synonyms],
  };
}
