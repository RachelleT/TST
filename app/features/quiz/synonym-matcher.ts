/**
 * Synonym matching for fill-in-sentence questions.
 *
 * Deliberately simple — no full lemmatization, no fuzzy matching.
 * "Hppy" for "happy" = incorrect. "Happily" for "happy" = accepted.
 */

export interface MatchResult {
  matched: boolean;
  matchedAs: 'target' | 'synonym' | null;
  matchedWord: string | null;
}

// Ordered longest-first so we strip the most specific suffix first
const SUFFIXES = ['ness', 'ment', 'tion', 'sion', 'ing', 'est', 'ier', 'ied', 'ed', 'er', 'ly', 'al', 'ic', 's'];

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[.,!?;:'"]+$/, '');
}

function stem(word: string): string {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

/**
 * Match user input against the target word and its synonyms.
 *
 * Order:
 *  1. Exact match (normalized) against target
 *  2. Suffix-stripped match against target
 *  3. Exact match against any synonym
 *  4. Suffix-stripped match against any synonym
 */
export function matchAnswer(
  input: string,
  target: string,
  synonyms: string[],
): MatchResult {
  const normInput = normalize(input);
  const stemInput = stem(normInput);

  // --- Target ---
  const normTarget = normalize(target);
  if (normInput === normTarget || stemInput === stem(normTarget)) {
    return { matched: true, matchedAs: 'target', matchedWord: target };
  }

  // --- Synonyms ---
  for (const syn of synonyms) {
    const normSyn = normalize(syn);
    if (normInput === normSyn || stemInput === stem(normSyn)) {
      return { matched: true, matchedAs: 'synonym', matchedWord: syn };
    }
  }

  return { matched: false, matchedAs: null, matchedWord: null };
}
