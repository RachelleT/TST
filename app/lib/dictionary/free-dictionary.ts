import { PartOfSpeech } from '@tst/shared';
import { filterSentence } from '../sentence-filter';
import { DictionaryEntry, DictionaryProvider, DictionarySense, NetworkError } from './types';

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

const POS_MAP: Partial<Record<string, PartOfSpeech>> = {
  noun: 'noun',
  verb: 'verb',
  adjective: 'adjective',
  adverb: 'adverb',
  preposition: 'preposition',
};

interface ApiDefinition {
  definition: string;
  example?: string;
  synonyms: string[];
}

interface ApiMeaning {
  partOfSpeech: string;
  definitions: ApiDefinition[];
  synonyms: string[];
}

interface ApiPhonetic {
  text?: string;
}

interface ApiEntry {
  word: string;
  phonetics: ApiPhonetic[];
  meanings: ApiMeaning[];
}

function extractPronunciation(phonetics: ApiPhonetic[]): string {
  return phonetics.find((p) => p.text)?.text ?? '';
}

function extractSynonyms(meaning: ApiMeaning): string[] {
  const set = new Set<string>();
  for (const syn of meaning.synonyms) set.add(syn);
  for (const def of meaning.definitions) {
    for (const syn of def.synonyms ?? []) set.add(syn);
  }
  return Array.from(set).slice(0, 8);
}

function normalizeSenses(meanings: ApiMeaning[]): DictionarySense[] {
  const senses: DictionarySense[] = [];
  for (let i = 0; i < meanings.length; i++) {
    const m = meanings[i];
    const pos = POS_MAP[m.partOfSpeech.toLowerCase()];
    if (!pos) continue;
    const def = m.definitions[0];
    if (!def) continue;
    const rawExample = def.example ?? '';
    const exampleSentence = rawExample ? (filterSentence(rawExample) ?? '') : '';
    senses.push({
      senseIndex: i,
      partOfSpeech: pos,
      definition: def.definition,
      exampleSentence,
      synonyms: extractSynonyms(m),
    });
  }
  // Fallback: if no sense matched our POS list, use first meaning mapped to noun
  if (senses.length === 0 && meanings.length > 0) {
    const m = meanings[0];
    const def = m.definitions[0];
    if (def) {
      const rawExample = def.example ?? '';
      senses.push({
        senseIndex: 0,
        partOfSpeech: 'noun',
        definition: def.definition,
        exampleSentence: rawExample ? (filterSentence(rawExample) ?? '') : '',
        synonyms: extractSynonyms(m),
      });
    }
  }
  return senses;
}

export const freeDictionary: DictionaryProvider = {
  async lookup(word: string): Promise<DictionaryEntry | null> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/${encodeURIComponent(word.trim().toLowerCase())}`);
    } catch {
      throw new NetworkError();
    }

    if (response.status === 404) return null;
    if (!response.ok) throw new NetworkError();

    const json = await response.json();

    // Not-found responses return an object with a "title" field
    if (!Array.isArray(json)) return null;

    const entry = json[0] as ApiEntry;
    const senses = normalizeSenses(entry.meanings);
    if (senses.length === 0) return null;

    return {
      word: entry.word,
      pronunciation: extractPronunciation(entry.phonetics),
      senses,
    };
  },
};
