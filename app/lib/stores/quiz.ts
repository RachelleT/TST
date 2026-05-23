/**
 * Quiz session state store.
 *
 * Holds the in-flight session so questions can be consumed across renders
 * without prop-drilling or URL-based state (which doesn't handle arrays well).
 */

import { create } from 'zustand';
import { QuizQuestion, RecordedAnswer } from '@/features/quiz/types';

interface QuizState {
  /** Questions for the current session; empty means no active session */
  questions: QuizQuestion[];
  /** Index of the question currently being shown */
  currentIndex: number;
  /** Answers recorded so far this session */
  answers: RecordedAnswer[];
  /** Start a new session */
  startSession: (questions: QuizQuestion[]) => void;
  /** Record the answer to the current question and advance the index */
  pushAnswer: (answer: RecordedAnswer) => void;
  /** Clear state (after summary is dismissed) */
  reset: () => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  questions: [],
  currentIndex: 0,
  answers: [],

  startSession: (questions) =>
    set({ questions, currentIndex: 0, answers: [] }),

  pushAnswer: (answer) =>
    set((state) => ({
      answers: [...state.answers, answer],
      currentIndex: state.currentIndex + 1,
    })),

  reset: () => set({ questions: [], currentIndex: 0, answers: [] }),
}));
