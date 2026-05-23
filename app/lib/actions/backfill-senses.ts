/**
 * One-time backfill: for every word already saved in the library, fetch its
 * full entry from the dictionary API and insert any senses that are missing
 * from saved_words.  Only runs once per user (tracked via _meta).
 *
 * Returns true if the backfill actually ran, false if it was already done.
 */

import { PartOfSpeech } from '@tst/shared';
import { getDb } from '../db/migrations';
import { getMetaValue, setMetaValue, upsertRow } from '../db/crud';
import { freeDictionary } from '../dictionary/free-dictionary';

const BACKFILL_KEY = 'senses_backfill_v1';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function backfillMissingSenses(userId: string): Promise<boolean> {
  const done = await getMetaValue(BACKFILL_KEY);
  if (done === '1') return false;

  const db = await getDb();

  // All distinct words this user has saved
  const wordRows = await db.getAllAsync<{ word: string }>(
    `SELECT DISTINCT word FROM saved_words WHERE user_id = ? AND deleted = 0`,
    [userId],
  );

  const now = new Date().toISOString();

  for (const { word } of wordRows) {
    try {
      const entry = await freeDictionary.lookup(word);
      if (!entry) continue;

      for (const sense of entry.senses) {
        const pos = sense.partOfSpeech as PartOfSpeech;

        // Skip if this exact sense_index is already stored
        const existing = await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM saved_words
           WHERE user_id = ? AND word = ? AND sense_index = ? AND deleted = 0`,
          [userId, word, sense.senseIndex],
        );
        if (existing) continue;

        // Only add if the user saved at least one sense of this POS
        const anchor = await db.getFirstAsync<{ card_number: number }>(
          `SELECT card_number FROM saved_words
           WHERE user_id = ? AND word = ? AND part_of_speech = ? AND deleted = 0
           ORDER BY sense_index ASC LIMIT 1`,
          [userId, word, pos],
        );
        if (!anchor) continue;

        await upsertRow('saved_words', {
          id: generateUUID(),
          user_id: userId,
          word: word.toLowerCase(),
          sense_index: sense.senseIndex,
          part_of_speech: pos,
          pronunciation: entry.pronunciation,
          definition: sense.definition,
          example_sentence: sense.exampleSentence || null,
          synonyms: JSON.stringify(sense.synonyms.slice(0, 8)),
          // Reuse the same card number so it groups with the anchor sense
          card_number: anchor.card_number,
          created_at: now,
          updated_at: now,
          local_updated_at: now,
          sync_pending: 1,
          deleted: 0,
        });
      }
    } catch {
      // Skip words where the API fails (network, 404, etc.)
    }
  }

  await setMetaValue(BACKFILL_KEY, '1');
  return true;
}
