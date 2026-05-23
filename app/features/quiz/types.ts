// Quiz engine types
// All question results, session anatomy, and recorded-answer shapes live here.

export type QuestionFormat =
  | 'def_to_word'
  | 'word_to_def'
  | 'synonym'
  | 'fill_in_sentence'
  | 'word_for_description';

export type AnswerResult = 'correct' | 'incorrect' | 'synonym_accepted';

/** A saved word enriched with everything the engine needs */
export interface QuizWord {
  id: string;           // saved_words.id (UUID)
  word: string;
  partOfSpeech: string;
  definition: string;
  exampleSentence: string | null;
  synonyms: string[];   // parsed from JSON
  pronunciation: string | null;
}

/** Multiple-choice question (4 of the 5 formats) */
export interface MCQuestion {
  id: string;
  format: Exclude<QuestionFormat, 'fill_in_sentence'>;
  word: QuizWord;
  prompt: string;
  options: string[];     // shuffled, always length 4
  correctOption: string; // must appear in options
}

/** Text-input question (fill_in_sentence) */
export interface FillInQuestion {
  id: string;
  format: 'fill_in_sentence';
  word: QuizWord;
  prompt: string;          // sentence with ______
  correctAnswer: string;   // the target word (shown in feedback)
  acceptedAnswers: string[]; // target + synonyms (used for matching)
}

export type QuizQuestion = MCQuestion | FillInQuestion;

/** One answer as it will be persisted to quiz_attempts */
export interface RecordedAnswer {
  wordId: string;
  format: QuestionFormat;
  result: AnswerResult;
  userAnswer: string;
  expectedAnswer: string;
}
