import BLOCKLIST_RAW from '../data/blocklist.json';

const BLOCKLIST = new Set<string>(BLOCKLIST_RAW);

export function filterSentence(sentence: string): string | null {
  const words = sentence.toLowerCase().match(/\b[a-z]+\b/g) ?? [];
  for (const word of words) {
    if (BLOCKLIST.has(word)) return null;
  }
  return sentence;
}
