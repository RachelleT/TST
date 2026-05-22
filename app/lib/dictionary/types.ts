import { PartOfSpeech } from '@tst/shared';

export interface DictionarySense {
  senseIndex: number;
  partOfSpeech: PartOfSpeech;
  definition: string;
  exampleSentence: string;
  synonyms: string[];
}

export interface DictionaryEntry {
  word: string;
  pronunciation: string;
  senses: DictionarySense[];
}

export interface DictionaryProvider {
  lookup(word: string): Promise<DictionaryEntry | null>;
}

export class NetworkError extends Error {
  constructor() {
    super('Network unavailable');
  }
}
