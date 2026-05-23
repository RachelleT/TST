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
    // Order by sense_index ASC so the primary (lowest-index) sense comes first
    // for each (word, part_of_speech) group after deduplication.
    const rows = await db.getAllAsync<SavedWordRow>(
      `SELECT * FROM saved_words
       WHERE user_id = ? AND deleted = 0
       ORDER BY created_at ASC, sense_index ASC`,
      [userId],
    );

    // Keep one representative row per (word, partOfSpeech) for the list.
    // The detail screen re-fetches all senses from the API anyway.
    const seen = new Set<string>();
    const unique = rows.filter((row) => {
      const key = `${row.word}:${row.part_of_speech}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Show newest words first (sort by created_at DESC after dedup)
    unique.sort((a, b) => b.created_at.localeCompare(a.created_at));

    set({ words: unique.map(rowToSavedWord), loading: false, loaded: true });
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
