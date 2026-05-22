import { create } from 'zustand';
import { SavedWord, PartOfSpeech } from '@tst/shared';
import { getDb } from '../db/migrations';

interface SavedWordRow {
  id: string;
  user_id: string;
  word: string;
  sense_index: number;
  part_of_speech: string;
  pronunciation: string | null;
  definition: string;
  example_sentence: string | null;
  synonyms: string | null;
  card_number: number;
  created_at: string;
  updated_at: string;
}

function rowToSavedWord(row: SavedWordRow): SavedWord {
  return {
    id: row.id,
    userId: row.user_id,
    word: row.word,
    senseIndex: row.sense_index,
    partOfSpeech: row.part_of_speech as PartOfSpeech,
    pronunciation: row.pronunciation ?? '',
    definition: row.definition,
    exampleSentence: row.example_sentence ?? '',
    synonyms: row.synonyms ? (JSON.parse(row.synonyms) as string[]) : [],
    cardNumber: row.card_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface LibraryState {
  words: SavedWord[];
  loading: boolean;
  loaded: boolean;
  load: (userId: string) => Promise<void>;
  addWord: (word: SavedWord) => void;
  removeWord: (wordId: string) => void;
  isSaved: (word: string, senseIndex: number) => boolean;
  getSavedWordId: (word: string, senseIndex: number) => string | null;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  words: [],
  loading: false,
  loaded: false,

  async load(userId: string) {
    set({ loading: true });
    const db = await getDb();
    const rows = await db.getAllAsync<SavedWordRow>(
      'SELECT * FROM saved_words WHERE user_id = ? AND deleted = 0 ORDER BY created_at DESC',
      [userId],
    );
    set({ words: rows.map(rowToSavedWord), loading: false, loaded: true });
  },

  addWord(word: SavedWord) {
    set((s) => ({ words: [word, ...s.words] }));
  },

  removeWord(wordId: string) {
    set((s) => ({ words: s.words.filter((w) => w.id !== wordId) }));
  },

  isSaved(word: string, senseIndex: number) {
    return get().words.some(
      (w) => w.word === word.toLowerCase() && w.senseIndex === senseIndex,
    );
  },

  getSavedWordId(word: string, senseIndex: number) {
    return (
      get().words.find(
        (w) => w.word === word.toLowerCase() && w.senseIndex === senseIndex,
      )?.id ?? null
    );
  },
}));
