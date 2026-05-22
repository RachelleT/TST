import WORD_LIST from '../data/common-words.json';

const WORDS: string[] = WORD_LIST;

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const prev = Array.from({ length: n + 1 }, (_, j) => j);
  const curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev.splice(0, n + 1, ...curr);
  }
  return prev[n];
}

export function getSuggestions(query: string, limit = 5): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const scored: { word: string; dist: number }[] = [];
  for (const word of WORDS) {
    if (Math.abs(word.length - q.length) > 3) continue;
    const dist = levenshtein(q, word);
    if (dist <= 2) scored.push({ word, dist });
  }
  scored.sort((a, b) => a.dist - b.dist || a.word.localeCompare(b.word));
  return scored.slice(0, limit).map((s) => s.word);
}

export function getLocalSuggestions(prefix: string, limit = 5): string[] {
  const q = prefix.toLowerCase().trim();
  if (q.length < 2) return [];
  return WORDS.filter((w) => w.startsWith(q)).slice(0, limit);
}
