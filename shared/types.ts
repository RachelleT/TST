// Shared TypeScript types — imported by both app/ and admin/

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition';

export type FactCategory = 'flag' | 'landmark' | 'constellation' | 'animal' | 'geography';

export type FactRegion =
  | 'africa_north'
  | 'africa_west'
  | 'africa_east'
  | 'africa_south'
  | 'africa_central'
  | 'americas_north'
  | 'americas_central'
  | 'americas_south'
  | 'caribbean'
  | 'asia_east'
  | 'asia_south'
  | 'asia_southeast'
  | 'asia_central'
  | 'asia_west'
  | 'europe_west'
  | 'europe_east'
  | 'europe_north'
  | 'europe_south'
  | 'oceania_australia'
  | 'oceania_pacific'
  | 'oceania_newzealand'
  | 'polar'
  | 'global';

export type QuizFormat =
  | 'def_to_word'
  | 'word_to_def'
  | 'synonym'
  | 'fill_in_sentence'
  | 'word_for_description';

export type QuizResult = 'correct' | 'incorrect' | 'synonym_accepted';

export interface NotificationSettings {
  enabled: boolean;
  morningTime: string; // "HH:MM" 24h
  noonTime: string;
  eveningTime: string;
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  sound: boolean;
  vibration: boolean;
}

export interface QuizSettings {
  defaultLength: 5 | 10 | 15 | 20;
  enabledFormats: QuizFormat[];
}

export interface SavedWord {
  id: string;
  userId: string;
  word: string;
  senseIndex: number;
  partOfSpeech: PartOfSpeech;
  pronunciation: string;
  definition: string;
  exampleSentence: string;
  synonyms: string[];
  cardNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface Fact {
  id: string;
  category: FactCategory;
  region: FactRegion;
  name: string;
  nameLocal?: string;
  illustrationPath: string;
  factSentence: string;
  active: boolean;
}

export interface FactAssignment {
  id: string;
  userId: string;
  savedWordId: string;
  factId: string;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  savedWordId: string;
  questionFormat: QuizFormat;
  result: QuizResult;
  userAnswer: string;
  expectedAnswer: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  displayName: string | null;
  notificationSettings: NotificationSettings;
  quizSettings: QuizSettings;
  interestAreas: string[];
  analyticsOptedIn: boolean;
  themePreference: 'system' | 'light' | 'dark';
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  morningTime: '08:00',
  noonTime: '12:00',
  eveningTime: '19:00',
  days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  sound: false,
  vibration: false,
};

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  defaultLength: 10,
  enabledFormats: [
    'def_to_word',
    'word_to_def',
    'synonym',
    'fill_in_sentence',
    'word_for_description',
  ],
};
