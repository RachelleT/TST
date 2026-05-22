import { SavedWord } from '@tst/shared';
import { upsertRow } from '../db/crud';
import { getDb } from '../db/migrations';
import { DictionaryEntry } from '../dictionary/types';
import { pickFact } from '../fact-picker';
import { enqueueSyncDebounced } from '../sync';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function saveWord(
  userId: string,
  entry: DictionaryEntry,
  senseIndex: number,
): Promise<SavedWord> {
  const db = await getDb();
  const sense = entry.senses[senseIndex];
  if (!sense) throw new Error(`No sense at index ${senseIndex}`);

  const now = new Date().toISOString();

  // Next sequential card number for this user
  const row = await db.getFirstAsync<{ max_card: number | null }>(
    'SELECT MAX(card_number) as max_card FROM saved_words WHERE user_id = ? AND deleted = 0',
    [userId],
  );
  const cardNumber = (row?.max_card ?? 0) + 1;

  const id = generateUUID();
  const wordLower = entry.word.toLowerCase();

  await upsertRow('saved_words', {
    id,
    user_id: userId,
    word: wordLower,
    sense_index: senseIndex,
    part_of_speech: sense.partOfSpeech,
    pronunciation: entry.pronunciation,
    definition: sense.definition,
    example_sentence: sense.exampleSentence,
    synonyms: JSON.stringify(sense.synonyms.slice(0, 8)),
    card_number: cardNumber,
    created_at: now,
    updated_at: now,
    local_updated_at: now,
    sync_pending: 1,
    deleted: 0,
  });

  const factId = await pickFact(userId);
  if (factId) {
    await upsertRow('fact_assignments', {
      id: generateUUID(),
      user_id: userId,
      saved_word_id: id,
      fact_id: factId,
      created_at: now,
      local_updated_at: now,
      sync_pending: 1,
      deleted: 0,
    });
  }

  enqueueSyncDebounced();

  return {
    id,
    userId,
    word: wordLower,
    senseIndex,
    partOfSpeech: sense.partOfSpeech,
    pronunciation: entry.pronunciation,
    definition: sense.definition,
    exampleSentence: sense.exampleSentence,
    synonyms: sense.synonyms.slice(0, 8),
    cardNumber,
    createdAt: now,
    updatedAt: now,
  };
}

export async function removeSavedWord(wordId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE saved_words SET deleted = 1, local_updated_at = ?, sync_pending = 1 WHERE id = ?',
    [now, wordId],
  );
  enqueueSyncDebounced();
}
